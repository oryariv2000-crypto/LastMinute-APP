/**
 * SelfDealing.int.test.jsx
 *
 * Verifies that the self-dealing guard is applied on both the product page and
 * the checkout page: when the current user owns the business that published the
 * deal, a notice is shown and the buy / pay action is hidden.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Shared test data ────────────────────────────────────────────────────────
const OWNER_ID   = 'user-owner-123'
const OTHER_ID   = 'user-other-456'
const DEAL_ID    = 'deal-abc'
const BUSINESS_ID = 'biz-xyz'

function makeDeal(ownerUserId) {
  return {
    id: DEAL_ID,
    business_id: BUSINESS_ID,
    title: 'מגש מאפים מיוחד',
    discount_price: 20,
    original_price: 40,
    quantity_left: 8,
    pickup_start: null,
    tags: [],
    businesses: {
      name: 'המאפייה שלנו',
      address: 'רחוב הדוגמה 1',
      phone: null,
      rating: 0,
      business_type: 'bakery',
      user_id: ownerUserId,
    },
  }
}

// ── Mock db ─────────────────────────────────────────────────────────────────
// The mocks are defined once; individual tests override getDealById via the
// `currentDeal` holder so both product-page and checkout-page tests can reuse.
const mocks = {
  currentDeal: makeDeal(OWNER_ID),
  currentProfileId: OWNER_ID,
}

vi.mock('../../lib/db', () => ({
  getMyProfile:        async () => ({ id: mocks.currentProfileId, full_name: 'דנה' }),
  getMyBusiness:       async () => null,
  getBusinessesForMap: async () => [],
  getDealById:         async () => mocks.currentDeal,
  getBusinessDeals:    async () => [],
  isDealSaved:         async () => false,
  setDealSaved:        async (_id, v) => v,
  discountPct:         (o, d) => (o > d ? Math.round(((o - d) / o) * 100) : 0),
  createOrder:         async () => ({ order_code: 'ORD-TEST' }),
}))

vi.mock('../../lib/payments', () => ({
  PAYMENT_STATUS: { IDLE: 'idle', PENDING: 'pending', SUCCESS: 'success', FAILED: 'failed' },
  getPaymentProvider: () => ({
    authorize: async () => ({ status: 'success', placeholder: true }),
  }),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function renderProductPage() {
  return render(
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter initialEntries={[`/b2c/product/${DEAL_ID}`]}>
        <Routes>
          <Route path="/b2c/product/:id" element={
            // Lazy import so module is always fresh per render within the same
            // module scope. React Router's nested Routes give us enough isolation.
            <ProductPageWrapper />
          } />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

import B2CProductPage from '../../pages/B2CProductPage'
function ProductPageWrapper() { return <B2CProductPage /> }

function renderCheckoutPage() {
  return render(
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter
        initialEntries={[{ pathname: '/b2c/checkout', state: { dealId: DEAL_ID, quantity: 1 } }]}
      >
        <Routes>
          <Route path="/b2c/checkout" element={<CheckoutPageWrapper />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

import B2CCheckoutPage from '../../pages/B2CCheckoutPage'
function CheckoutPageWrapper() { return <B2CCheckoutPage /> }

// ── Tests ────────────────────────────────────────────────────────────────────
describe('Self-dealing guard — product page', () => {
  it('shows the self-dealing notice and hides AddToCartBar when the deal belongs to the current user', async () => {
    mocks.currentDeal      = makeDeal(OWNER_ID)
    mocks.currentProfileId = OWNER_ID

    renderProductPage()

    // Two notice divs render (desktop + mobile variants) — findAllBy handles both
    const notices = await screen.findAllByRole('status', { name: /מבצע של העסק שלך/i })
    expect(notices.length).toBeGreaterThanOrEqual(1)
    expect(notices[0]).toBeInTheDocument()

    // AddToCartBar must NOT render (its "הוסף לסל" button is absent)
    expect(screen.queryByRole('button', { name: /הוסף לסל/i })).not.toBeInTheDocument()
  })

  it('shows AddToCartBar and hides the notice when the deal belongs to a different user', async () => {
    mocks.currentDeal      = makeDeal(OTHER_ID)
    mocks.currentProfileId = OWNER_ID

    renderProductPage()

    // AddToCartBar must render (two variants: desktop + mobile)
    const addBtns = await screen.findAllByRole('button', { name: /הוסף לסל/i })
    expect(addBtns.length).toBeGreaterThanOrEqual(1)

    // Notice must NOT appear
    expect(screen.queryByRole('status', { name: /מבצע של העסק שלך/i })).not.toBeInTheDocument()
  })
})

describe('Self-dealing guard — checkout page', () => {
  it('shows the self-dealing notice and hides the pay button when the deal belongs to the current user', async () => {
    mocks.currentDeal      = makeDeal(OWNER_ID)
    mocks.currentProfileId = OWNER_ID

    renderCheckoutPage()

    const notice = await screen.findByRole('status', { name: /מבצע של העסק שלך/i })
    expect(notice).toBeInTheDocument()

    // Pay button must NOT render
    expect(screen.queryByRole('button', { name: /שלם ובוא לאסוף/i })).not.toBeInTheDocument()
  })

  it('shows the pay button and hides the notice when the deal belongs to a different user', async () => {
    mocks.currentDeal      = makeDeal(OTHER_ID)
    mocks.currentProfileId = OWNER_ID

    renderCheckoutPage()

    // Pay button (inside b2c-pay-bar toolbar) must render
    await screen.findByRole('button', { name: /שלם ובוא לאסוף/i })

    expect(screen.queryByRole('status', { name: /מבצע של העסק שלך/i })).not.toBeInTheDocument()
  })
})
