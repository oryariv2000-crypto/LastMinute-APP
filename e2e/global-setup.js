import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Playwright global setup for E2E against a DEDICATED Supabase test project.
 *
 * Reads (from e2e/.env.e2e or the environment):
 *   E2E_SUPABASE_URL, E2E_SUPABASE_SERVICE_ROLE_KEY, E2E_SUPABASE_ANON_KEY
 *   (optional) E2E_ADMIN_EMAIL  — must equal ADMIN_EMAILS in src/lib/support.js
 *
 * It (1) ensures three users via the Admin API (service_role), (2) ensures the
 * owner has a business + one active deal to sell, then (3) logs each user in
 * through the UI and saves a storageState file under e2e/.auth/. Authenticated
 * specs load those states.
 *
 * If the service-role env is missing it SKIPS (so the public smoke spec still
 * runs). The service_role key must live ONLY in e2e/.env.e2e (gitignored).
 */
const PASSWORD = 'Passw0rd!23'
const AUTH_DIR = path.join(process.cwd(), 'e2e', '.auth')
const SEED_DEAL_TITLE = 'קרואסון בדיקה'

const USERS = [
  { role: 'customer',       email: 'e2e-customer@lastminute.test', file: 'customer.json', home: '/b2c/home' },
  { role: 'business_owner', email: 'e2e-owner@lastminute.test',    file: 'owner.json',    home: '/b2b/dashboard' },
  // Admin board is gated by email allowlist (support.js / RLS), not by role.
  { role: 'customer',       email: process.env.E2E_ADMIN_EMAIL || 'oryariv2000@gmail.com', file: 'admin.json', home: '/b2c/home' },
]

export default async function globalSetup(config) {
  const url = process.env.E2E_SUPABASE_URL
  const serviceKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.warn('\n[e2e] Skipping auth setup — set E2E_SUPABASE_* in e2e/.env.e2e to enable authenticated specs.\n')
    return
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

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
        const { data: deal } = await admin.from('deals')
          .select('id').eq('business_id', biz.id).eq('title', SEED_DEAL_TITLE).maybeSingle()
        if (!deal) {
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
      await page.goto('/login')
      await page.fill('#login-email', u.email)
      await page.fill('#login-password', PASSWORD)
      await page.click('#auth-submit-btn')
      await page.waitForURL(`**${u.home}`, { timeout: 15_000 }).catch(() => {
        console.warn(`[e2e] login did not redirect for ${u.email} — check the test project schema/seed.`)
      })
      await page.context().storageState({ path: path.join(AUTH_DIR, u.file) })
      await page.close()
    }
  } finally {
    await browser.close()
  }
}
