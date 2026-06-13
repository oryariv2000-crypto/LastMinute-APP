import { test, expect } from '@playwright/test'

/**
 * Public smoke — runs with just the dev server (no test project needed).
 * Verifies the app boots and the auth entry points render.
 */
test('landing page loads with the brand', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Last Minute').first()).toBeVisible()
})

test('login page renders its form', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('#login-email')).toBeVisible()
  await expect(page.getByRole('button', { name: 'כניסה' })).toBeVisible()
})

test('unknown route redirects to login', async ({ page }) => {
  await page.goto('/does-not-exist')
  await expect(page).toHaveURL(/\/login$/)
})
