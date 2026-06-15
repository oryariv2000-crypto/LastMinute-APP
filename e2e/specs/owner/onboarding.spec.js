import { test, expect } from '@playwright/test'
import { PASSWORD } from '../../fixtures/constants.js'
import { serviceClient } from '../../fixtures/seed.js'
import { loginViaUI } from '../../fixtures/login.js'

/**
 * Owner — onboarding: a plain (business-less) customer opens a business and is
 * promoted to the B2B capability. Proves the seam UI → create_my_business RPC →
 * users.is_business flips → redirect to /b2b/dashboard.
 *
 * Hybrid data: a throwaway owner-candidate is provisioned via the service role
 * (so we never mutate the shared seeded customer, which other specs rely on
 * staying business-less) and fully removed afterward.
 */
test.describe('Owner — onboarding', () => {
  test.skip(!process.env.E2E_SUPABASE_SERVICE_ROLE_KEY, 'requires the E2E service role — set e2e/.env.e2e')

  let admin
  let userId
  const email = `e2e-owner-cand-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@lastminute.test`

  test.beforeAll(async () => {
    admin = serviceClient()
    // Admin API bypasses GoTrue's reserved-domain check, so @lastminute.test is fine.
    const { data } = await admin.auth.admin.createUser({
      email, password: PASSWORD, email_confirm: true,
      user_metadata: { full_name: 'מועמד עסק בדיקה', role: 'customer' },
    })
    userId = data?.user?.id
  })

  test.afterAll(async () => {
    if (userId) {
      await admin.from('businesses').delete().eq('user_id', userId) // remove the created business
      await admin.auth.admin.deleteUser(userId)
    }
  })

  test('a customer opens a business → lands on the B2B dashboard with the capability', async ({ page }) => {
    expect(userId).toBeTruthy()

    // Log in the fresh candidate (a plain customer → /b2c/home).
    const ok = await loginViaUI(page, { email, password: PASSWORD, homeUrl: '/b2c/home' })
    expect(ok).toBe(true)

    // Fill the open-business form and submit.
    await page.goto('/b2c/open-business')
    await page.fill('#ob-business-name', 'עסק אונבורדינג בדיקה')
    await page.locator('#ob-business-type').selectOption('cafe')
    await page.fill('#ob-address', 'רחוב הבדיקה 1, תל אביב')
    await page.fill('#ob-phone', '0501234567')
    await page.click('#ob-submit-btn')

    // create_my_business → business mode → dashboard.
    await expect(page).toHaveURL(/\/b2b\/dashboard/, { timeout: 15_000 })

    // The capability flipped and a business row now exists.
    const { data: profile } = await admin.from('users').select('is_business').eq('id', userId).single()
    expect(profile.is_business).toBe(true)
    const { data: biz } = await admin.from('businesses').select('id, name').eq('user_id', userId).maybeSingle()
    expect(biz?.name).toBe('עסק אונבורדינג בדיקה')
  })
})
