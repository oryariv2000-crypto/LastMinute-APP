import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

// ── Mock supabase auth ──────────────────────────────────────────
const h = vi.hoisted(() => ({ signUp: vi.fn() }))
vi.mock('../lib/supabase', () => ({
  supabase: { auth: { signUp: h.signUp, signInWithOAuth: vi.fn() } },
}))

import RegisterPage from './RegisterPage'

function LocationMarker() {
  const loc = useLocation()
  return <div data-testid="loc">{loc.pathname}</div>
}

function renderPage(initialRoute = '/register') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/b2c/home" element={<LocationMarker />} />
        <Route path="/b2c/open-business" element={<LocationMarker />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillValid() {
  await userEvent.type(screen.getByLabelText(/שם פרטי/), 'דנה')
  await userEvent.type(screen.getByLabelText(/שם משפחה/), 'כהן')
  await userEvent.type(screen.getByLabelText(/אימייל/), 'dana@last.co')
  await userEvent.type(screen.getByLabelText(/^סיסמה/), 'secret123')
  await userEvent.type(screen.getByLabelText(/אימות סיסמה/), 'secret123')
}

beforeEach(() => {
  h.signUp.mockReset()
})

describe('RegisterPage (unified signup)', () => {
  it('renders one unified form with no role selector step', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'יצירת חשבון' })).toBeInTheDocument()
    // The old 2-step role picker is gone.
    expect(screen.queryByText('בחר את סוג החשבון שלך')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'בחירת סוג חשבון' })).not.toBeInTheDocument()
  })

  it('signs up every user as role:customer', async () => {
    h.signUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null })
    renderPage()
    await fillValid()
    await userEvent.click(screen.getByRole('button', { name: 'יצירת חשבון' }))
    expect(h.signUp).toHaveBeenCalledOnce()
    const arg = h.signUp.mock.calls[0][0]
    expect(arg.email).toBe('dana@last.co')
    expect(arg.options.data).toMatchObject({ role: 'customer', full_name: 'דנה כהן' })
  })

  it('routes to /b2c/home after signup when a session is returned and no intent', async () => {
    h.signUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null })
    renderPage('/register')
    await fillValid()
    await userEvent.click(screen.getByRole('button', { name: 'יצירת חשבון' }))
    expect(await screen.findByTestId('loc')).toHaveTextContent('/b2c/home')
  })

  it('routes to /b2c/open-business after signup when intent=business', async () => {
    h.signUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null })
    renderPage('/register?intent=business')
    await fillValid()
    await userEvent.click(screen.getByRole('button', { name: 'יצירת חשבון' }))
    expect(await screen.findByTestId('loc')).toHaveTextContent('/b2c/open-business')
  })

  it('shows the check-email notice when no session is returned (email confirmation on)', async () => {
    h.signUp.mockResolvedValue({ data: { session: null }, error: null })
    renderPage()
    await fillValid()
    await userEvent.click(screen.getByRole('button', { name: 'יצירת חשבון' }))
    expect(await screen.findByText(/שלחנו אליך מייל/)).toBeInTheDocument()
  })
})
