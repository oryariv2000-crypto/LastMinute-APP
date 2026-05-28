import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Backend CRUD + RLS tests for the LastMinute data layer (src/lib/db.js).
 *
 * Runs offline against an in-memory fake Supabase client that emulates the
 * RLS rules and the LIVE schema column names:
 *   businesses.user_id = owner   deals.business_id   orders.user_id = customer
 */

const h = vi.hoisted(() => ({ fake: null }))

vi.mock('./supabase', () => ({
  supabase: {
    from: (table) => h.fake.from(table),
    auth: { getUser: () => h.fake.auth.getUser() },
  },
}))

import {
  getMyDeals,
  createDeal,
  updateDeal,
  deleteDeal,
  createOrder,
} from './db'

/* ── In-memory fake Supabase with minimal RLS emulation ─────────────── */
function makeFake(seed) {
  const store = {
    users: structuredClone(seed.users ?? []),
    businesses: structuredClone(seed.businesses ?? []),
    deals: structuredClone(seed.deals ?? []),
    orders: structuredClone(seed.orders ?? []),
  }
  let uid = seed.currentUserId
  let seq = 1000

  const ownsBusiness = (businessId) =>
    store.businesses.some((b) => b.id === businessId && b.user_id === uid)
  const ownsDeal = (dealId) => {
    const deal = store.deals.find((d) => d.id === dealId)
    return deal ? ownsBusiness(deal.business_id) : false
  }

  function from(table) {
    const state = { table, op: 'select', payload: null, filters: [] }
    const builder = {
      select() { return builder },
      insert(row) { state.op = 'insert'; state.payload = row; return builder },
      update(row) { state.op = 'update'; state.payload = row; return builder },
      delete() { state.op = 'delete'; return builder },
      eq(col, val) { state.filters.push([col, val]); return builder },
      order() { return builder },
      single() { return run(state, 'single') },
      maybeSingle() { return run(state, 'maybe') },
      then(resolve, reject) { return run(state, 'many').then(resolve, reject) },
    }
    return builder
  }

  const matches = (row, filters) => filters.every(([c, v]) => row[c] === v)

  async function run(state, mode) {
    const rows = store[state.table]

    if (state.op === 'insert') {
      const row = { id: `id-${seq++}`, created_at: new Date().toISOString(), ...state.payload }
      if (state.table === 'deals' && !ownsBusiness(row.business_id)) {
        return { data: null, error: { message: 'RLS: not your business' } }
      }
      if (state.table === 'orders' && row.user_id !== uid) {
        return { data: null, error: { message: 'RLS: not your order' } }
      }
      if (state.table === 'orders') row.order_code = `LM-${seq}`
      rows.push(row)
      return { data: row, error: null }
    }

    let scoped = rows.filter((r) => matches(r, state.filters))
    if ((state.op === 'update' || state.op === 'delete') && state.table === 'deals') {
      scoped = scoped.filter((r) => ownsDeal(r.id))
    }

    if (state.op === 'update') {
      scoped.forEach((r) => Object.assign(r, state.payload))
      if (mode === 'single' && scoped.length === 0) {
        return { data: null, error: { message: 'No rows (RLS or not found)' } }
      }
      return { data: mode === 'single' ? scoped[0] : scoped, error: null }
    }

    if (state.op === 'delete') {
      store[state.table] = rows.filter((r) => !scoped.includes(r))
      return { data: null, error: null }
    }

    if (mode === 'single') {
      if (scoped.length !== 1) return { data: null, error: { message: 'no single row' } }
      return { data: scoped[0], error: null }
    }
    if (mode === 'maybe') return { data: scoped[0] ?? null, error: null }
    return { data: scoped, error: null }
  }

  return {
    store,
    setUser: (id) => { uid = id },
    from,
    auth: { getUser: async () => ({ data: { user: { id: uid } }, error: null }) },
  }
}

/* ── Seed: two businesses owned by two different users ──────────────── */
function seedTwoBusinesses() {
  return {
    currentUserId: 'user-A',
    users: [
      { id: 'user-A', role: 'business_owner', full_name: 'Owner A' },
      { id: 'user-B', role: 'business_owner', full_name: 'Owner B' },
      { id: 'cust-1', role: 'customer', full_name: 'Customer 1' },
    ],
    businesses: [
      { id: 'biz-A', user_id: 'user-A', name: 'Shop A' },
      { id: 'biz-B', user_id: 'user-B', name: 'Shop B' },
    ],
    deals: [
      { id: 'deal-A1', business_id: 'biz-A', title: 'A deal', original_price: 20, discount_price: 10, quantity_total: 5, quantity_left: 5, status: 'active' },
      { id: 'deal-B1', business_id: 'biz-B', title: 'B deal', original_price: 30, discount_price: 15, quantity_total: 3, quantity_left: 3, status: 'active' },
    ],
    orders: [],
  }
}

beforeEach(() => {
  h.fake = makeFake(seedTwoBusinesses())
})

describe('deals — create', () => {
  it('creating a deal adds it to the DB, scoped to the owner business', async () => {
    const before = h.fake.store.deals.length
    const created = await createDeal({
      title: 'Fresh bagels', original_price: 18, discount_price: 9, quantity: 6, status: 'active',
    })
    expect(created.id).toBeTruthy()
    expect(created.business_id).toBe('biz-A') // derived from the owner, not the client
    expect(created.quantity_total).toBe(6)
    expect(created.quantity_left).toBe(6)
    expect(h.fake.store.deals.length).toBe(before + 1)
  })
})

describe('deals — read', () => {
  it('a business owner reads only their own deals', async () => {
    const mine = await getMyDeals()
    expect(mine.map((d) => d.id)).toEqual(['deal-A1'])
    expect(mine.some((d) => d.business_id === 'biz-B')).toBe(false)
  })
})

describe('deals — update / delete (RLS)', () => {
  it('owner can update their own deal', async () => {
    const updated = await updateDeal('deal-A1', { discount_price: 7 })
    expect(updated.discount_price).toBe(7)
  })

  it('RLS prevents updating another business’s deal', async () => {
    await expect(updateDeal('deal-B1', { discount_price: 1 })).rejects.toBeTruthy()
    expect(h.fake.store.deals.find((d) => d.id === 'deal-B1').discount_price).toBe(15)
  })

  it('deleting another business’s deal removes nothing (RLS)', async () => {
    await deleteDeal('deal-B1')
    expect(h.fake.store.deals.some((d) => d.id === 'deal-B1')).toBe(true)
  })
})

describe('orders — create', () => {
  it('creating an order links it to the customer (user_id) and the correct deal', async () => {
    h.fake.setUser('cust-1')
    const order = await createOrder({ deal_id: 'deal-A1', quantity: 2, total: 20 })
    expect(order.deal_id).toBe('deal-A1')
    expect(order.user_id).toBe('cust-1')
    expect(order.subtotal).toBe(20)
    expect(order.total).toBe(20)
    expect(h.fake.store.orders).toHaveLength(1)
  })
})
