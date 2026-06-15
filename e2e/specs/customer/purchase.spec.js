import { test, expect } from '@playwright/test'
import { authFile, hasAuth, SEED_DEAL_TITLE } from '../../fixtures/constants.js'

/**
 * B2C — full purchase + Click & Collect, the core revenue loop (place_order +
 * stock trigger + complete_order). Uses the customer storageState + the baseline
 * deal global-setup reseeds to full stock each run.
 */
const DEAL = new RegExp(SEED_DEAL_TITLE)

test.describe('B2C — purchase journey', () => {
  test.skip(!hasAuth('customer.json'), 'requires E2E test project (run global-setup)')
  test.use({ storageState: hasAuth('customer.json') ? authFile('customer.json') : undefined })

  test('browse → product → checkout → confirmation → swipe to collect', async ({ page }) => {
    await page.goto('/b2c/home')
    // Feed cards are <a role="listitem"> (the grid is role="list"), so the deal
    // exposes as a listitem, not a link — query by its real role.
    await page.getByRole('listitem', { name: DEAL }).first().click()

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
