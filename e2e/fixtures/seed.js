import { createClient } from '@supabase/supabase-js'
import { EMAILS } from './constants.js'

/**
 * Service-role helpers for the Hybrid test-data strategy: specs that MUTATE state
 * create + clean their own rows here, keeping the QA database tidy and specs
 * isolated. RLS-bypassing — never expose the service_role key to the browser.
 */

/** A service-role client for the QA project (seeding / cleanup only). */
export function serviceClient() {
  const url = process.env.E2E_SUPABASE_URL
  const key = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('seed.js: E2E_SUPABASE_URL / E2E_SUPABASE_SERVICE_ROLE_KEY are not set')
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

/**
 * A unique throwaway email per run so signup specs never collide / leave dupes.
 * Uses a NON-reserved domain: GoTrue's UI-signup validator rejects reserved
 * names (`.test`, `example.com`, …), unlike the Admin API used in global-setup.
 * With email confirmation OFF on the QA project nothing is actually sent.
 */
export function uniqueEmail(prefix = 'e2e-signup') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@lastminute-e2e.com`
}

/**
 * Delete an auth user by email (cascades its public.users row) — cleanup for
 * specs that register throwaway accounts. No-op if the user isn't found.
 */
export async function deleteUserByEmail(admin, email) {
  const target = email.toLowerCase()
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data?.users?.length) return
    const found = data.users.find((u) => u.email?.toLowerCase() === target)
    if (found) {
      await admin.auth.admin.deleteUser(found.id)
      return
    }
    if (data.users.length < 200) return // last page reached
  }
}

/* ── Deals (for stock-mutating customer specs) ──────────────────────────────── */

/** A user's id by email (e.g. to scope review cleanup to the test customer). */
export async function userIdByEmail(admin, email) {
  const { data } = await admin.from('users').select('id').eq('email', email).maybeSingle()
  return data?.id ?? null
}

/** The seeded owner's business id (global-setup provisions it). */
export async function ownerBusinessId(admin) {
  const { data: owner } = await admin.from('users').select('id').eq('email', EMAILS.owner).maybeSingle()
  if (!owner) throw new Error('seed.js: owner user not found — run global-setup')
  const { data: biz } = await admin.from('businesses').select('id').eq('user_id', owner.id).maybeSingle()
  if (!biz) throw new Error('seed.js: owner business not found — run global-setup')
  return biz.id
}

/**
 * Create an active deal on a business. pickupStart=null → always cancellable.
 * Returns { id, quantity_left }.
 */
export async function createDeal(admin, { businessId, title, quantity = 5, pickupStart = null }) {
  const { data, error } = await admin.from('deals').insert({
    business_id: businessId, title,
    original_price: 20, discount_price: 10,
    quantity_total: quantity, quantity_left: quantity,
    status: 'active', tags: [], pickup_start: pickupStart,
  }).select('id, quantity_left').single()
  if (error) throw error
  return data
}

/** Delete a deal and any orders that reference it (FK-safe cleanup). */
export async function deleteDeal(admin, dealId) {
  await admin.from('orders').delete().eq('deal_id', dealId)
  await admin.from('deals').delete().eq('id', dealId)
}

/** Current live stock for a deal (for restore/oversell assertions). */
export async function dealStock(admin, dealId) {
  const { data } = await admin.from('deals').select('quantity_left').eq('id', dealId).single()
  return data?.quantity_left
}

/** Force a deal's stock (simulate it selling out mid-checkout). */
export async function setDealStock(admin, dealId, quantityLeft) {
  await admin.from('deals').update({ quantity_left: quantityLeft }).eq('id', dealId)
}
