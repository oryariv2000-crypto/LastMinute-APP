/**
 * db.js — Single place for all Supabase data + storage access.
 *
 * Column names match the LIVE database schema:
 *   users        id, email, role, full_name, phone, avatar_url, created_at
 *   businesses   id, user_id (owner), name, address, opening_hours,
 *                closed_until, is_approved, ...
 *   deals        id, business_id, title, original_price, discount_price,
 *                quantity_total, quantity_left, status, image_url, category_id, ...
 *   orders       id, user_id (customer), deal_id, subtotal, total, status,
 *                order_code, quantity, created_at
 *
 * Ownership chain: auth user → users → businesses(user_id) → deals(business_id) → orders
 * Every function throws on error; row scoping is enforced by RLS.
 */
import { supabase } from './supabase'
import { isBusinessOpen } from './businessHours'
import { geocodeAddress } from './geocode'

/* ── Auth helpers ─────────────────────────────────────────────── */

async function requireUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error('לא מחובר. התחבר מחדש.')
  return data.user
}

/* ── Profiles (public.users) ──────────────────────────────────── */

export async function getMyProfile() {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateMyProfile(fields) {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('users')
    .update(fields)
    .eq('id', user.id)
    .select()
    .single()
  if (error) throw error
  return data
}

/* ── Categories ───────────────────────────────────────────────── */

/** All deal/business categories (for filter chips + the deal form picker). */
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, icon, slug')
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

/* ── Businesses (owner column = user_id) ──────────────────────── */

export async function getMyBusiness() {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error
  return data
}

/** All businesses (for the explore map). Includes coordinates when present. */
export async function getBusinessesForMap() {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, address, location_lat, location_lng')
  if (error) throw error
  return data ?? []
}

/**
 * A single business storefront for the customer-facing profile page. Returns
 * all the fields the B2C page renders (gallery, cover, hours, status source).
 * RLS "businesses: read all" lets any signed-in customer read it.
 */
export async function getBusinessById(id) {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, address, phone, business_type, description, logo_url, cover_url, gallery, opening_hours, closed_until, location_lat, location_lng')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Active deals for one business (its storefront feed). Open/closed is the
 * shop's own state, so we don't re-filter by hours here — the page shows the
 * live status banner and lets the customer browse regardless.
 */
export async function getBusinessDeals(businessId) {
  const { data, error } = await supabase
    .from('deals')
    .select('id, title, original_price, discount_price, image_url, tags, quantity_left, status')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .gt('quantity_left', 0) // hide sold-out deals (stock decremented server-side)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Create (or upsert) the current user's business via the create_my_business RPC.
 * The RPC is idempotent — calling it again updates the existing row.
 * Returns the upserted businesses row.
 */
export async function createMyBusiness({ name, address, businessType, phone, lat = null, lng = null }) {
  const { data, error } = await supabase.rpc('create_my_business', {
    p_name: name?.trim() ?? null,
    p_address: address?.trim() ?? null,
    p_business_type: businessType ?? null,
    p_phone: phone?.replace(/\s/g, '') ?? null,
  })
  // RPC errors carry the human-readable message in .message
  if (error) throw new Error(error.message || 'יצירת העסק נכשלה')

  // Persist real coordinates so the business lands at its true spot on the
  // explore map and can be discovered by distance. Prefer coordinates the form
  // already captured (address autocomplete) and only geocode as a fallback.
  // Best-effort: a miss must never block creation — the pin stays unplaced.
  const addr = address?.trim()
  let coords = lat != null && lng != null ? { lat, lng } : null
  if (!coords && addr) coords = await geocodeAddress(addr).catch(() => null)
  if (coords && data?.id) {
    const { error: locErr } = await supabase
      .from('businesses')
      .update({ location_lat: coords.lat, location_lng: coords.lng })
      .eq('id', data.id)
    if (!locErr) {
      data.location_lat = coords.lat
      data.location_lng = coords.lng
    }
  }
  return data
}

export async function updateMyBusiness(fields) {
  const biz = await getMyBusiness()
  if (!biz) throw new Error('לא נמצא עסק למשתמש זה.')

  // Keep the stored coordinates in sync with the address. Re-geocode only when
  // the address actually changed (geocode.js caches, but this also avoids the
  // 1s rate-limit wait on unrelated profile saves). A changed-but-unresolvable
  // address clears the old coords so we never show a stale location.
  const patch = { ...fields }
  // If the caller already supplied coordinates (address autocomplete), trust
  // them as-is. Otherwise keep coordinates in sync with the address text.
  const hasExplicitCoords = patch.location_lat != null && patch.location_lng != null
  if ('address' in fields && !hasExplicitCoords) {
    const addr = (fields.address ?? '').trim()
    const prev = (biz.address ?? '').trim()
    // Geocode when the address changed, or when it's unchanged but the business
    // still has no coordinates (self-heals legacy rows created before geocoding).
    const missingCoords = biz.location_lat == null || biz.location_lng == null
    if (addr && (addr !== prev || missingCoords)) {
      const coords = await geocodeAddress(addr).catch(() => null)
      patch.location_lat = coords ? coords.lat : null
      patch.location_lng = coords ? coords.lng : null
    } else if (!addr && prev) {
      patch.location_lat = null
      patch.location_lng = null
    }
  }

  const { data, error } = await supabase
    .from('businesses')
    .update(patch)
    .eq('id', biz.id)
    .select()
    .single()
  if (error) throw error
  return data
}

/* ── Deals ────────────────────────────────────────────────────── */

/**
 * One page of active deals for the infinite-scroll feed. Paginates server-side
 * with `.range()` (cursor = row offset) so the client never pulls the whole
 * table. Category + title search are pushed to the server too.
 *
 * Open/closed is per-business and lives in JSONB (opening_hours/closed_until),
 * so it's still computed on the client per page via isBusinessOpen. nextOffset
 * is based on the RAW page length (before that filter) so paging keeps
 * advancing even when some rows are filtered out.
 *
 * A product is categorized by the TYPE OF ITS BUSINESS (bakery/café/…), so the
 * category filter is pushed to the embedded business via an inner join +
 * `businesses.business_type` equality. Tags (dietary/state characteristics) are
 * filtered with array-contains — a deal must carry ALL the selected tags (AND
 * semantics), matching the customer's "vegan AND gluten-free" mental model.
 * excludeTags is the opposite: drop any deal whose tags overlap them (used by
 * the "hide allergens" filter — a deal with even one excluded allergen is out).
 *
 * @returns {{ rows, nextOffset }} nextOffset is undefined on the last page.
 */
export async function getActiveDealsPage({ pageParam = 0, pageSize = 24, businessTypes = [], search = '', tags = [], excludeTags = [] } = {}) {
  let q = supabase
    .from('deals')
    .select('id, title, original_price, discount_price, image_url, tags, quantity_left, business_id, businesses!inner ( name, address, business_type, opening_hours, closed_until, rating )')
    .eq('status', 'active')
    .gt('quantity_left', 0) // hide sold-out deals (stock is decremented by trg_decrement_deal_stock)
    .order('created_at', { ascending: false })
    .range(pageParam, pageParam + pageSize - 1)

  // Multi-select business types — match deals from ANY of the chosen types.
  if (businessTypes?.length) q = q.in('businesses.business_type', businessTypes)
  if (search.trim()) q = q.ilike('title', `%${search.trim()}%`)
  if (tags?.length) q = q.contains('tags', tags)
  if (excludeTags?.length) {
    // deals.tags is NOT NULL DEFAULT '{}', so an empty-tags deal yields
    // NOT('{}' && excluded) = true and is correctly kept. Builder form keeps
    // the array value intact for multi-tag exclusion (no or()-comma ambiguity).
    q = q.not('tags', 'ov', `{${excludeTags.join(',')}}`)
  }

  const { data, error } = await q
  if (error) throw error
  const raw = data ?? []
  return {
    rows: raw.filter((d) => isBusinessOpen(d.businesses)),
    nextOffset: raw.length === pageSize ? pageParam + pageSize : undefined,
  }
}

/** A single deal (product page), with its shop joined. */
export async function getDealById(id) {
  const { data, error } = await supabase
    .from('deals')
    .select('*, businesses ( name, address, phone, rating, business_type, user_id )')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Deals belonging to the current owner's business, newest first. */
export async function getMyDeals() {
  const biz = await getMyBusiness()
  if (!biz) return []
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('business_id', biz.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Insert a deal for the current owner's business. business_id is derived
 * server-side from the owner — never trusted from the client.
 * Accepts friendly fields and maps them to the real columns.
 */
export async function createDeal({
  title,
  original_price,
  discount_price,
  quantity,
  image_url = null,
  category_id = null,
  tags = [],
  status = 'active',
}) {
  const biz = await getMyBusiness()
  if (!biz) throw new Error('יש ליצור עסק לפני פרסום מבצע.')
  const qty = Number(quantity) || 0
  const { data, error } = await supabase
    .from('deals')
    .insert({
      business_id: biz.id,
      title,
      original_price,
      discount_price,
      quantity_total: qty,
      quantity_left: qty,
      image_url,
      category_id,
      tags: Array.isArray(tags) ? tags : [],
      status,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDeal(id, fields) {
  const { data, error } = await supabase
    .from('deals')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteDeal(id) {
  const { error } = await supabase.from('deals').delete().eq('id', id)
  if (error) throw error
}

/**
 * Pause or resume a deal. A paused deal stays in the owner's dashboard but
 * is filtered out of the public B2C feed (which queries status = 'active'),
 * so it stops being offered to customers without being deleted.
 */
export async function setDealStatus(id, status) {
  return updateDeal(id, { status })
}

/* ── Orders (customer column = user_id) ───────────────────────── */

/**
 * Place an order for the current customer. The TOTAL is computed server-side by
 * the place_order() RPC from the deal's real price (never trusted from the
 * client), and stock is decremented + oversell-rejected by the
 * trg_decrement_deal_stock trigger — surfaced here as a thrown error
 * ("המבצע אינו זמין" / "אזל מהמלאי…"). Returns the new order row (with order_code).
 */
export async function createOrder({ deal_id, quantity = 1 }) {
  const { data, error } = await supabase.rpc('place_order', {
    p_deal_id: deal_id,
    p_quantity: quantity,
  })
  // RPC errors carry the human-readable message in .message
  if (error) throw new Error(error.message || 'יצירת ההזמנה נכשלה')
  // place_order returns the new row (or raises). Guard the empty-set case so a
  // missing row surfaces as a clear error instead of an undefined-read crash
  // downstream (the confirmation page reads order.order_code).
  const order = Array.isArray(data) ? data[0] : data
  if (!order) throw new Error('יצירת ההזמנה נכשלה — נסה/י שוב')
  return order
}

/** The current customer's order history, newest first. */
export async function getMyOrders() {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('orders')
    .select('*, deals ( title, image_url, businesses ( name ) )')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Mark an order collected (customer "swipe to confirm" at the counter):
 * pending/active/ready → completed. Enforced server-side by complete_order()
 * (ownership + status), so it works despite RLS. Returns the updated order.
 */
export async function completeOrder(orderId) {
  const { data, error } = await supabase.rpc('complete_order', { p_order_id: orderId })
  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}

/**
 * Cancel an order. cancel_order() allows it only before the pickup window
 * starts and restores the deal's stock; it throws (surfaced here) otherwise.
 */
export async function cancelOrder(orderId) {
  const { data, error } = await supabase.rpc('cancel_order', { p_order_id: orderId })
  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}

// Impact estimate constants — there's no per-deal weight in the schema, so kg
// is approximated from item count and CO2 from kg. Tweak in one place.
const KG_PER_ITEM = 0.5          // avg rescued food weight per item (kg)
const CO2_PER_KG_FOOD = 2.5      // kg CO₂e avoided per kg food saved

/**
 * The current customer's eco/impact totals for the profile dashboard. Orders
 * and money saved are computed exactly from real (non-cancelled) orders; kg of
 * food and CO₂ are estimates derived from item count (see constants above).
 */
export async function getMyImpactStats() {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('orders')
    .select('quantity, status, deals ( original_price, discount_price )')
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
  if (error) throw error
  const rows = data ?? []

  let itemsCount = 0
  let moneySaved = 0
  for (const o of rows) {
    const qty = Number(o.quantity) || 1
    itemsCount += qty
    const orig = Number(o.deals?.original_price) || 0
    const disc = Number(o.deals?.discount_price) || 0
    moneySaved += Math.max(0, orig - disc) * qty
  }
  const savedKg = itemsCount * KG_PER_ITEM
  return {
    ordersCount: rows.length,
    moneySaved: Math.round(moneySaved),
    savedKg: Math.round(savedKg * 10) / 10,
    co2Kg: Math.round(savedKg * CO2_PER_KG_FOOD * 10) / 10,
  }
}

/**
 * All orders for the current owner's business, newest first, with the deal and
 * customer joined for display. RLS ("orders: business read on own deals") scopes
 * this to the owner, so the explicit business_id filter is belt-and-suspenders.
 * Returns every status; the Orders Management page derives the open ones to act
 * on. Returns [] when the user has no business yet.
 */
export async function getMyBusinessOrders() {
  const biz = await getMyBusiness()
  if (!biz) return []
  const { data, error } = await supabase
    .from('orders')
    .select('*, deals ( title, image_url ), users ( full_name )')
    .eq('business_id', biz.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Verify-and-complete an order from the short code the customer presents (typed
 * or scanned from their pickup QR). Normalises the code, surfaces a clear Hebrew
 * error for the not-found / already-collected / cancelled cases, then delegates
 * the actual status flip to complete_order() (which re-checks ownership + status
 * server-side). Returns the completed order row.
 */
export async function completeOrderByCode(code) {
  const trimmed = (code ?? '').trim().toUpperCase()
  if (!trimmed) throw new Error('יש להזין קוד הזמנה')
  const order = await getOrderByCode(trimmed)
  if (!order) throw new Error('לא נמצאה הזמנה עם קוד זה')
  if (order.status === 'completed') throw new Error('ההזמנה כבר נאספה')
  if (order.status === 'cancelled') throw new Error('לא ניתן לאסוף הזמנה שבוטלה')
  return completeOrder(order.id)
}

/** Look up a single order by its human-readable code (RLS scopes access). */
export async function getOrderByCode(code) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, deals ( title, pickup_start, businesses ( name, address, phone ) )')
    .eq('order_code', code)
    .maybeSingle()
  if (error) throw error
  return data
}

/* ── Notifications (recipient column = user_id) ───────────────── */

/**
 * The current user's notifications, newest first. Recipients are scoped by RLS
 * to their own rows, so a business owner only ever sees notifications addressed
 * to them (e.g. "הזמנה חדשה התקבלה!" written by place_order on each new order).
 */
export async function getMyNotifications() {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Mark one notification read (RLS scopes the update to the recipient). */
export async function markNotificationRead(id) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/* ── Saved deals (favorites) ──────────────────────────────────── */

/** The deal ids the current customer has saved (for hydrating heart icons). */
export async function getMySavedDealIds() {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('saved_deals')
    .select('deal_id')
    .eq('user_id', user.id)
  if (error) throw error
  return (data ?? []).map((r) => r.deal_id)
}

/** Whether the current customer has saved this specific deal. */
export async function isDealSaved(dealId) {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('saved_deals')
    .select('deal_id')
    .eq('user_id', user.id)
    .eq('deal_id', dealId)
    .maybeSingle()
  if (error) throw error
  return !!data
}

/**
 * Save or unsave a deal for the current customer. Upserts on (user_id, deal_id)
 * when saving (idempotent) and deletes that pair when unsaving.
 */
export async function setDealSaved(dealId, saved) {
  const user = await requireUser()
  if (saved) {
    const { error } = await supabase
      .from('saved_deals')
      .upsert({ user_id: user.id, deal_id: dealId }, { onConflict: 'user_id,deal_id' })
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('saved_deals')
      .delete()
      .eq('user_id', user.id)
      .eq('deal_id', dealId)
    if (error) throw error
  }
  return saved
}

/* ── Reviews ──────────────────────────────────────────────────── */

/**
 * Reviews for a business, newest first, with the reviewer's name joined.
 * Public read (RLS), so any signed-in user can see them.
 */
export async function getBusinessReviews(businessId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, user_id, users ( full_name, avatar_url )')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Whether the current customer has a real (non-cancelled) order from this
 * business — the precondition for leaving a review (mirrors the RLS guard).
 * Orders are RLS-scoped to the customer, so this only ever sees their own.
 */
export async function hasOrderedFromBusiness(businessId) {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('orders')
    .select('id, deals!inner ( business_id )')
    .eq('user_id', user.id)
    .eq('deals.business_id', businessId)
    .neq('status', 'cancelled')
    .limit(1)
  if (error) throw error
  return (data ?? []).length > 0
}

/**
 * Create or update the current customer's review for a business. The unique
 * (business_id, user_id) constraint means one review per customer per shop, so
 * we upsert on that pair to make "edit my review" the same call as "add".
 */
export async function upsertMyReview({ business_id, rating, comment = null }) {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('reviews')
    .upsert(
      { business_id, user_id: user.id, rating, comment },
      { onConflict: 'business_id,user_id' },
    )
    .select('id, rating, comment, created_at, user_id, users ( full_name, avatar_url )')
    .single()
  if (error) throw error
  return data
}

/** Average rating + count derived from a reviews array (no extra round-trip). */
export function summarizeReviews(reviews = []) {
  if (!reviews.length) return { avg: 0, count: 0 }
  const sum = reviews.reduce((a, r) => a + (r.rating || 0), 0)
  return { avg: sum / reviews.length, count: reviews.length }
}

/* ── Stats (server-side RPC) ──────────────────────────────────── */

/**
 * Resolve a stats period id ('7d' | '30d' | '90d') into a concrete date range
 * (ISO strings) and the bucket granularity the bar chart should use.
 * Range is the last N days up to "now"; `to` is exclusive (start of tomorrow).
 *
 * Day boundaries are computed in Asia/Jerusalem so the buckets always align to
 * Israeli midnight regardless of the browser's local timezone.
 */
export function periodRange(period = '7d', _now = new Date()) {
  const days = period === '90d' ? 90 : period === '30d' ? 30 : 7
  const bucket = period === '90d' ? 'month' : period === '30d' ? 'week' : 'day'

  // Derive the current calendar date in Asia/Jerusalem (YYYY-MM-DD).
  const jerusalemDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
  }).format(_now)

  // Build the exclusive upper bound — start of *tomorrow* in Jerusalem time.
  // Constructing "YYYY-MM-DDT00:00:00" in the TZ offset for that date handles
  // DST automatically via Temporal-style parsing through the offset calculator.
  const [year, month, day] = jerusalemDate.split('-').map(Number)

  // Midnight tonight Jerusalem = start of the NEXT calendar day there.
  // We compute it by finding the UTC instant that corresponds to
  // "tomorrow 00:00:00 Asia/Jerusalem".
  const toJerusalem = jerusalemMidnight(year, month, day + 1)
  const fromJerusalem = new Date(toJerusalem.getTime() - days * 86_400_000)

  return {
    from: fromJerusalem.toISOString(),
    to: toJerusalem.toISOString(),
    bucket,
    days,
  }
}

/**
 * Return the UTC Date corresponding to midnight of a given calendar date in
 * Asia/Jerusalem. Asia/Jerusalem is always UTC+2 (winter/standard) or UTC+3
 * (DST/summer) — no fractional offsets. We try exactly those two candidate UTC
 * instants and return whichever one formatToParts confirms reads 00:00:00 in
 * Jerusalem. Terminates unconditionally and is correct across both DST
 * transitions (spring-forward and fall-back).
 * @param {number} year  @param {number} month (1-based)  @param {number} day
 * @returns {Date}
 */
function jerusalemMidnight(year, month, day) {
  // Normalise overflow (e.g. day 32 → next month) via UTC Date constructor.
  const ref = new Date(Date.UTC(year, month - 1, day))
  const y = ref.getUTCFullYear(), m = ref.getUTCMonth() + 1, d = ref.getUTCDate()
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  for (const offsetH of [2, 3]) {
    const candidate = new Date(Date.UTC(y, m - 1, d) - offsetH * 3_600_000)
    const parts = fmt.formatToParts(candidate)
    const get = (t) => Number(parts.find((p) => p.type === t)?.value ?? NaN)
    // hour12:false can render midnight as '24' in some environments; treat both as 0.
    if (get('year') === y && get('month') === m && get('day') === d &&
        (get('hour') % 24) === 0 && get('minute') === 0 && get('second') === 0) {
      return candidate
    }
  }
  // Fallback — should be unreachable for Asia/Jerusalem (always UTC+2 or +3).
  return new Date(Date.UTC(y, m - 1, d) - 2 * 3_600_000)
}

async function resolveBusinessId(businessId) {
  if (businessId) return businessId
  const biz = await getMyBusiness()
  return biz?.id ?? null
}

/**
 * Headline KPIs for a business over a period, computed server-side by
 * get_business_stats(). Pass {from,to} ISO strings (see periodRange); omit
 * for all-time. active_deals_count is always the current snapshot.
 */
export async function fetchBusinessStats({ businessId, from = null, to = null } = {}) {
  const id = await resolveBusinessId(businessId)
  if (!id) return { total_revenue: 0, total_orders: 0, active_deals_count: 0 }

  const { data, error } = await supabase.rpc('get_business_stats', {
    p_business_id: id,
    p_from: from,
    p_to: to,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return {
    total_revenue: Number(row?.total_revenue ?? 0),
    total_orders: Number(row?.total_orders ?? 0),
    active_deals_count: Number(row?.active_deals_count ?? 0),
  }
}

/**
 * Revenue time series (bucketed day/week/month) for the bar chart. Returns
 * rows already filled for empty buckets: [{ start: Date, revenue: number }].
 */
export async function fetchSalesTimeseries({ businessId, from, to, bucket = 'day' } = {}) {
  const id = await resolveBusinessId(businessId)
  if (!id) return []

  const { data, error } = await supabase.rpc('get_business_sales_timeseries', {
    p_business_id: id,
    p_from: from,
    p_to: to,
    p_bucket: bucket,
  })
  if (error) throw error
  return (data ?? []).map((r) => ({
    start: new Date(r.bucket_start),
    revenue: Number(r.revenue ?? 0),
  }))
}

/**
 * Top-selling products (by deal title) for the donut. Products are no longer
 * categorized per-deal, so the breakdown is by best sellers instead.
 * Returns [{ product: string, revenue: number }] sorted desc (server-limited).
 */
export async function fetchTopProducts({ businessId, from = null, to = null } = {}) {
  const id = await resolveBusinessId(businessId)
  if (!id) return []

  const { data, error } = await supabase.rpc('get_business_top_products', {
    p_business_id: id,
    p_from: from,
    p_to: to,
  })
  if (error) throw error
  return (data ?? []).map((r) => ({
    product: r.product,
    revenue: Number(r.revenue ?? 0),
  }))
}

/* ── Storage ──────────────────────────────────────────────────── */

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB

function assertImage(file) {
  if (!file) throw new Error('לא נבחר קובץ.')
  if (!file.type.startsWith('image/')) throw new Error('יש לבחור קובץ תמונה.')
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('הקובץ גדול מדי (מקסימום 5MB).')
}

function fileExt(file) {
  const parts = file.name.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : 'jpg'
}

/** Upload an avatar to the `avatars` bucket and write the URL to the profile. */
export async function uploadAvatar(file) {
  assertImage(file)
  const user = await requireUser()
  const path = `${user.id}/avatar.${fileExt(file)}`
  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (upErr) throw upErr
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`
  await updateMyProfile({ avatar_url: publicUrl })
  return publicUrl
}

/** Upload a deal image to the `deal-images` bucket; returns its public URL. */
export async function uploadDealImage(file) {
  assertImage(file)
  const user = await requireUser()
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt(file)}`
  const { error: upErr } = await supabase.storage
    .from('deal-images')
    .upload(path, file, { cacheControl: '3600' })
  if (upErr) throw upErr
  const { data } = supabase.storage.from('deal-images').getPublicUrl(path)
  return data.publicUrl
}

/* ── Support tickets ──────────────────────────────────────────── */

/**
 * Submit a support ticket straight to the `support_tickets` table (lean MVP —
 * no Edge Function / email / Turnstile). Works for guests AND signed-in users:
 *   - signed in  → user_id is set, and we return the new row (for "my tickets")
 *   - guest      → user_id is NULL; RLS lets anon INSERT but not SELECT, so we
 *                  don't request the row back (return null).
 * RLS: see supabase/support_tickets_anon.sql (anon INSERT only; no read/write).
 */
export async function submitSupportTicket({
  role = null, category = 'question', priority = 'normal',
  subject, description, contact = null,
}) {
  const { data: { session } } = await supabase.auth.getSession()
  const user_id = session?.user?.id ?? null
  const row = { user_id, role, category, priority, subject, description, contact }

  if (user_id) {
    const { data, error } = await supabase
      .from('support_tickets').insert(row).select().single()
    if (error) throw error
    return data
  }
  const { error } = await supabase.from('support_tickets').insert(row)
  if (error) throw error
  return null
}

/** The current user's own tickets, newest first. */
export async function getMySupportTickets() {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** All tickets (support team only — RLS enforces the admin email). */
export async function getAllSupportTickets() {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Triage a ticket: update status / category / priority (admin only). */
export async function updateSupportTicket(id, fields) {
  const { data, error } = await supabase
    .from('support_tickets')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/* ── Small shared helpers ─────────────────────────────────────── */

/** Discount percentage from original/discounted price. */
export function discountPct(original, discounted) {
  if (!original || original <= discounted) return 0
  return Math.round(((original - discounted) / original) * 100)
}
