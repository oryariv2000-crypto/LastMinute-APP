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
  describe('isBusiness=true — segmented switch', () => {
    it('renders both mode segments', () => {
      renderToggle({ isBusiness: true, current: 'shopping' })
      expect(screen.getByRole('button', { name: 'קנייה' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'עסק' })).toBeInTheDocument()
    })

    it('marks the current shell (shopping) as the active/pressed segment', () => {
      renderToggle({ isBusiness: true, current: 'shopping' })
      expect(screen.getByRole('button', { name: 'קנייה' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'עסק' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('switches to business: setMode("business") + navigates to /b2b/dashboard', async () => {
      renderToggle({ isBusiness: true, current: 'shopping' })
      await userEvent.click(screen.getByRole('button', { name: 'עסק' }))
      expect(mockSetMode).toHaveBeenCalledWith('business')
      expect(screen.getByTestId('location')).toHaveTextContent('/b2b/dashboard')
    })

    it('switches to shopping from the business shell: setMode("shopping") + /b2c/home', async () => {
      renderToggle({ isBusiness: true, current: 'business' })
      expect(screen.getByRole('button', { name: 'עסק' })).toHaveAttribute('aria-pressed', 'true')
      await userEvent.click(screen.getByRole('button', { name: 'קנייה' }))
      expect(mockSetMode).toHaveBeenCalledWith('shopping')
      expect(screen.getByTestId('location')).toHaveTextContent('/b2c/home')
    })

    it('tapping the already-active segment is a no-op (no mode change, no navigation)', async () => {
      renderToggle({ isBusiness: true, current: 'shopping' })
      await userEvent.click(screen.getByRole('button', { name: 'קנייה' }))
      expect(mockSetMode).not.toHaveBeenCalled()
    })
  })

  describe('isBusiness=false — renders nothing', () => {
    // Customers without a business don't see the switch at all; their entry into
    // the business world lives in the profile page, not a per-page header CTA.
    it('renders no switch and no open-business link', () => {
      const { container } = renderToggle({ isBusiness: false, current: 'shopping' })
      expect(container).toBeEmptyDOMElement()
      expect(screen.queryByRole('button', { name: 'עסק' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'קנייה' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'פתיחת עסק' })).not.toBeInTheDocument()
    })
  })
})
