import { createClient } from '@supabase/supabase-js'

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
