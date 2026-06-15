import { test, expect } from '@playwright/test'
import { authFile, hasAuth, EMAILS } from '../../fixtures/constants.js'
import { serviceClient, ownerBusinessId, userIdByEmail, createDeal, deleteDeal } from '../../fixtures/seed.js'

/**
 * Customer — review gating: a customer may review a business ONLY after a real
 * (non-cancelled) order from it. This proves the seam UI → hasOrderedFromBusiness
 * (the gate opens) → upsertMyReview → RLS → the review renders.
 *
 * Hybrid data: seed a deal, place a real order through the UI to open the gate,
 * then delete the deal (+ its order) and the review afterward.
 */
test.describe('Customer — review gating', () => {
  test.skip(!hasAuth('customer.json'), 'requires E2E test project (run global-setup)')
  test.skip(!process.env.E2E_SUPABASE_SERVICE_ROLE_KEY, 'requires the E2E service role — set e2e/.env.e2e')
  test.use({ storageState: hasAuth('customer.json') ? authFile('customer.json') : undefined })

  let admin
  let businessId
  let customerId
  const created = []

  test.beforeAll(async () => {
    admin = serviceClient()
    businessId = await ownerBusinessId(admin)
    customerId = await userIdByEmail(admin, EMAILS.customer)
  })

  test.afterAll(async () => {
    for (const id of created) await deleteDeal(admin, id)
    // Remove the review this test left so QA stays pristine + re-runs are clean.
    if (customerId) await admin.from('reviews').delete().eq('business_id', businessId).eq('user_id', customerId)
  })

  test('a customer who ordered can post a review that appears', async ({ page }) => {
    // 1) Give the customer a real order from this business (opens the gate).
    const title = `ביקורת בדיקה ${Date.now()}`
    const deal = await createDeal(admin, { businessId, title, quantity: 3 })
    created.push(deal.id)

    await page.goto('/b2c/home')
    await page.getByRole('listitem', { name: new RegExp(title) }).first().click()
    await expect(page).toHaveURL(/\/b2c\/product\//)
    await page.getByRole('button', { name: /הוסף לסל/ }).first().click()
    await expect(page).toHaveURL(/\/b2c\/checkout/)
    await page.getByRole('checkbox').check()
    await page.locator('#b2c-pay-btn').click()
    await expect(page).toHaveURL(/\/b2c\/confirmation/)

    // 2) On the storefront the review CTA is now available — post a 5★ review.
    await page.goto(`/b2c/business/${businessId}`)
    await page.getByRole('button', { name: /כתוב ביקורת|ערוך ביקורת/ }).click()
    await page.getByRole('radio', { name: '5 כוכבים' }).click()
    const comment = `חוויה מצוינת — בדיקה ${Date.now()}`
    await page.getByPlaceholder('איך הייתה החוויה').fill(comment)
    await page.getByRole('button', { name: 'פרסם' }).click()

    // 3) The review renders in the list.
    await expect(page.getByText(comment)).toBeVisible()
  })
})
