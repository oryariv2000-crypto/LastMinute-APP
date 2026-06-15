import { test, expect } from '@playwright/test'
import { authFile, hasAuth } from '../../fixtures/constants.js'

/**
 * Admin — the support triage board. Reachability is gated by users.role = 'admin'
 * (ProtectedRoute adminOnly + support_tickets RLS). global-setup promotes the
 * seeded admin to that role.
 *
 * (Ticket-triage update — strategy §3 — will be added here next.)
 */
test.describe('Admin — support board', () => {
  test.skip(!hasAuth('admin.json'), 'requires E2E test project (run global-setup)')
  test.use({ storageState: hasAuth('admin.json') ? authFile('admin.json') : undefined })

  test('admin can open the support triage board', async ({ page }) => {
    await page.goto('/admin/support')
    await expect(page).toHaveURL(/\/admin\/support/)
  })
})
