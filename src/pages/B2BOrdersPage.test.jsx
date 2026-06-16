import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils'

const h = vi.hoisted(() => ({
  orders: [],
  complete: vi.fn(),
  completeByCode: vi.fn(),
}))

vi.mock('../lib/useProfile', () => ({
  useProfile: () => ({ profile: { full_name: 'בעל עסק' }, business: { name: 'מאפיית הבוקר' } }),
}))

vi.mock('../lib/db', () => ({
  getMyBusinessOrders: async () => h.orders,
  completeOrder: (id) => h.complete(id),
  completeOrderByCode: (code) => h.completeByCode(code),
  // NavbarB2B → NotificationsBell reads these on mount.
  getMyDeals: async () => [],
  getMySupportTickets: async () => [],
  getMyNotifications: async () => [],
  markNotificationRead: async () => ({}),
}))

// Stub the camera scanner so tests never load html5-qrcode; the stub exposes a
// button that fires onScan, standing in for a successful decode.
vi.mock('../components/OrderQrScanner/OrderQrScanner', () => ({
  default: ({ onScan, onClose }) => (
    <div data-testid="qr-scanner-stub">
      <button type="button" onClick={() => onScan('LM-SCAN9')}>סימולציית סריקה</button>
      <button type="button" onClick={onClose}>סגור סורק</button>
    </div>
  ),
}))

import B2BOrdersPage from './B2BOrdersPage'

const openOrder = {
  id: 'o1', status: 'pending', order_code: 'LM-AAAAA', quantity: 2, total: 16,
  deals: { title: 'מגש מאפים' }, users: { full_name: 'דנה' },
}
const doneOrder = {
  id: 'o2', status: 'completed', order_code: 'LM-DONE0', quantity: 1, total: 8,
  deals: { title: 'הזמנה שהושלמה' }, users: { full_name: 'יוסי' },
}

beforeEach(() => {
  h.orders = []
  h.complete.mockReset().mockResolvedValue({ id: 'o1', status: 'completed' })
  h.completeByCode.mockReset().mockResolvedValue({ id: 'o5', order_code: 'LM-CODE5', status: 'completed' })
})

describe('B2BOrdersPage — pending list', () => {
  it('lists only open (pending/ready) orders with a "mark as collected" action', async () => {
    h.orders = [openOrder, doneOrder]
    renderWithProviders(<B2BOrdersPage />)

    expect(await screen.findByText('מגש מאפים')).toBeInTheDocument()
    expect(screen.getByText(/LM-AAAAA/)).toBeInTheDocument()
    expect(screen.getByText('דנה')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /סמן כנאסף/ })).toBeInTheDocument()
    // Completed orders are not in the actionable list.
    expect(screen.queryByText('הזמנה שהושלמה')).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no open orders', async () => {
    h.orders = [doneOrder]
    renderWithProviders(<B2BOrdersPage />)
    expect(await screen.findByText(/אין הזמנות ממתינות/)).toBeInTheDocument()
  })

  it('marks an order collected and removes it from the open list', async () => {
    h.orders = [openOrder]
    renderWithProviders(<B2BOrdersPage />)

    await userEvent.click(await screen.findByRole('button', { name: /סמן כנאסף/ }))

    expect(h.complete).toHaveBeenCalledWith('o1')
    await waitFor(() => expect(screen.queryByText('מגש מאפים')).not.toBeInTheDocument())
    expect(screen.getByText(/סומנה כנאספה/)).toBeInTheDocument()
  })
})

describe('B2BOrdersPage — verify by code', () => {
  it('completes the order matching a typed code', async () => {
    renderWithProviders(<B2BOrdersPage />)

    const input = await screen.findByLabelText(/קוד הזמנה/)
    await userEvent.type(input, 'lm-code5')
    await userEvent.click(screen.getByRole('button', { name: /אמת קוד/ }))

    expect(h.completeByCode).toHaveBeenCalledWith('lm-code5')
    expect(await screen.findByText(/LM-CODE5/)).toBeInTheDocument()
    expect(screen.getByText(/סומנה כנאספה/)).toBeInTheDocument()
  })

  it('surfaces an error when the code cannot be verified', async () => {
    h.completeByCode.mockRejectedValueOnce(new Error('לא נמצאה הזמנה עם קוד זה'))
    renderWithProviders(<B2BOrdersPage />)

    await userEvent.type(await screen.findByLabelText(/קוד הזמנה/), 'LM-NOPE0')
    await userEvent.click(screen.getByRole('button', { name: /אמת קוד/ }))

    expect(await screen.findByText(/לא נמצאה הזמנה עם קוד זה/)).toBeInTheDocument()
  })
})

describe('B2BOrdersPage — QR scanner', () => {
  it('opens the scanner and completes the scanned order', async () => {
    renderWithProviders(<B2BOrdersPage />)

    await userEvent.click(await screen.findByRole('button', { name: /סרוק QR/ }))
    expect(screen.getByTestId('qr-scanner-stub')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /סימולציית סריקה/ }))
    expect(h.completeByCode).toHaveBeenCalledWith('LM-SCAN9')
  })
})
