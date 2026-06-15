import { expect } from '@playwright/test'

/**
 * Hydration-safe UI login (E2E strategy §6.3). A warm Vite-dev page load can let
 * Playwright fill the controlled inputs BEFORE React attaches its onChange
 * handlers; React then resets them to '' on hydration and the form submits blank.
 * We assert the value actually stuck (toHaveValue polls past the reset) before
 * submitting, and retry the whole flow — on a retry the modules are warm and
 * React is already hydrated.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ email: string, password: string, homeUrl: string }} creds
 * @returns {Promise<boolean>} true once redirected to homeUrl.
 */
export async function loginViaUI(page, { email, password, homeUrl }, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await page.goto('/login')
      await page.fill('#login-email', email)
      await page.fill('#login-password', password)
      await expect(page.locator('#login-email')).toHaveValue(email, { timeout: 3_000 })
      await page.click('#auth-submit-btn')
      await page.waitForURL(`**${homeUrl}`, { timeout: 15_000 })
      return true
    } catch {
      /* race or slow redirect — re-navigate and try again */
    }
  }
  return false
}
