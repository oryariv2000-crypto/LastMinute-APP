import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mutable profile the mocked data layer returns (set per test).
// null → no authenticated user (getMyProfile throws, exactly like the real one).
const h = vi.hoisted(() => ({ profile: null }))

vi.mock('../../lib/db', () => ({
  getMyProfile: async () => {
    if (!h.profile) throw new Error('לא מחובר. התחבר מחדש.')
    return h.profile
  },
  // Imported by useProfile but only queried when withBusiness is set (it isn't here).
  getMyBusiness: async () => null,
}))

// Auth is now decided from the session (useSession), not the profile fetch.
// Drive session presence off the same `h.profile` fixture so each test's intent
// ("null = unauthenticated") is preserved.
vi.mock('../../lib/useSession', () => ({
  useSession: () => ({
    session: h.profile ? { user: { id: h.profile.id } } : null,
    initializing: false,
  }),
}))

import ProtectedRoute from '../../components/ProtectedRoute'

function renderGuard(props) {
  // retry:false so the "no user" path errors immediately (no react-query backoff).
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/p']}>
        <Routes>
          <Route path="/p" element={<ProtectedRoute {...props}><div>תוכן מוגן</div></ProtectedRoute>} />
          <Route path="/login" element={<div>דף כניסה</div>} />
          <Route path="/b2b/dashboard" element={<div>דשבורד עסקי</div>} />
          <Route path="/b2c/home" element={<div>בית לקוח</div>} />
          <Route path="/b2c/open-business" element={<div>פתח עסק</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { h.profile = null })

describe('ProtectedRoute', () => {
  it('redirects to /login when there is no authenticated user', async () => {
    h.profile = null
    renderGuard({})
    expect(await screen.findByText('דף כניסה')).toBeInTheDocument()
  })

  it('renders children for any authenticated user on a plain B2C route (no requireBusiness)', async () => {
    h.profile = { id: 'u1', email: 'c@x.co', is_business: false }
    renderGuard({})
    expect(await screen.findByText('תוכן מוגן')).toBeInTheDocument()
  })

  it('renders children for a business user on a plain B2C route (no requireBusiness)', async () => {
    h.profile = { id: 'u1b', email: 'biz@x.co', is_business: true }
    renderGuard({})
    expect(await screen.findByText('תוכן מוגן')).toBeInTheDocument()
  })

  it('redirects a non-business user hitting a requireBusiness route to /b2c/open-business', async () => {
    h.profile = { id: 'u2', email: 'c@x.co', is_business: false }
    renderGuard({ requireBusiness: true })
    expect(await screen.findByText('פתח עסק')).toBeInTheDocument()
  })

  it('renders children for a business user on a requireBusiness route', async () => {
    h.profile = { id: 'u3', email: 'biz@x.co', is_business: true }
    renderGuard({ requireBusiness: true })
    expect(await screen.findByText('תוכן מוגן')).toBeInTheDocument()
  })

  it('blocks a non-admin non-business user from an adminOnly route → /b2c/home', async () => {
    h.profile = { id: 'u4', email: 'nobody@x.co', is_business: false }
    renderGuard({ adminOnly: true })
    expect(await screen.findByText('בית לקוח')).toBeInTheDocument()
  })

  it('blocks a non-admin business user from an adminOnly route → /b2b/dashboard', async () => {
    h.profile = { id: 'u4b', email: 'biz@x.co', is_business: true }
    renderGuard({ adminOnly: true })
    expect(await screen.findByText('דשבורד עסקי')).toBeInTheDocument()
  })

  it('allows an admin-role user on an adminOnly route', async () => {
    h.profile = { id: 'u5', email: 'support@x.co', is_business: false, role: 'admin' }
    renderGuard({ adminOnly: true })
    expect(await screen.findByText('תוכן מוגן')).toBeInTheDocument()
  })
})
