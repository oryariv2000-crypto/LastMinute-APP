import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils'

const h = vi.hoisted(() => ({ getActiveDealsPage: null }))
vi.mock('../../lib/db', () => ({
  getActiveDealsPage: (...a) => h.getActiveDealsPage(...a),
  getMyProfile: async () => ({ id: 'u1', full_name: 'דנה' }),
  getMyBusiness: async () => null,
  getBusinessesForMap: async () => [],
  getMyOrders: async () => [],
  discountPct: (o, d) => (o > d ? Math.round(((o - d) / o) * 100) : 0),
}))

import B2CHomePage from '../../pages/B2CHomePage'

const oneDeal = {
  rows: [{
    id: 'd1', title: 'מגש מאפים', discount_price: 15, original_price: 27,
    quantity_left: 5, tags: [], business_id: 'b1',
    businesses: { name: 'ארומה', business_type: 'cafe', rating: 0 },
  }],
  nextOffset: undefined,
}

beforeEach(() => {
  h.getActiveDealsPage = vi.fn(async () => oneDeal)
})

describe('Home feed', () => {
  it('renders deals returned by the server and requests "all" types initially', async () => {
    renderWithProviders(<B2CHomePage />)
    expect(await screen.findByText('מגש מאפים')).toBeInTheDocument()
    expect(h.getActiveDealsPage).toHaveBeenCalledWith(
      expect.objectContaining({ businessTypes: [] }),
    )
  })

  it('pushes the chosen business type to the server when a chip is selected', async () => {
    renderWithProviders(<B2CHomePage />)
    await screen.findByText('מגש מאפים')
    const strip = screen.getByRole('navigation', { name: 'סינון לפי קטגוריה' })
    const chips = within(strip).getAllByRole('button')
    await userEvent.click(chips[1]) // first real category after "הכל"
    await waitFor(() =>
      expect(h.getActiveDealsPage).toHaveBeenCalledWith(
        expect.objectContaining({ businessTypes: expect.arrayContaining([expect.any(String)]) }),
      ),
    )
  })
})
