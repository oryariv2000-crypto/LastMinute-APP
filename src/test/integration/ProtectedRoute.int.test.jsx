import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// Mutable auth state the mocked supabase reads (set per test).
const h = vi.hoisted(() => ({ session: null, role: null, isBusiness: false }))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: h.session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: h.session ? { role: h.role, is_business: h.isBusiness } : null,
            error: null,
          }),
        }),
      }),
    }),
  },
}))

import ProtectedRoute from '../../components/ProtectedRoute'

function renderGuard(props) {
  return render(
    <MemoryRouter initialEntries={['/p']}>
      <Routes>
        <Route path="/p" element={<ProtectedRoute {...props}><div>תוכן מוגן</div></ProtectedRoute>} />
        <Route path="/login" element={<div>דף כניסה</div>} />
        <Route path="/b2b/dashboard" element={<div>דשבורד עסקי</div>} />
        <Route path="/b2c/home" element={<div>בית לקוח</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => { h.session = null; h.role = null; h.isBusiness = false })

describe('ProtectedRoute', () => {
  it('redirects to /login when there is no session', async () => {
    h.session = null
    renderGuard({})
    expect(await screen.findByText('דף כניסה')).toBeInTheDocument()
  })

  it('renders children for any authenticated user on a plain B2C route (no requireBusiness)', async () => {
    h.session = { user: { id: 'u1', email: 'c@x.co' } }
    h.role = 'customer'
    h.isBusiness = false
    renderGuard({})
    expect(await screen.findByText('תוכן מוגן')).toBeInTheDocument()
  })

  it('renders children for a business user on a plain B2C route (no requireBusiness)', async () => {
    h.session = { user: { id: 'u1b', email: 'biz@x.co' } }
    h.role = 'business_owner'
    h.isBusiness = true
    renderGuard({})
    expect(await screen.findByText('תוכן מוגן')).toBeInTheDocument()
  })

  it('redirects a non-business user hitting a requireBusiness route to /b2c/home', async () => {
    h.session = { user: { id: 'u2', email: 'c@x.co' } }
    h.role = 'customer'
    h.isBusiness = false
    renderGuard({ requireBusiness: true })
    expect(await screen.findByText('בית לקוח')).toBeInTheDocument()
  })

  it('renders children for a business user on a requireBusiness route', async () => {
    h.session = { user: { id: 'u3', email: 'biz@x.co' } }
    h.role = 'business_owner'
    h.isBusiness = true
    renderGuard({ requireBusiness: true })
    expect(await screen.findByText('תוכן מוגן')).toBeInTheDocument()
  })

  it('blocks a non-admin from an adminOnly route', async () => {
    h.session = { user: { id: 'u4', email: 'nobody@x.co' } }
    h.role = 'customer'
    h.isBusiness = false
    renderGuard({ adminOnly: true })
    expect(await screen.findByText('בית לקוח')).toBeInTheDocument()
  })

  it('allows the admin email on an adminOnly route', async () => {
    h.session = { user: { id: 'u5', email: 'oryariv2000@gmail.com' } }
    h.role = 'customer'
    h.isBusiness = false
    renderGuard({ adminOnly: true })
    expect(await screen.findByText('תוכן מוגן')).toBeInTheDocument()
  })
})
