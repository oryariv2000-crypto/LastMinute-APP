import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const h = vi.hoisted(() => ({ saved: false, setDealSaved: null }))
vi.mock('../../lib/db', () => ({
  getMyProfile: async () => ({ id: 'u1', full_name: 'דנה' }),
  getMyBusiness: async () => null,
  getBusinessesForMap: async () => [],
  getDealById: async (id) => ({
    id, business_id: 'b1', title: 'מגש מאפים', discount_price: 15, original_price: 27,
    quantity_left: 5, pickup_start: null, tags: [], businesses: { name: 'ארומה', rating: 0 },
  }),
  getBusinessDeals: async () => [],
  isDealSaved: async () => h.saved,
  setDealSaved: (...a) => h.setDealSaved(...a),
  discountPct: (o, d) => (o > d ? Math.round(((o - d) / o) * 100) : 0),
}))

import B2CProductPage from '../../pages/B2CProductPage'

function CheckoutMarker() {
  const { state } = useLocation()
  return <div>checkout:{state?.dealId}×{state?.quantity}</div>
}

function renderProduct() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/b2c/product/d1']}>
        <Routes>
          <Route path="/b2c/product/:id" element={<B2CProductPage />} />
          <Route path="/b2c/checkout" element={<CheckoutMarker />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  h.saved = false
  // Mirror the server so the post-mutation refetch (onSettled) keeps the flip.
  h.setDealSaved = vi.fn(async (_id, next) => { h.saved = next; return next })
})

describe('Product page — favorite + add to cart', () => {
  it('toggles the favorite via saved_deals (optimistic)', async () => {
    renderProduct()
    const heart = await screen.findByRole('button', { name: 'שמור' })
    await userEvent.click(heart)
    expect(h.setDealSaved).toHaveBeenCalledWith('d1', true)
    // optimistic flip → now offers to remove
    expect(await screen.findByRole('button', { name: 'הסר משמורים' })).toBeInTheDocument()
  })

  it('carries the deal + quantity to checkout on "add to cart"', async () => {
    renderProduct()
    await screen.findByText('מגש מאפים')
    const addButtons = screen.getAllByRole('button', { name: /הוסף לסל/ })
    await userEvent.click(addButtons[0])
    expect(await screen.findByText('checkout:d1×1')).toBeInTheDocument()
  })
})
