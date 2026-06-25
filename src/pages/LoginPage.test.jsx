import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

// ── Mocks: session, profile, supabase ───────────────────────────
const h = vi.hoisted(() => ({
  session: null,
  initializing: false,
  profile: null,
  profileLoading: false,
  signInWithPassword: vi.fn(),
  single: vi.fn(),
}))

vi.mock('../lib/useSession', () => ({
  useSession: () => ({ session: h.session, initializing: h.initializing }),
}))
vi.mock('../lib/useProfile', () => ({
  useProfile: () => ({ profile: h.profile, loading: h.profileLoading }),
}))
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { signInWithPassword: h.signInWithPassword, signInWithOAuth: vi.fn() },
    from: () => ({ select: () => ({ eq: () => ({ single: h.single }) }) }),
  },
}))

import LoginPage from './LoginPage'

function LocationMarker() {
  const loc = useLocation()
  return <div data-testid="loc">{loc.pathname}</div>
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/b2b/dashboard" element={<LocationMarker />} />
        <Route path="/b2c/home" element={<LocationMarker />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  // AuthForm persists the "remember me" email to localStorage on submit; clear
  // it so one test's email doesn't prefill (and corrupt) the next test's input.
  localStorage.clear()
  h.session = null
  h.initializing = false
  h.profile = null
  h.profileLoading = false
  h.signInWithPassword.mockReset()
  h.single.mockReset()
})

describe('LoginPage — routes by capability (is_business), not the role string', () => {
  it('redirects an already-authenticated business-capable user to the dashboard', async () => {
    h.session = { user: { id: 'u1' } }
    h.profile = { is_business: true } // no role string at all
    renderLogin()
    expect(await screen.findByTestId('loc')).toHaveTextContent('/b2b/dashboard')
  })

  it('redirects an already-authenticated customer to the home feed', async () => {
    h.session = { user: { id: 'u1' } }
    h.profile = { is_business: false }
    renderLogin()
    expect(await screen.findByTestId('loc')).toHaveTextContent('/b2c/home')
  })

  it('after login, routes a business-capable user to the dashboard', async () => {
    h.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    h.single.mockResolvedValue({ data: { is_business: true }, error: null })
    renderLogin()
    await userEvent.type(screen.getByLabelText(/אימייל/), 'owner@last.co')
    await userEvent.type(screen.getByLabelText(/^סיסמה/), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: 'כניסה' }))
    expect(await screen.findByTestId('loc')).toHaveTextContent('/b2b/dashboard')
  })

  it('after login, routes a customer to the home feed', async () => {
    h.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    h.single.mockResolvedValue({ data: { is_business: false }, error: null })
    renderLogin()
    await userEvent.type(screen.getByLabelText(/אימייל/), 'cust@last.co')
    await userEvent.type(screen.getByLabelText(/^סיסמה/), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: 'כניסה' }))
    expect(await screen.findByTestId('loc')).toHaveTextContent('/b2c/home')
  })
})
