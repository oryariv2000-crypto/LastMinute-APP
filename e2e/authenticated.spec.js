import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Authenticated journeys. Each block uses the storageState saved by
 * global-setup and is skipped automatically when that file is absent (i.e. when
 * no E2E test project is configured). Seeded by global-setup: an owner business
 * with one active deal titled "קרואסון בדיקה".
 */
const authFile = (f) => path.join('e2e', '.auth', f)
const has = (f) => fs.existsSync(authFile(f))

/* ── B2C: full purchase + Click & Collect ───────────────────────── */
test.describe('B2C — purchase journey', () => {
  test.skip(!has('customer.json'), 'requires E2E test project (run global-setup)')
  test.use({ storageState: has('customer.json') ? authFile('customer.json') : undefined })

  test('browse → product → checkout → confirmation → swipe to collect', async ({ page }) => {
    await page.goto('/b2c/home')
    await page.getByRole('link', { name: /קרואסון בדיקה/ }).first().click()

    await expect(page).toHaveURL(/\/b2c\/product\//)
    await page.getByRole('button', { name: /הוסף לסל/ }).first().click()

    // Checkout — payment is blocked until the self-pickup box is checked.
    await expect(page).toHaveURL(/\/b2c\/checkout/)
    const pay = page.getByRole('button', { name: /שלם ובוא לאסוף/ })
    await expect(pay).toBeDisabled()
    await page.getByRole('checkbox').check()
    await pay.click()

    // Confirmation + QR, then swipe-to-collect marks it picked up.
    await expect(page).toHaveURL(/\/b2c\/confirmation/)
    await expect(page.getByText('ההזמנה אושרה!')).toBeVisible()
    await page.getByRole('button', { name: 'החלק לאישור איסוף' }).press('Enter')
    await expect(page.getByText(/ההזמנה נאספה/)).toBeVisible()
  })
})

/* ── B2B: dashboard shows the owner's active deal ────────────────── */
test.describe('B2B — owner dashboard', () => {
  test.skip(!has('owner.json'), 'requires E2E test project (run global-setup)')
  test.use({ storageState: has('owner.json') ? authFile('owner.json') : undefined })

  test('the seeded active deal is listed', async ({ page }) => {
    await page.goto('/b2b/dashboard')
    await expect(page.getByText(/קרואסון בדיקה/)).toBeVisible()
  })
})

/* ── Admin: support triage board is reachable ────────────────────── */
test.describe('Admin — support board', () => {
  test.skip(!has('admin.json'), 'requires E2E test project (run global-setup)')
  test.use({ storageState: has('admin.json') ? authFile('admin.json') : undefined })

  test('admin can open the support triage board', async ({ page }) => {
    await page.goto('/admin/support')
    await expect(page).toHaveURL(/\/admin\/support/)
  })
})
