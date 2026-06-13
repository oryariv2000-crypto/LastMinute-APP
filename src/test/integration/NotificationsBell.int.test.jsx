import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithRouter } from '../utils'

const h = vi.hoisted(() => ({ deals: [], tickets: [] }))
vi.mock('../../lib/db', () => ({
  getMyDeals: async () => h.deals,
  getMySupportTickets: async () => h.tickets,
}))

import NotificationsBell from '../../components/NotificationsBell/NotificationsBell'
import NavbarB2B from '../../components/NavbarB2B/NavbarB2B'

beforeEach(() => { h.deals = []; h.tickets = [] })

describe('NotificationsBell', () => {
  it('derives stock + ticket alerts and lists them when opened', async () => {
    h.deals = [
      { id: 'd1', title: 'לחם כפרי', quantity_left: 0, status: 'active' },
      { id: 'd2', title: 'עוגת גבינה', quantity_left: 2, status: 'active' },
    ]
    h.tickets = [{ id: 't1', subject: 'בעיה בתשלום', status: 'resolved' }]
    renderWithRouter(<NotificationsBell />)

    // Badge reflects the alert count once data loads.
    const bell = await screen.findByRole('button', { name: /התראות — 3 חדשות/ })
    await userEvent.click(bell)

    expect(screen.getByText(/אזל המלאי: לחם כפרי/)).toBeInTheDocument()
    expect(screen.getByText(/נותרו 2 יח׳: עוגת גבינה/)).toBeInTheDocument()
    expect(screen.getByText(/פנייתך "בעיה בתשלום"/)).toBeInTheDocument()
  })

  it('shows an empty state when there is nothing actionable', async () => {
    h.deals = [{ id: 'd1', title: 'מאפה', quantity_left: 50, status: 'active' }]
    renderWithRouter(<NotificationsBell />)
    await userEvent.click(await screen.findByRole('button', { name: 'התראות' }))
    expect(screen.getByText(/אין התראות חדשות/)).toBeInTheDocument()
  })
})

describe('NavbarB2B (smoke with its notification bell)', () => {
  it('renders the brand and the notifications bell', async () => {
    renderWithRouter(<NavbarB2B businessName="ארומה" initials="אר" />)
    expect(screen.getByText('ארומה')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /התראות/ })).toBeInTheDocument()
  })
})
