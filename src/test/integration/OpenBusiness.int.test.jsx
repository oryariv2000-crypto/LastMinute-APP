import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// Mutable handle so each test can configure the mock behaviour.
const h = vi.hoisted(() => ({ createMyBusiness: null }))

vi.mock('../../lib/db', () => ({
  createMyBusiness: (...args) => h.createMyBusiness(...args),
}))

// useAppMode is a hook that reads/writes localStorage. Mock it so we can
// verify setMode is called without touching real storage.
const mockSetMode = vi.fn()
vi.mock('../../lib/useAppMode', () => ({
  useAppMode: () => ({ mode: 'shopping', setMode: mockSetMode, toggle: vi.fn() }),
}))

import OpenBusinessPage from '../../pages/OpenBusinessPage'

function renderPage(locationState = {}) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/b2c/open-business', state: locationState }]}>
      <Routes>
        <Route path="/b2c/open-business" element={<OpenBusinessPage />} />
        <Route path="/b2b/dashboard" element={<div>דשבורד עסקי</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  h.createMyBusiness = vi.fn(async () => ({ id: 'biz-1', name: 'הפינה של מיכל' }))
  mockSetMode.mockClear()
})

describe('OpenBusinessPage', () => {
  it('renders the business creation form with required fields', () => {
    renderPage()
    expect(screen.getByLabelText(/שם העסק/)).toBeInTheDocument()
    expect(screen.getByLabelText(/כתובת/)).toBeInTheDocument()
    expect(screen.getByLabelText(/טלפון/)).toBeInTheDocument()
  })

  it('calls createMyBusiness with form values and navigates to /b2b/dashboard on success', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText(/שם העסק/), 'הפינה של מיכל')
    await userEvent.type(screen.getByLabelText(/כתובת/), 'רחוב דיזנגוף 50, תל אביב')
    await userEvent.type(screen.getByLabelText(/טלפון/), '0501234567')

    // Select a business type from the <select>
    const typeSelect = screen.getByRole('combobox')
    await userEvent.selectOptions(typeSelect, 'cafe')

    await userEvent.click(screen.getByRole('button', { name: /צור עסק|הקמת עסק|שמור|המשך/i }))

    expect(h.createMyBusiness).toHaveBeenCalledWith({
      name: 'הפינה של מיכל',
      address: 'רחוב דיזנגוף 50, תל אביב',
      businessType: 'cafe',
      phone: '0501234567',
    })

    expect(await screen.findByText('דשבורד עסקי')).toBeInTheDocument()
    expect(mockSetMode).toHaveBeenCalledWith('business')
  })

  it('shows an inline Hebrew error and does NOT navigate on createMyBusiness failure', async () => {
    h.createMyBusiness = vi.fn(async () => {
      throw new Error('שם העסק נדרש')
    })

    renderPage()

    await userEvent.type(screen.getByLabelText(/שם העסק/), 'הפינה של מיכל')
    await userEvent.type(screen.getByLabelText(/כתובת/), 'רחוב ראשי 1')
    await userEvent.type(screen.getByLabelText(/טלפון/), '0501234567')

    const typeSelect = screen.getByRole('combobox')
    await userEvent.selectOptions(typeSelect, 'cafe')

    await userEvent.click(screen.getByRole('button', { name: /צור עסק|הקמת עסק|שמור|המשך/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('שם העסק נדרש')
    expect(screen.queryByText('דשבורד עסקי')).not.toBeInTheDocument()
  })

  it('pre-fills fields from location.state.prefill when provided', () => {
    renderPage({
      prefill: {
        name: 'קפה הבוקר',
        address: 'שדרות רוטשילד 10',
        businessType: 'cafe',
        phone: '0521234567',
      },
    })

    expect(screen.getByLabelText(/שם העסק/).value).toBe('קפה הבוקר')
    expect(screen.getByLabelText(/כתובת/).value).toBe('שדרות רוטשילד 10')
    expect(screen.getByLabelText(/טלפון/).value).toBe('0521234567')
  })

  it('disables the submit button while in flight', async () => {
    let resolve
    h.createMyBusiness = vi.fn(() => new Promise(r => { resolve = r }))

    renderPage()

    await userEvent.type(screen.getByLabelText(/שם העסק/), 'בדיקה')
    await userEvent.type(screen.getByLabelText(/כתובת/), 'כתובת')
    await userEvent.type(screen.getByLabelText(/טלפון/), '0501234567')
    const typeSelect = screen.getByRole('combobox')
    await userEvent.selectOptions(typeSelect, 'cafe')

    const btn = screen.getByRole('button', { name: /צור עסק|הקמת עסק|שמור|המשך/i })
    await userEvent.click(btn)

    expect(btn).toBeDisabled()
    // resolve to avoid act() warnings
    resolve({ id: 'b1' })
  })
})
