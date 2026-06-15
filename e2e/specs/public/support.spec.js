import { test, expect } from '@playwright/test'
import { serviceClient, uniqueEmail } from '../../fixtures/seed.js'

/**
 * Public — a guest (no session) submits a support ticket. This proves the
 * anon-INSERT RLS seam end-to-end: UI form → anon insert → row in the DB.
 *
 * Hybrid data: the ticket is tagged with a unique description, verified via the
 * service role, then deleted in afterAll so the QA database stays clean.
 *
 * /support is a public route, so no storageState — the test runs as a guest.
 */
test.describe('Public — guest support ticket', () => {
  test.skip(
    !process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
    'requires the E2E test project (service role) — set e2e/.env.e2e',
  )

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const description = `בדיקת E2E אוטומטית — ${stamp}`
  const email = uniqueEmail('e2e-support')
  let admin

  test.beforeAll(() => { admin = serviceClient() })

  test.afterAll(async () => {
    await admin.from('support_tickets').delete().eq('description', description)
  })

  test('a guest can submit a ticket → row created via anon INSERT', async ({ page }) => {
    await page.goto('/support')

    // Audience defaults to "customer"; pick a concrete topic so subject is set.
    await page.getByLabel('נושא הפנייה').selectOption('order')
    await page.getByLabel('אימייל').fill(email)
    await page.getByLabel('טלפון').fill('0501234567')
    await page.getByLabel('תיאור הפנייה').fill(description)

    await page.getByRole('button', { name: 'שליחת פנייה' }).click()

    // UI confirms submission…
    await expect(page.getByText(/הפנייה נשלחה/)).toBeVisible()

    // …and the row really landed as a guest ticket (user_id NULL).
    const { data, error } = await admin
      .from('support_tickets')
      .select('id, user_id, subject, contact')
      .eq('description', description)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data[0].user_id).toBeNull()
    expect(data[0].contact).toContain(email)
  })
})
