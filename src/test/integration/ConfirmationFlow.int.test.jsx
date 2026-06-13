import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const order = {
  id: 'o1', status: 'pending', order_code: 'LM-9', quantity: 1,
  deals: { title: 'מגש מאפים', pickup_start: null, businesses: { name: 'ארומה', address: 'רחוב 1', phone: '050' } },
}
const h = vi.hoisted(() => ({ complete: null, cancel: null }))
vi.mock('../../lib/db', () => ({
  getMyProfile: async () => ({ id: 'u1', full_name: 'דנה' }),
  getMyBusiness: async () => null,
  getBusinessesForMap: async () => [], // imported by NavbarB2C (unused here)
  getOrderByCode: async () => ({ ...order }),
  completeOrder: (...a) => h.complete(...a),
  cancelOrder: (...a) => h.cancel(...a),
}))

import B2CConfirmationPage from '../../pages/B2CConfirmationPage'

function renderConfirmation() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/b2c/confirmation?code=LM-9']}>
        <Routes>
          <Route path="/b2c/confirmation" element={<B2CConfirmationPage />} />
          <Route path="/b2c/orders" element={<div>ההזמנות שלי</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  h.complete = vi.fn(async () => ({ ...order, status: 'completed' }))
  h.cancel = vi.fn(async () => ({ ...order, status: 'cancelled' }))
})

describe('Confirmation flow (Click & Collect)', () => {
  it('swipe-to-collect marks the order completed', async () => {
    renderConfirmation()
    const thumb = await screen.findByRole('button', { name: 'החלק לאישור איסוף' })
    fireEvent.keyDown(thumb, { key: 'Enter' })
    expect(h.complete).toHaveBeenCalledWith('o1')
    expect(await screen.findByText(/ההזמנה נאספה/)).toBeInTheDocument()
  })

  it('cancels the order (before the pickup window) and restores stock', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderConfirmation()
    await userEvent.click(await screen.findByRole('button', { name: 'בטל הזמנה' }))
    expect(h.cancel).toHaveBeenCalledWith('o1')
    expect(await screen.findByText('ההזמנה בוטלה')).toBeInTheDocument()
  })
})
