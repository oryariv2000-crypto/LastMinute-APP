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
    rpc: (fn, args) => h.fake.rpc(fn, args),
    auth: { getUser: () => h.fake.auth.getUser() },
  },
}))

import {
  getMyDeals,
  createDeal,
  updateDeal,
  deleteDeal,
  createOrder,
  createMyBusiness,
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

  // Minimal RPC emulation (server-side functions).
  async function rpc(fn, args = {}) {
    if (fn === 'create_my_business') {
      const existing = store.businesses.find((b) => b.user_id === uid)
      const row = existing
        ? Object.assign(existing, { name: args.p_name, address: args.p_address, business_type: args.p_business_type, phone: args.p_phone })
        : { id: `biz-${seq++}`, user_id: uid, name: args.p_name, address: args.p_address, business_type: args.p_business_type, phone: args.p_phone, created_at: new Date().toISOString() }
      if (!existing) store.businesses.push(row)
      return { data: row, error: null }
    }
    if (fn === 'place_order') {
      const deal = store.deals.find((d) => d.id === args.p_deal_id)
      if (!deal || deal.status !== 'active') {
        return { data: null, error: { message: 'deal not available' } }
      }
      const qty = Math.max(1, args.p_quantity ?? 1)
      if ((deal.quantity_left ?? 0) < qty) {
        return { data: null, error: { message: 'אזל מהמלאי' } }
      }
      const amount = deal.discount_price * qty // server-computed, not client-sent
      deal.quantity_left -= qty
      const row = {
        id: `id-${seq++}`, user_id: uid, deal_id: deal.id, quantity: qty,
        subtotal: amount, total: amount, status: 'pending',
        order_code: `LM-${seq}`, created_at: new Date().toISOString(),
      }
      store.orders.push(row)
      return { data: row, error: null }
    }
    return { data: null, error: { message: `unknown rpc: ${fn}` } }
  }

  return {
    store,
    setUser: (id) => { uid = id },
    from,
    rpc,
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
    expect(created.tags).toEqual([]) // defaults to empty when none picked
    expect(h.fake.store.deals.length).toBe(before + 1)
  })

  it('persists the chosen characteristic tags on the deal', async () => {
    const created = await createDeal({
      title: 'Vegan loaf', original_price: 20, discount_price: 12, quantity: 3,
      tags: ['vegan', 'baked_today'],
    })
    expect(created.tags).toEqual(['vegan', 'baked_today'])
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
  it('placing an order links it to the customer + deal and prices it server-side', async () => {
    h.fake.setUser('cust-1')
    // Note: no `total` passed — the server computes it from the deal price
    // (deal-A1 discount_price 10 × qty 2 = 20), so the client can't tamper.
    const order = await createOrder({ deal_id: 'deal-A1', quantity: 2 })
    expect(order.deal_id).toBe('deal-A1')
    expect(order.user_id).toBe('cust-1')
    expect(order.subtotal).toBe(20)
    expect(order.total).toBe(20)
    expect(h.fake.store.orders).toHaveLength(1)
  })

  it('surfaces the RPC error message (e.g. self-dealing Hebrew string) when place_order fails', async () => {
    h.fake.setUser('user-A')
    // Simulate user-A trying to buy their own deal — RPC returns Hebrew error
    const selfDealingMsg = 'לא ניתן לרכוש מבצע של העסק שלך'
    const origRpc = h.fake.rpc.bind(h.fake)
    h.fake.rpc = async (fn, args) => {
      if (fn === 'place_order') return { data: null, error: { message: selfDealingMsg } }
      return origRpc(fn, args)
    }
    await expect(createOrder({ deal_id: 'deal-A1', quantity: 1 }))
      .rejects.toThrow(selfDealingMsg)
  })
})

describe('createMyBusiness', () => {
  it('calls create_my_business RPC with trimmed name, stripped phone, and returns data', async () => {
    const biz = await createMyBusiness({
      name: '  מאפייה טובה  ',
      address: 'רחוב הרצל 1',
      businessType: 'bakery',
      phone: '050 123 4567',
    })
    expect(biz).toBeTruthy()
    expect(biz.name).toBe('מאפייה טובה') // trimmed
    expect(biz.phone).toBe('0501234567')  // whitespace stripped
    expect(biz.business_type).toBe('bakery')
    expect(biz.address).toBe('רחוב הרצל 1')
  })

  it('throws with the RPC error message when create_my_business fails', async () => {
    const origRpc = h.fake.rpc.bind(h.fake)
    h.fake.rpc = async (fn, args) => {
      if (fn === 'create_my_business') return { data: null, error: { message: 'שגיאת שרת' } }
      return origRpc(fn, args)
    }
    await expect(createMyBusiness({ name: 'Test', address: null, businessType: null, phone: null }))
      .rejects.toThrow('שגיאת שרת')
  })
})
