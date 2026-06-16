import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * Backend CRUD + RLS tests for the LastMinute data layer (src/lib/db.js).
 *
 * Runs offline against an in-memory fake Supabase client that emulates the
 * RLS rules and the LIVE schema column names:
 *   businesses.user_id = owner   deals.business_id   orders.user_id = customer
 */

const h = vi.hoisted(() => ({ fake: null }))
const g = vi.hoisted(() => ({ geocode: vi.fn(async () => null) }))

vi.mock('./supabase', () => ({
  supabase: {
    from: (table) => h.fake.from(table),
    rpc: (fn, args) => h.fake.rpc(fn, args),
    auth: { getUser: () => h.fake.auth.getUser() },
  },
}))

// Geocoding is mocked so the data layer can be tested offline; each test sets
// the resolved coordinates (or null) it wants via g.geocode.mockResolvedValueOnce.
vi.mock('./geocode', () => ({ geocodeAddress: (addr) => g.geocode(addr) }))

import {
  getMyDeals,
  createDeal,
  updateDeal,
  deleteDeal,
  createOrder,
  createMyBusiness,
  updateMyBusiness,
  getActiveDealsPage,
  periodRange,
  getMyNotifications,
  markNotificationRead,
  getMyBusinessOrders,
  completeOrderByCode,
} from './db'

/* ── In-memory fake Supabase with minimal RLS emulation ─────────────── */
function makeFake(seed) {
  const store = {
    users: structuredClone(seed.users ?? []),
    businesses: structuredClone(seed.businesses ?? []),
    deals: structuredClone(seed.deals ?? []),
    orders: structuredClone(seed.orders ?? []),
    notifications: structuredClone(seed.notifications ?? []),
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
    if (fn === 'complete_order') {
      const o = store.orders.find((x) => x.id === args.p_order_id)
      if (!o) return { data: null, error: { message: 'order not found' } }
      o.status = 'completed'
      return { data: o, error: null }
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
  g.geocode.mockClear()
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

/* ── Query-builder spy for getActiveDealsPage ────────────────────────── */
function makeQuerySpy() {
  const calls = { not: [], or: [] }
  const builder = {
    select() { return builder },
    eq() { return builder },
    gt() { return builder },
    order() { return builder },
    range() { return builder },
    in() { return builder },
    ilike() { return builder },
    contains() { return builder },
    not(...args) { calls.not.push(args); return builder },
    or(...args) { calls.or.push(args); return builder },
    then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve) },
  }
  return { builder, calls }
}

describe('getActiveDealsPage — excludeTags filter', () => {
  let spy

  beforeEach(() => {
    spy = makeQuerySpy()
    h.fake.from = () => spy.builder
  })

  // deals.tags is NOT NULL DEFAULT '{}', so the null-admit branch (.or with
  // tags.is.null) is unnecessary. The builder .not form passes the array value
  // as a discrete argument — no comma ambiguity for multi-tag exclusion.

  it('single tag: uses builder .not("tags","ov","{nuts}") — not .or()', async () => {
    await getActiveDealsPage({ excludeTags: ['nuts'] })

    // Must use builder .not(), NOT .or() (which has comma-ambiguity for N tags)
    expect(spy.calls.or).toHaveLength(0)
    expect(spy.calls.not).toHaveLength(1)

    // Builder form: .not('tags', 'ov', '{nuts}')
    const [col, op, val] = spy.calls.not[0]
    expect(col).toBe('tags')
    expect(op).toBe('ov')
    expect(val).toBe('{nuts}')
  })

  it('multi-tag: array literal {nuts,dairy} stays intact as one argument — no or-separator split', async () => {
    // This is the critical regression test. With the old .or() string approach,
    // excludeTags.join(',') inside {nuts,dairy} collides with PostgREST's or-
    // separator comma, potentially splitting into two broken conditions.
    // The builder .not() form is safe: it passes the value as a discrete arg.
    await getActiveDealsPage({ excludeTags: ['nuts', 'dairy'] })

    expect(spy.calls.or).toHaveLength(0)   // no .or() used at all
    expect(spy.calls.not).toHaveLength(1)   // exactly one .not() call

    const [col, op, val] = spy.calls.not[0]
    expect(col).toBe('tags')
    expect(op).toBe('ov')
    // The full array literal must arrive as a SINGLE intact value, not split
    expect(val).toBe('{nuts,dairy}')
  })

  it('does not add any tag-exclusion filter when excludeTags is empty', async () => {
    await getActiveDealsPage({ excludeTags: [] })
    expect(spy.calls.not).toHaveLength(0)
    expect(spy.calls.or).toHaveLength(0)
  })
})

/* ── periodRange — Asia/Jerusalem day boundaries ─────────────────────── */
describe('periodRange — Asia/Jerusalem bucketing', () => {
  // All tests use a pinned _now so the suite is deterministic year-round.
  // 2024-01-15T10:00:00Z = 2024-01-15 12:00 Jerusalem (UTC+2 winter).
  const PINNED_NOW = new Date('2024-01-15T10:00:00Z')

  it('7d: `to` lands on an Asia/Jerusalem midnight (00:00:00 local)', () => {
    const { to } = periodRange('7d', PINNED_NOW)
    const toDate = new Date(to)
    // Format the `to` instant in Jerusalem time and assert it is midnight
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(toDate)
    const hv = parts.find((p) => p.type === 'hour')?.value
    const mv = parts.find((p) => p.type === 'minute')?.value
    const sv = parts.find((p) => p.type === 'second')?.value
    // hour12:false may render midnight as '24' on some platforms; normalise.
    expect(Number(hv) % 24).toBe(0)
    expect(mv).toBe('00')
    expect(sv).toBe('00')
  })

  it('7d: `from` is exactly 7 days (604800 s) before `to`', () => {
    const { from, to } = periodRange('7d', PINNED_NOW)
    const diff = (new Date(to) - new Date(from)) / 1000
    expect(diff).toBe(7 * 86_400)
  })

  it('30d: `from` is 30 days before `to` and `to` is Jerusalem midnight', () => {
    const { from, to, days, bucket } = periodRange('30d', PINNED_NOW)
    expect(days).toBe(30)
    expect(bucket).toBe('week')
    const diff = (new Date(to) - new Date(from)) / 1000
    expect(diff).toBe(30 * 86_400)
  })

  it('90d: `from` is 90 days before `to` and bucket is month', () => {
    const { from, to, days, bucket } = periodRange('90d', PINNED_NOW)
    expect(days).toBe(90)
    expect(bucket).toBe('month')
    const diff = (new Date(to) - new Date(from)) / 1000
    expect(diff).toBe(90 * 86_400)
  })

  it('`to` in Asia/Jerusalem is always one day ahead of today in Jerusalem', () => {
    const { to } = periodRange('7d', PINNED_NOW)
    const toDateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date(to))
    const toDate = `${toDateParts.find(p=>p.type==='year').value}-${toDateParts.find(p=>p.type==='month').value}-${toDateParts.find(p=>p.type==='day').value}`
    // "start of tomorrow" in Jerusalem relative to 2024-01-15 = 2024-01-16
    expect(toDate).toBe('2024-01-16')
  })

  it('DST spring-forward eve regression: `to` is 2025-03-28 00:00 Jerusalem (2025-03-27T22:00:00.000Z)', () => {
    // Israel DST 2025: clocks spring forward 2025-03-28 02:00 -> 03:00 (UTC+2 -> UTC+3).
    // On the eve, now = 2025-03-27T12:00:00Z (14:00 Jerusalem, UTC+2).
    // The next-day midnight is 2025-03-28 00:00 Jerusalem — still UTC+2 (transition
    // happens at 02:00, after midnight). So `to` must equal 2025-03-27T22:00:00.000Z.
    // The old iterative code diverged here, landing ~8 days too early.
    const springForwardEve = new Date('2025-03-27T12:00:00Z')
    const { to, from } = periodRange('7d', springForwardEve)

    // `to` must be the exact UTC instant for 2025-03-28 00:00 Jerusalem.
    expect(to).toBe('2025-03-27T22:00:00.000Z')

    // `from` must be exactly 7 × 86400 s earlier.
    expect((new Date(to) - new Date(from)) / 1000).toBe(7 * 86_400)
    expect(from).toBe('2025-03-20T22:00:00.000Z')
  })
})

describe('createMyBusiness', () => {
  let savedRpc

  beforeEach(() => {
    savedRpc = h.fake.rpc.bind(h.fake)
  })

  afterEach(() => {
    h.fake.rpc = savedRpc
  })

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
    h.fake.rpc = async (fn, args) => {
      if (fn === 'create_my_business') return { data: null, error: { message: 'שגיאת שרת' } }
      return savedRpc(fn, args)
    }
    await expect(createMyBusiness({ name: 'Test', address: null, businessType: null, phone: null }))
      .rejects.toThrow('שגיאת שרת')
  })

  it('geocodes the address and persists real coordinates on the new business', async () => {
    g.geocode.mockResolvedValueOnce({ lat: 32.075, lng: 34.775 })
    const biz = await createMyBusiness({
      name: 'הקונדיטוריה של שלומו',
      address: 'דיזנגוף 40, תל אביב',
      businessType: 'bakery',
      phone: null,
    })
    expect(g.geocode).toHaveBeenCalledWith('דיזנגוף 40, תל אביב')
    expect(biz.location_lat).toBe(32.075)
    expect(biz.location_lng).toBe(34.775)
    const stored = h.fake.store.businesses.find((b) => b.id === biz.id)
    expect(stored.location_lat).toBe(32.075)
    expect(stored.location_lng).toBe(34.775)
  })

  it('still creates the business (no coordinates) when geocoding fails', async () => {
    g.geocode.mockResolvedValueOnce(null)
    const biz = await createMyBusiness({ name: 'X', address: 'כתובת לא קיימת', businessType: null, phone: null })
    expect(biz).toBeTruthy()
    expect(biz.location_lat ?? null).toBeNull()
    expect(biz.location_lng ?? null).toBeNull()
  })

  it('does not geocode when no address is given', async () => {
    await createMyBusiness({ name: 'No address', address: null, businessType: null, phone: null })
    expect(g.geocode).not.toHaveBeenCalled()
  })

  it('uses coordinates supplied by the form (autocomplete) without geocoding', async () => {
    const biz = await createMyBusiness({
      name: 'הקונדיטוריה של שלומו',
      address: 'דיזנגוף 40, תל אביב',
      businessType: 'bakery',
      phone: null,
      lat: 32.07,
      lng: 34.77,
    })
    expect(g.geocode).not.toHaveBeenCalled()
    expect(biz.location_lat).toBe(32.07)
    expect(biz.location_lng).toBe(34.77)
    const stored = h.fake.store.businesses.find((b) => b.id === biz.id)
    expect(stored.location_lat).toBe(32.07)
  })
})

describe('updateMyBusiness — geocoding', () => {
  it('re-geocodes and stores new coordinates when the address changes', async () => {
    g.geocode.mockResolvedValueOnce({ lat: 31.25, lng: 34.79 })
    const updated = await updateMyBusiness({ address: 'רחוב חדש 5, באר שבע' })
    expect(g.geocode).toHaveBeenCalledWith('רחוב חדש 5, באר שבע')
    expect(updated.location_lat).toBe(31.25)
    expect(updated.location_lng).toBe(34.79)
  })

  it('does not geocode when the address is unchanged and coordinates exist', async () => {
    const biz = h.fake.store.businesses.find((b) => b.user_id === 'user-A')
    biz.address = 'אותה כתובת'
    biz.location_lat = 32.1; biz.location_lng = 34.8
    await updateMyBusiness({ address: 'אותה כתובת', name: 'Shop A+' })
    expect(g.geocode).not.toHaveBeenCalled()
  })

  it('back-fills coordinates for a legacy business even when the address is unchanged', async () => {
    const biz = h.fake.store.businesses.find((b) => b.user_id === 'user-A')
    biz.address = 'כתובת קיימת'   // legacy row: has an address but no coordinates
    g.geocode.mockResolvedValueOnce({ lat: 32.06, lng: 34.77 })
    const updated = await updateMyBusiness({ address: 'כתובת קיימת' })
    expect(g.geocode).toHaveBeenCalledWith('כתובת קיימת')
    expect(updated.location_lat).toBe(32.06)
    expect(updated.location_lng).toBe(34.77)
  })

  it('clears coordinates when a changed address cannot be geocoded', async () => {
    const biz = h.fake.store.businesses.find((b) => b.user_id === 'user-A')
    biz.address = 'כתובת ישנה'
    biz.location_lat = 32.0; biz.location_lng = 34.0
    g.geocode.mockResolvedValueOnce(null)
    const updated = await updateMyBusiness({ address: 'כתובת חדשה לא ידועה' })
    expect(updated.location_lat).toBeNull()
    expect(updated.location_lng).toBeNull()
  })

  it('trusts explicit coordinates from the form and skips geocoding', async () => {
    const biz = h.fake.store.businesses.find((b) => b.user_id === 'user-A')
    biz.address = 'כתובת ישנה'
    const updated = await updateMyBusiness({
      address: 'דיזנגוף 40, תל אביב',
      location_lat: 32.07,
      location_lng: 34.77,
    })
    expect(g.geocode).not.toHaveBeenCalled()
    expect(updated.location_lat).toBe(32.07)
    expect(updated.location_lng).toBe(34.77)
  })
})

describe('notifications', () => {
  it('returns only the current owner’s notifications', async () => {
    h.fake.store.notifications.push(
      { id: 'n-A', user_id: 'user-A', type: 'new_order', title: 'הזמנה חדשה התקבלה!', body: 'הזמנה LM-1', is_read: false },
      { id: 'n-B', user_id: 'user-B', type: 'new_order', title: 'הזמנה חדשה התקבלה!', body: 'הזמנה LM-2', is_read: false },
    )
    const rows = await getMyNotifications()
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('n-A')
    expect(rows[0].title).toBe('הזמנה חדשה התקבלה!')
  })

  it('returns an empty array when the owner has no notifications', async () => {
    expect(await getMyNotifications()).toEqual([])
  })

  it('marks a notification read and returns the updated row', async () => {
    h.fake.store.notifications.push(
      { id: 'n-A', user_id: 'user-A', type: 'new_order', title: 'הזמנה חדשה התקבלה!', is_read: false },
    )
    const updated = await markNotificationRead('n-A')
    expect(updated.is_read).toBe(true)
    expect(h.fake.store.notifications.find((n) => n.id === 'n-A').is_read).toBe(true)
  })
})

describe('getMyBusinessOrders', () => {
  it('returns only orders for the current owner’s business', async () => {
    h.fake.store.orders.push(
      { id: 'o1', business_id: 'biz-A', user_id: 'cust-1', deal_id: 'deal-A1', status: 'pending', order_code: 'LM-AAAAA' },
      { id: 'o2', business_id: 'biz-B', user_id: 'cust-1', deal_id: 'deal-B1', status: 'pending', order_code: 'LM-BBBBB' },
    )
    const rows = await getMyBusinessOrders()
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('o1')
  })

  it('returns an empty array when the owner has no business', async () => {
    h.fake.setUser('cust-1') // a customer owns no business
    expect(await getMyBusinessOrders()).toEqual([])
  })
})

describe('completeOrderByCode', () => {
  beforeEach(() => {
    h.fake.store.orders.push(
      { id: 'o1', business_id: 'biz-A', user_id: 'cust-1', deal_id: 'deal-A1', status: 'pending', order_code: 'LM-OPEN1' },
      { id: 'o2', business_id: 'biz-A', user_id: 'cust-1', deal_id: 'deal-A1', status: 'completed', order_code: 'LM-DONE1' },
      { id: 'o3', business_id: 'biz-A', user_id: 'cust-1', deal_id: 'deal-A1', status: 'cancelled', order_code: 'LM-CANC1' },
    )
  })

  it('completes a pending order looked up by its code (case/space-insensitive)', async () => {
    const updated = await completeOrderByCode('  lm-open1 ')
    expect(updated.id).toBe('o1')
    expect(updated.status).toBe('completed')
    expect(h.fake.store.orders.find((o) => o.id === 'o1').status).toBe('completed')
  })

  it('rejects an empty code', async () => {
    await expect(completeOrderByCode('   ')).rejects.toThrow('יש להזין קוד הזמנה')
  })

  it('rejects an unknown code', async () => {
    await expect(completeOrderByCode('LM-NOPE0')).rejects.toThrow('לא נמצאה')
  })

  it('rejects an order that was already collected', async () => {
    await expect(completeOrderByCode('LM-DONE1')).rejects.toThrow('כבר נאספה')
  })

  it('rejects a cancelled order', async () => {
    await expect(completeOrderByCode('LM-CANC1')).rejects.toThrow('בוטלה')
  })
})
