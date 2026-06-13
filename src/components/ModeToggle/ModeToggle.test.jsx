import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import ModeToggle from './ModeToggle'

// ── Mock useAppMode ─────────────────────────────────────────────
const mockSetMode = vi.fn()

vi.mock('../../lib/useAppMode', () => ({
  useAppMode: () => ({ mode: 'shopping', setMode: mockSetMode, toggle: vi.fn() }),
}))

// ── Sentinel component to verify navigation ─────────────────────
function LocationMarker() {
  const loc = useLocation()
  return <div data-testid="location">{loc.pathname}</div>
}

function renderToggle(props, { initialRoute = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="*" element={<ModeToggle {...props} />} />
        <Route path="/b2b/dashboard" element={<LocationMarker />} />
        <Route path="/b2c/home" element={<LocationMarker />} />
        <Route path="/b2c/open-business" element={<LocationMarker />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockSetMode.mockClear()
})

describe('ModeToggle', () => {
  describe('isBusiness=true, current="shopping" (B2C shell)', () => {
    it('renders a button labelled "עבור למצב עסק"', () => {
      renderToggle({ isBusiness: true, current: 'shopping' })
      expect(screen.getByRole('button', { name: 'עבור למצב עסק' })).toBeInTheDocument()
    })

    it('calls setMode("business") and navigates to /b2b/dashboard on click', async () => {
      renderToggle({ isBusiness: true, current: 'shopping' })
      await userEvent.click(screen.getByRole('button', { name: 'עבור למצב עסק' }))
      expect(mockSetMode).toHaveBeenCalledWith('business')
      expect(screen.getByTestId('location')).toHaveTextContent('/b2b/dashboard')
    })
  })

  describe('isBusiness=true, current="business" (B2B shell)', () => {
    it('renders a button labelled "עבור למצב קנייה"', () => {
      renderToggle({ isBusiness: true, current: 'business' })
      expect(screen.getByRole('button', { name: 'עבור למצב קנייה' })).toBeInTheDocument()
    })

    it('calls setMode("shopping") and navigates to /b2c/home on click', async () => {
      renderToggle({ isBusiness: true, current: 'business' })
      await userEvent.click(screen.getByRole('button', { name: 'עבור למצב קנייה' }))
      expect(mockSetMode).toHaveBeenCalledWith('shopping')
      expect(screen.getByTestId('location')).toHaveTextContent('/b2c/home')
    })
  })

  describe('isBusiness=false (non-business user)', () => {
    it('renders a link "פתיחת עסק" to /b2c/open-business', () => {
      renderToggle({ isBusiness: false, current: 'shopping' })
      const link = screen.getByRole('link', { name: 'פתיחת עסק' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/b2c/open-business')
    })

    it('does not render a toggle button', () => {
      renderToggle({ isBusiness: false, current: 'shopping' })
      expect(screen.queryByRole('button', { name: /עבור למצב/ })).not.toBeInTheDocument()
    })
  })
})
