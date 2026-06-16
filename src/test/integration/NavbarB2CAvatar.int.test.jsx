import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// The profile the shared react-query cache will serve. Mutated per test so we
// can simulate "the user already has a picture" and "the picture just changed".
const h = vi.hoisted(() => ({ profile: { id: 'u1', full_name: 'דנה', is_business: false } }))
vi.mock('../../lib/db', () => ({
  getBusinessesForMap: async () => [],
  getMyProfile: async () => h.profile,
  getMyBusiness: async () => null,
}))

import NavbarB2C from '../../components/NavbarB2C/NavbarB2C'

function renderNavbar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<NavbarB2C userName="דנה" showSearch={false} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...utils, client }
}

beforeEach(() => {
  h.profile = { id: 'u1', full_name: 'דנה', is_business: false }
})

describe('NavbarB2C — profile avatar', () => {
  it('shows initials when the profile has no picture', async () => {
    renderNavbar()
    const link = await screen.findByRole('link', { name: /פרופיל/ })
    await waitFor(() => expect(link).toHaveTextContent('ד'))
    expect(link.querySelector('img')).toBeNull()
  })

  it('renders the profile picture in the navbar avatar when avatar_url is set', async () => {
    h.profile = { ...h.profile, avatar_url: 'https://cdn.example/u1/avatar.png' }
    renderNavbar()
    const link = await screen.findByRole('link', { name: /פרופיל/ })
    const img = await waitFor(() => {
      const el = link.querySelector('img')
      expect(el).not.toBeNull()
      return el
    })
    expect(img).toHaveAttribute('src', 'https://cdn.example/u1/avatar.png')
  })

  it('updates instantly when the shared profile cache changes (no reload)', async () => {
    const { client } = renderNavbar()
    // Starts with initials, no picture.
    const link = await screen.findByRole('link', { name: /פרופיל/ })
    await waitFor(() => expect(link.querySelector('img')).toBeNull())

    // Simulate a profile-picture update writing the shared ['my-profile'] cache,
    // exactly as B2CProfilePage's onAvatarChange does.
    client.setQueryData(['my-profile'], (p) => ({ ...p, avatar_url: 'https://cdn.example/u1/new.png' }))

    await waitFor(() => {
      const img = link.querySelector('img')
      expect(img).not.toBeNull()
      expect(img).toHaveAttribute('src', 'https://cdn.example/u1/new.png')
    })
  })
})
