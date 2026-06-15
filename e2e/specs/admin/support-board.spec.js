import { test, expect } from '@playwright/test'
import { authFile, hasAuth } from '../../fixtures/constants.js'
import { serviceClient } from '../../fixtures/seed.js'

/**
 * Admin — the support triage board. Reachability is gated by users.role = 'admin'
 * (ProtectedRoute adminOnly + support_tickets RLS); global-setup promotes the
 * seeded admin to that role. Triage exercises the admin RLS *write*.
 */
test.describe('Admin — support board', () => {
  test.skip(!hasAuth('admin.json'), 'requires E2E test project (run global-setup)')
  test.use({ storageState: hasAuth('admin.json') ? authFile('admin.json') : undefined })

  test('admin can open the support triage board', async ({ page }) => {
    await page.goto('/admin/support')
    await expect(page).toHaveURL(/\/admin\/support/)
  })

  test('admin can triage a ticket — change its status (admin RLS write)', async ({ page }) => {
    test.skip(!process.env.E2E_SUPABASE_SERVICE_ROLE_KEY, 'requires the E2E service role — set e2e/.env.e2e')
    const admin = serviceClient()

    // Seed a fresh ticket to triage (Hybrid — deleted afterward).
    const subject = `טריאז׳ בדיקה ${Date.now()}`
    const { data: ticket } = await admin.from('support_tickets').insert({
      user_id: null, role: 'customer', category: 'question', priority: 'normal',
      status: 'new', subject, description: `E2E triage ${Date.now()}`, contact: 'e2e',
    }).select('id').single()

    try {
      await page.goto('/admin/support')
      const row = page.getByRole('listitem').filter({ hasText: subject })
      await expect(row).toBeVisible()

      // Change status → "resolved" via the row's inline control.
      await row.getByLabel('סטטוס').selectOption('resolved')

      // The admin RLS update persisted server-side.
      await expect.poll(async () => {
        const { data } = await admin.from('support_tickets').select('status').eq('id', ticket.id).single()
        return data?.status
      }).toBe('resolved')
    } finally {
      await admin.from('support_tickets').delete().eq('id', ticket.id)
    }
  })
})
