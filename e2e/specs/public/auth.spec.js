import { test, expect } from '@playwright/test'
import { PASSWORD } from '../../fixtures/constants.js'
import { serviceClient, uniqueEmail, deleteUserByEmail } from '../../fixtures/seed.js'
import { loginViaUI } from '../../fixtures/login.js'

/**
 * Public / Auth — new B2C signup and logout.
 *
 * Hybrid data: this spec creates its OWN throwaway account (unique email per run)
 * and deletes it via the service role in afterAll, so the QA database stays clean.
 *
 * PREREQUISITE: the QA project must have "Confirm email" OFF (a test project
 * default) so signUp returns a session and lands on /b2c/home. With it ON, the
 * page shows a "check your email" notice instead and this spec can't complete.
 *
 * Serial: the logout test reuses the account the register test creates (one
 * signup, no second email), so register must run first.
 */
test.describe.serial('Public — register + logout', () => {
  test.skip(
    !process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
    'requires the E2E test project (service role) — set e2e/.env.e2e',
  )

  let admin
  let email

  test.beforeAll(() => {
    admin = serviceClient()
    email = uniqueEmail()
  })

  test.afterAll(async () => {
    await deleteUserByEmail(admin, email)
  })

  test('register a new B2C account → lands on /b2c/home', async ({ page }) => {
    await page.goto('/register/b2c')

    // Step 1 → 2 is React-driven; retry the "המשך" click until the form renders.
    // Reaching step 2 proves React has hydrated, so the field fills below stick.
    const firstName = page.locator('#b2c-first-name')
    await expect(async () => {
      await page.locator('#b2c-role-next-btn').click()
      await expect(firstName).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 15_000 })

    await firstName.fill('בדיקה')
    await page.fill('#b2c-last-name', 'אוטומטית')
    await page.fill('#b2c-email', email)
    await page.fill('#b2c-password', PASSWORD)
    await page.fill('#b2c-confirm-password', PASSWORD)
    // Light insurance that the controlled email value stuck before submit.
    await expect(page.locator('#b2c-email')).toHaveValue(email)

    await page.click('#b2c-register-submit')

    // Confirmation OFF → signUp returns a session → app navigates to the feed.
    await expect(page).toHaveURL(/\/b2c\/home/, { timeout: 15_000 })
  })

  test('logout clears the session → a protected route bounces to /login', async ({ page }) => {
    const ok = await loginViaUI(page, { email, password: PASSWORD, homeUrl: '/b2c/home' })
    expect(ok).toBe(true)

    // Sign out from the B2C navbar — the handler signs out and navigates to '/'.
    await page.click('#b2c-nav-logout')
    await expect(page).toHaveURL(/\/$|\/login/, { timeout: 10_000 })

    // Session is gone: visiting a protected route bounces to login.
    await page.goto('/b2c/home')
    await expect(page).toHaveURL(/\/login/)
  })
})
