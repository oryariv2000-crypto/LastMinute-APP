import { test, expect } from '@playwright/test'
import { authFile, hasAuth, SEED_DEAL_TITLE } from '../../fixtures/constants.js'

/**
 * B2B — the owner dashboard lists the owner's own active deals (getMyDeals, which
 * is NOT filtered by business hours — distinct from the customer feed).
 */
test.describe('B2B — owner dashboard', () => {
  test.skip(!hasAuth('owner.json'), 'requires E2E test project (run global-setup)')
  test.use({ storageState: hasAuth('owner.json') ? authFile('owner.json') : undefined })

  test('the seeded active deal is listed', async ({ page }) => {
    await page.goto('/b2b/dashboard')
    await expect(page.getByText(new RegExp(SEED_DEAL_TITLE))).toBeVisible()
  })
})
