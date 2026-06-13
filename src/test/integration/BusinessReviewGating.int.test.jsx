import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const h = vi.hoisted(() => ({ hasOrdered: false }))
vi.mock('../../lib/db', () => ({
  getMyProfile: async () => ({ id: 'u1', full_name: 'דנה' }),
  getMyBusiness: async () => null,
  getBusinessesForMap: async () => [],
  getBusinessById: async (id) => ({
    id, name: 'ארומה', address: 'רחוב 1', business_type: 'cafe',
    opening_hours: {}, gallery: [], logo_url: null, cover_url: null,
  }),
  getBusinessDeals: async () => [],
  getBusinessReviews: async () => [],
  upsertMyReview: async () => ({}),
  summarizeReviews: () => ({ avg: 0, count: 0 }),
  hasOrderedFromBusiness: async () => h.hasOrdered,
  discountPct: () => 0,
}))

import B2CBusinessPage from '../../pages/B2CBusinessPage'

function renderBusiness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/b2c/business/b1']}>
        <Routes>
          <Route path="/b2c/business/:id" element={<B2CBusinessPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Business storefront — review gating', () => {
  beforeEach(() => { h.hasOrdered = false })

  it('hides the review CTA and explains why when the customer has not ordered', async () => {
    renderBusiness()
    expect(await screen.findByText('ניתן לכתוב ביקורת רק לאחר הזמנה מהעסק')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /כתוב ביקורת/ })).not.toBeInTheDocument()
  })

  it('shows the review CTA after the customer has ordered', async () => {
    h.hasOrdered = true
    renderBusiness()
    expect(await screen.findByRole('button', { name: /כתוב ביקורת/ })).toBeInTheDocument()
  })
})
