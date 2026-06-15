import { test, expect } from '@playwright/test'
import path from 'node:path'
import { authFile, hasAuth, SEED_DEAL_TITLE } from '../../fixtures/constants.js'
import { serviceClient, ownerBusinessId } from '../../fixtures/seed.js'

/**
 * Owner — AI Showcase: photo → Gemini (analyze-showcase edge fn) → review → publish.
 *
 * KEY-GATED — skipped by default. It spends real Gemini quota and depends on
 * non-deterministic AI output, so it runs ONLY when explicitly opted in:
 *   1. set  E2E_AI_SHOWCASE=1
 *   2. deploy the analyze-showcase edge function WITH GEMINI_API_KEY set
 *   3. provide a real food-showcase photo at e2e/fixtures/showcase.jpg
 *      (or point E2E_SHOWCASE_IMAGE at one). The committed file is a tiny
 *      placeholder — Gemini won't find products in it.
 */
test.describe('Owner — AI showcase publish', () => {
  test.skip(!process.env.E2E_AI_SHOWCASE, 'key-gated — set E2E_AI_SHOWCASE=1 (+ GEMINI_API_KEY on the edge fn) to run')
  test.skip(!hasAuth('owner.json'), 'requires E2E test project (run global-setup)')
  test.use({ storageState: hasAuth('owner.json') ? authFile('owner.json') : undefined })

  let admin
  let businessId
  let since

  test.beforeAll(async () => {
    admin = serviceClient()
    businessId = await ownerBusinessId(admin)
  })

  test.afterAll(async () => {
    // Remove whatever the AI run published on the owner's business (keep baseline).
    if (since) {
      await admin.from('deals').delete()
        .eq('business_id', businessId)
        .neq('title', SEED_DEAL_TITLE)
        .gte('created_at', since)
    }
  })

  test('analyze a showcase photo → review → publish → appears in the dashboard', async ({ page }) => {
    since = new Date().toISOString()
    const image = process.env.E2E_SHOWCASE_IMAGE || path.join('e2e', 'fixtures', 'showcase.jpg')

    await page.goto('/b2b/new-deal')
    await page.locator('input[type="file"]').setInputFiles(image)
    await page.getByRole('button', { name: /נתח/ }).click()

    // Gemini analysis → the review screen with suggested items.
    await expect(page).toHaveURL(/\/b2b\/review/, { timeout: 30_000 })
    await page.getByRole('button', { name: /פרסם הכל/ }).click()

    // Published → back on the dashboard, and a new deal exists on the business.
    await expect(page).toHaveURL(/\/b2b\/dashboard/, { timeout: 15_000 })
    const { data } = await admin.from('deals')
      .select('id').eq('business_id', businessId).neq('title', SEED_DEAL_TITLE).gte('created_at', since)
    expect(data.length).toBeGreaterThan(0)
  })
})
