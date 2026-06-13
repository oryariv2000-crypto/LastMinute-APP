import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const h = vi.hoisted(() => ({ createOrder: null }))
vi.mock('../../lib/db', () => ({
  getMyProfile: async () => ({ id: 'u1', full_name: 'דנה כהן' }),
  getMyBusiness: async () => null,
  getBusinessesForMap: async () => [], // imported by NavbarB2C (unused here)
  getDealById: async (id) => ({
    id, title: 'מגש מאפים', discount_price: 15, original_price: 27,
    quantity_left: 5, pickup_start: null, businesses: { name: 'ארומה' },
  }),
  createOrder: (...args) => h.createOrder(...args),
}))

// Payment is a placeholder provider (lib/payments). Mock it so checkout tests
// don't wait on its simulated round-trip and stay deterministic.
vi.mock('../../lib/payments', () => ({
  PAYMENT_STATUS: { IDLE: 'idle', PENDING: 'pending', SUCCESS: 'success', FAILED: 'failed' },
  getPaymentProvider: () => ({
    isPlaceholder: true,
    authorize: async () => ({ status: 'success', placeholder: true, reference: 'TEST' }),
  }),
}))

import B2CCheckoutPage from '../../pages/B2CCheckoutPage'

function ConfirmMarker() {
  const [sp] = useSearchParams()
  return <div>confirmed:{sp.get('code')}</div>
}

function renderCheckout() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: '/b2c/checkout', state: { dealId: 'd1', quantity: 1 } }]}>
        <Routes>
          <Route path="/b2c/checkout" element={<B2CCheckoutPage />} />
          <Route path="/b2c/confirmation" element={<ConfirmMarker />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  h.createOrder = vi.fn(async () => ({ order_code: 'LM-9' }))
})

describe('Checkout flow', () => {
  it('blocks payment until the self-pickup checkbox is checked', async () => {
    renderCheckout()
    await screen.findByText('מגש מאפים') // deal loaded
    expect(screen.getByRole('button', { name: /שלם ובוא לאסוף/ })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', { name: /שלם ובוא לאסוף/ })).toBeEnabled()
  })

  it('places the order server-side (no client total) and goes to confirmation', async () => {
    renderCheckout()
    await screen.findByText('מגש מאפים')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /שלם ובוא לאסוף/ }))
    // Order is placed only after the payment provider authorizes, so wait for
    // the confirmation redirect before asserting the server-side call.
    expect(await screen.findByText('confirmed:LM-9')).toBeInTheDocument()
    expect(h.createOrder).toHaveBeenCalledWith({ deal_id: 'd1', quantity: 1 })
  })
})
