import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const h = vi.hoisted(() => ({ businesses: [] }))
vi.mock('../../lib/db', () => ({
  getBusinessesForMap: async () => h.businesses,
}))

import NavbarB2C from '../../components/NavbarB2C/NavbarB2C'

// Marker page that reveals what business the search navigated us to.
function ExploreMarker() {
  const { state } = useLocation()
  return <div>explore:{state?.focusBusinessId ?? 'none'}</div>
}

function renderNavbar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<NavbarB2C userName="דנה" />} />
          <Route path="/b2c/explore" element={<ExploreMarker />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  h.businesses = [
    { id: 'b1', name: 'ארומה אספרסו בר', address: 'מודיעין 7' },
    { id: 'b2', name: 'מאפיית הבוקר', address: 'תל אביב' },
  ]
})

describe('NavbarB2C — search autocomplete', () => {
  it('shows matching business suggestions as the user types', async () => {
    renderNavbar()
    await userEvent.type(screen.getByPlaceholderText(/חפש עסקים/), 'ארומה')
    expect(await screen.findByRole('button', { name: /ארומה אספרסו בר/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /מאפיית הבוקר/ })).not.toBeInTheDocument()
  })

  it('navigates to the map (with focusBusinessId) when a suggestion is picked', async () => {
    renderNavbar()
    await userEvent.type(screen.getByPlaceholderText(/חפש עסקים/), 'ארומה')
    await userEvent.click(await screen.findByRole('button', { name: /ארומה אספרסו בר/ }))
    expect(await screen.findByText('explore:b1')).toBeInTheDocument()
  })
})
