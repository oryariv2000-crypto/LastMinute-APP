import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Dual-role E2E journeys: mode toggle (B2C ⇄ B2B), the prevent-self-dealing
 * guard, and the "open a business" CTA for plain customers.
 *
 * Each block uses a storageState saved by global-setup and SKIPS automatically
 * when that file is absent (i.e. no E2E test project configured).
 *
 * ── PREREQUISITE ───────────────────────────────────────────────────────────
 * These specs require the dedicated E2E Supabase test project to have the
 * dual-role schema applied: run `supabase/consolidated_update.sql` against it
 * (adds users.is_business + the businesses AFTER-INSERT trigger that flags the
 * seeded owner as is_business=true, plus the place_order self-dealing guard).
 * Without that migration the owner won't be is_business and these will fail.
 * global-setup seeds the owner with a business + one active deal "קרואסון בדיקה".
 */
const authFile = (f) => path.join('e2e', '.auth', f)
const has = (f) => fs.existsSync(authFile(f))

/* ── Mode toggle: business-capable user switches B2C ⇄ B2B shells ─────────── */
test.describe('Dual-role — mode toggle (owner)', () => {
  test.skip(!has('owner.json'), 'requires E2E test project (run global-setup)')
  test.use({ storageState: has('owner.json') ? authFile('owner.json') : undefined })

  test('owner toggles from shopping to business mode and back', async ({ page }) => {
    // Start in the customer shell — a business-capable user sees the switch.
    await page.goto('/b2c/home')
    const toBusiness = page.getByRole('button', { name: /עבור למצב עסק/ })
    await expect(toBusiness).toBeVisible()

    // Switch to the business shell.
    await toBusiness.click()
    await expect(page).toHaveURL(/\/b2b\/dashboard/)

    // Switch back to the shopping shell from the B2B navbar.
    const toShopping = page.getByRole('button', { name: /עבור למצב קנייה/ })
    await expect(toShopping).toBeVisible()
    await toShopping.click()
    await expect(page).toHaveURL(/\/b2c\/home/)
  })
})

/* ── Prevent self-dealing: owner cannot buy their own deal ────────────────── */
test.describe('Dual-role — prevent self-dealing (owner)', () => {
  test.skip(!has('owner.json'), 'requires E2E test project (run global-setup)')
  test.use({ storageState: has('owner.json') ? authFile('owner.json') : undefined })

  test('owner viewing their own deal sees the notice, not add-to-cart', async ({ page }) => {
    await page.goto('/b2c/home')
    // The owner's own seeded deal appears in the customer feed.
    await page.getByRole('link', { name: /קרואסון בדיקה/ }).first().click()
    await expect(page).toHaveURL(/\/b2c\/product\//)

    // Self-dealing UI guard: informational notice instead of the buy control.
    await expect(page.getByText(/זהו מבצע של העסק שלך/)).toBeVisible()
    await expect(page.getByRole('button', { name: /הוסף לסל/ })).toHaveCount(0)
  })
})

/* ── Plain customer sees the "open a business" CTA, not the toggle ────────── */
test.describe('Dual-role — customer open-business CTA', () => {
  test.skip(!has('customer.json'), 'requires E2E test project (run global-setup)')
  test.use({ storageState: has('customer.json') ? authFile('customer.json') : undefined })

  test('a non-business customer is offered to open a business', async ({ page }) => {
    await page.goto('/b2c/home')
    // Capability CTA is present…
    await expect(page.getByRole('link', { name: /פתיחת עסק/ })).toBeVisible()
    // …and the mode-switch button is NOT (no business capability yet).
    await expect(page.getByRole('button', { name: /עבור למצב עסק/ })).toHaveCount(0)
  })
})
