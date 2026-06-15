import { test, expect } from '@playwright/test'
import { authFile, hasAuth } from '../../fixtures/constants.js'
import { serviceClient, ownerBusinessId, createDeal, deleteDeal, dealStock, setDealStock } from '../../fixtures/seed.js'

/**
 * Customer — server-enforced stock guards, exercised through the UI.
 *
 * Hybrid data: each test seeds its OWN deal on the owner's business via the
 * service role and deletes it (and any orders) afterward, so the QA database
 * stays pristine and the tests never contend over shared stock.
 *
 * Needs the customer session (storageState) AND the service role (seeding).
 */
test.describe('Customer — stock guards', () => {
  test.skip(!hasAuth('customer.json'), 'requires E2E test project (run global-setup)')
  test.skip(!process.env.E2E_SUPABASE_SERVICE_ROLE_KEY, 'requires the E2E service role — set e2e/.env.e2e')
  test.use({ storageState: hasAuth('customer.json') ? authFile('customer.json') : undefined })

  let admin
  let businessId
  const created = []

  test.beforeAll(async () => {
    admin = serviceClient()
    businessId = await ownerBusinessId(admin)
  })

  test.afterAll(async () => {
    for (const id of created) await deleteDeal(admin, id)
  })

  // Drive the feed → product → checkout → pay flow up to (but not including) the
  // pay click, for a deal identified by its unique title.
  async function buyToCheckout(page, title) {
    await page.goto('/b2c/home')
    await page.getByRole('listitem', { name: new RegExp(title) }).first().click()
    await expect(page).toHaveURL(/\/b2c\/product\//)
    await page.getByRole('button', { name: /הוסף לסל/ }).first().click()
    await expect(page).toHaveURL(/\/b2c\/checkout/)
    await page.getByRole('checkbox').check()
  }

  test('cancel before the pickup window restores stock', async ({ page }) => {
    const title = `ביטול בדיקה ${Date.now()}`
    const deal = await createDeal(admin, { businessId, title, quantity: 5 }) // pickup_start null → cancellable
    created.push(deal.id)

    await buyToCheckout(page, title)
    await page.locator('#b2c-pay-btn').click()
    await expect(page).toHaveURL(/\/b2c\/confirmation/)
    await expect(page.getByText('ההזמנה אושרה!')).toBeVisible()
    // stock decremented by the place_order trigger
    await expect.poll(() => dealStock(admin, deal.id)).toBe(4)

    // Cancel (a window.confirm guards it) → stock is restored.
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'בטל הזמנה' }).click()
    await expect(page.getByText('ההזמנה בוטלה')).toBeVisible()
    await expect.poll(() => dealStock(admin, deal.id)).toBe(5)
  })

  test('oversell is rejected at checkout when the last unit sells out', async ({ page }) => {
    const title = `אוברסל בדיקה ${Date.now()}`
    const deal = await createDeal(admin, { businessId, title, quantity: 1 })
    created.push(deal.id)

    await buyToCheckout(page, title)
    // Simulate the last unit selling out while the customer sits in checkout.
    await setDealStock(admin, deal.id, 0)

    await page.locator('#b2c-pay-btn').click()

    // place_order's trigger rejects the oversell; the UI surfaces it and stays put.
    await expect(page.getByRole('alert')).toHaveText(/אזל מהמלאי/)
    await expect(page).toHaveURL(/\/b2c\/checkout/)
    // No order was created and stock is untouched at 0.
    await expect.poll(() => dealStock(admin, deal.id)).toBe(0)
  })
})
