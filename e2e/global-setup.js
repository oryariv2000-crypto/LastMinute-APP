import { chromium } from '@playwright/test'
import fs from 'node:fs'
import { PASSWORD, SEED_DEAL_TITLE, EMAILS, AUTH_DIR, authFile } from './fixtures/constants.js'
import { serviceClient } from './fixtures/seed.js'
import { loginViaUI } from './fixtures/login.js'

/**
 * Playwright global setup for E2E against a DEDICATED Supabase test project.
 *
 * Reads (from e2e/.env.e2e or the environment):
 *   E2E_SUPABASE_URL, E2E_SUPABASE_SERVICE_ROLE_KEY, E2E_SUPABASE_ANON_KEY
 *   (optional) E2E_ADMIN_EMAIL  — which seeded user is promoted to role 'admin'
 *
 * It (1) ensures three baseline users via the Admin API (service_role), (2) ensures
 * the owner has a business + one active deal to sell, then (3) logs each user in
 * through the UI and saves a storageState file under e2e/.auth/. Authenticated
 * specs load those states. Mutating specs seed their OWN data via fixtures/seed.js
 * (Hybrid strategy) so they never contend over this read-only baseline.
 *
 * If the service-role env is missing it SKIPS (so the public smoke spec still
 * runs). The service_role key must live ONLY in e2e/.env.e2e (gitignored).
 */
const USERS = [
  { role: 'customer',       email: EMAILS.customer, file: 'customer.json', home: '/b2c/home' },
  { role: 'business_owner', email: EMAILS.owner,    file: 'owner.json',    home: '/b2b/dashboard' },
  // Admin board is gated by users.role = 'admin' (support.js / RLS). This seeded
  // user signs up as a customer, then we promote it to admin below (makeAdmin).
  { role: 'customer', makeAdmin: true, email: EMAILS.admin, file: 'admin.json', home: '/b2c/home' },
]

export default async function globalSetup(config) {
  if (!process.env.E2E_SUPABASE_URL || !process.env.E2E_SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('\n[e2e] Skipping auth setup — set E2E_SUPABASE_* in e2e/.env.e2e to enable authenticated specs.\n')
    return
  }

  const admin = serviceClient()

  for (const u of USERS) {
    const fullName = u.role === 'business_owner' ? 'בעל עסק בדיקה' : 'לקוח בדיקה'
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email, password: PASSWORD, email_confirm: true,
      user_metadata: { full_name: fullName, role: u.role },
    })
    if (error && !/registered|exists/i.test(error.message)) {
      console.warn(`[e2e] createUser(${u.email}):`, error.message)
    }
    let userId = data?.user?.id
    if (!userId) {
      const { data: prof } = await admin.from('users').select('id').eq('email', u.email).maybeSingle()
      userId = prof?.id
    }

    // Promote the seeded admin so the role-based RLS + admin board recognize it
    // (idempotent — safe to re-run against an existing test project).
    if (u.makeAdmin && userId) {
      await admin.from('users').update({ role: 'admin' }).eq('id', userId)
    }

    // Owner needs a business + one active deal so the customer feed has stock.
    if (u.role === 'business_owner' && userId) {
      let { data: biz } = await admin.from('businesses').select('id').eq('user_id', userId).maybeSingle()
      if (!biz) {
        const ins = await admin.from('businesses')
          .insert({ user_id: userId, name: 'עסק בדיקה', address: 'תל אביב', business_type: 'cafe' })
          .select('id').single()
        biz = ins.data
      }
      if (biz) {
        // Reset the baseline deal to full stock + active each run so read-only
        // specs (the purchase journey decrements it) stay green across reruns.
        const { data: deal } = await admin.from('deals')
          .select('id').eq('business_id', biz.id).eq('title', SEED_DEAL_TITLE).maybeSingle()
        if (deal) {
          await admin.from('deals')
            .update({ quantity_total: 10, quantity_left: 10, status: 'active' })
            .eq('id', deal.id)
        } else {
          await admin.from('deals').insert({
            business_id: biz.id, title: SEED_DEAL_TITLE, original_price: 20, discount_price: 10,
            quantity_total: 10, quantity_left: 10, status: 'active', tags: [],
          })
        }
      }
    }
  }

  // Log each user in through the UI and persist their storage state.
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:5173'
  const browser = await chromium.launch()
  try {
    for (const u of USERS) {
      const page = await browser.newPage({ baseURL })
      const ok = await loginViaUI(page, { email: u.email, password: PASSWORD, homeUrl: u.home })
      if (!ok) console.warn(`[e2e] login failed for ${u.email} after retries — check the test project schema/seed.`)
      await page.context().storageState({ path: authFile(u.file) })
      await page.close()
    }
  } finally {
    await browser.close()
  }
}
