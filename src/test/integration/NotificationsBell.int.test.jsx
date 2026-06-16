import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { renderWithRouter, renderWithProviders } from '../utils'

const h = vi.hoisted(() => ({
  deals: [], tickets: [], notifications: [],
  markRead: vi.fn(async (id) => ({ id, is_read: true })),
}))
vi.mock('../../lib/db', () => ({
  getMyDeals: async () => h.deals,
  getMySupportTickets: async () => h.tickets,
  getMyNotifications: async () => h.notifications,
  markNotificationRead: (id) => h.markRead(id),
  getMyProfile: async () => ({ id: 'u1', full_name: 'בעל עסק', is_business: true }),
  getMyBusiness: async () => null,
}))

import NotificationsBell from '../../components/NotificationsBell/NotificationsBell'
import NavbarB2B from '../../components/NavbarB2B/NavbarB2B'

/** Shows the current route so we can assert navigation happened. */
function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="location">{loc.pathname}</div>
}

function renderBellAt(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <NotificationsBell />
      <LocationProbe />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  h.deals = []; h.tickets = []; h.notifications = []
  h.markRead.mockClear()
})

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

  it('surfaces a new-order notification from the database', async () => {
    h.notifications = [
      { id: 'n1', type: 'new_order', title: 'הזמנה חדשה התקבלה!', body: 'הזמנה LM-1234 · מגש מאפים', order_id: 'o1', is_read: false },
    ]
    renderWithRouter(<NotificationsBell />)
    const bell = await screen.findByRole('button', { name: /התראות — 1 חדשות/ })
    await userEvent.click(bell)
    expect(screen.getByText('הזמנה חדשה התקבלה!')).toBeInTheDocument()
    expect(screen.getByText(/הזמנה LM-1234/)).toBeInTheDocument()
  })

  it('does not count or show already-read notifications', async () => {
    h.notifications = [
      { id: 'n1', type: 'new_order', title: 'הזמנה חדשה התקבלה!', body: 'הזמנה LM-1', is_read: true },
    ]
    renderWithRouter(<NotificationsBell />)
    // No unread items → plain "התראות" label and empty state.
    await userEvent.click(await screen.findByRole('button', { name: 'התראות' }))
    expect(screen.getByText(/אין התראות חדשות/)).toBeInTheDocument()
  })

  it('routes to orders management and marks read when a new-order notification is clicked', async () => {
    h.notifications = [
      { id: 'n1', type: 'new_order', title: 'הזמנה חדשה התקבלה!', body: 'הזמנה LM-1234', order_id: 'o1', is_read: false },
    ]
    renderBellAt('/b2b/stats')

    await userEvent.click(await screen.findByRole('button', { name: /התראות — 1 חדשות/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: /הזמנה חדשה התקבלה!/ }))

    expect(h.markRead).toHaveBeenCalledWith('n1')
    expect(screen.getByTestId('location')).toHaveTextContent('/b2b/orders')
  })
})

describe('NavbarB2B (smoke with its notification bell)', () => {
  it('renders the brand and the notifications bell', async () => {
    renderWithProviders(<NavbarB2B businessName="ארומה" initials="אר" />)
    expect(screen.getByText('ארומה')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /התראות/ })).toBeInTheDocument()
  })
})
