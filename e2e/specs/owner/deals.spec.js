import { test, expect } from '@playwright/test'
import { authFile, hasAuth, SEED_DEAL_TITLE } from '../../fixtures/constants.js'
import { serviceClient, ownerBusinessId, createDeal, deleteDeal } from '../../fixtures/seed.js'

/**
 * Owner — deal management: a deal shows in the dashboard AND the customer feed;
 * pausing removes it from the feed and resuming restores it; deleting removes it
 * from the dashboard. The owner views the feed in shopping mode (owners can shop).
 *
 * Hybrid data: each test seeds its OWN deal on the owner's business and deletes
 * it afterward. page.goto fully reloads, so feed reads are always live (no stale
 * react-query cache).
 */
test.describe('Owner — deal management', () => {
  test.skip(!hasAuth('owner.json'), 'requires E2E test project (run global-setup)')
  test.skip(!process.env.E2E_SUPABASE_SERVICE_ROLE_KEY, 'requires the E2E service role — set e2e/.env.e2e')
  test.use({ storageState: hasAuth('owner.json') ? authFile('owner.json') : undefined })

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

  // The baseline deal is always active → its presence means the feed has loaded,
  // so a "not in feed" assertion can't pass during the loading window.
  const feedLoaded = (page) =>
    expect(page.getByRole('listitem', { name: new RegExp(SEED_DEAL_TITLE) }).first()).toBeVisible()

  test('a deal shows in the dashboard and the customer feed', async ({ page }) => {
    const title = `מבצע בדיקה ${Date.now()}`
    const deal = await createDeal(admin, { businessId, title, quantity: 5 })
    created.push(deal.id)

    await page.goto('/b2b/dashboard')
    await expect(page.getByRole('article', { name: title, exact: true })).toBeVisible()

    await page.goto('/b2c/home')
    await feedLoaded(page)
    await expect(page.getByRole('listitem', { name: new RegExp(title) })).toBeVisible()
  })

  test('pausing a deal removes it from the feed; resuming restores it', async ({ page }) => {
    const title = `השהיה בדיקה ${Date.now()}`
    const deal = await createDeal(admin, { businessId, title, quantity: 5 })
    created.push(deal.id)

    await page.goto('/b2c/home')
    await expect(page.getByRole('listitem', { name: new RegExp(title) })).toBeVisible()

    // Pause from the dashboard.
    await page.goto('/b2b/dashboard')
    const card = page.getByRole('article', { name: title, exact: true })
    await card.getByRole('button', { name: 'השהה' }).click()
    await expect(card.getByRole('button', { name: 'הפעל' })).toBeVisible() // now paused

    // Gone from the feed.
    await page.goto('/b2c/home')
    await feedLoaded(page)
    await expect(page.getByRole('listitem', { name: new RegExp(title) })).toHaveCount(0)

    // Resume → back in the feed.
    await page.goto('/b2b/dashboard')
    await card.getByRole('button', { name: 'הפעל' }).click()
    await expect(card.getByRole('button', { name: 'השהה' })).toBeVisible()
    await page.goto('/b2c/home')
    await expect(page.getByRole('listitem', { name: new RegExp(title) })).toBeVisible()
  })

  test('deleting a deal removes it from the dashboard', async ({ page }) => {
    const title = `מחיקה בדיקה ${Date.now()}`
    const deal = await createDeal(admin, { businessId, title, quantity: 5 })
    created.push(deal.id)

    await page.goto('/b2b/dashboard')
    const card = page.getByRole('article', { name: title, exact: true })
    await expect(card).toBeVisible()

    page.once('dialog', (d) => d.accept()) // confirm the permanent-delete prompt
    await card.getByRole('button', { name: 'מחק' }).click()
    await expect(page.getByRole('article', { name: title, exact: true })).toHaveCount(0)
  })
})
