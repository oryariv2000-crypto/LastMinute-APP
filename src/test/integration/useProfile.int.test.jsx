import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../lib/db', () => ({
  getMyProfile: async () => ({ id: 'u1', full_name: 'דנה כהן' }),
  getMyBusiness: async () => null,
}))

import { useProfile } from '../../lib/useProfile'

describe('useProfile — shared cache', () => {
  it('an edit in one consumer is reflected in another (no stale copies)', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>

    const a = renderHook(() => useProfile(), { wrapper })
    const b = renderHook(() => useProfile(), { wrapper })

    await waitFor(() => expect(a.result.current.profile?.full_name).toBe('דנה כהן'))
    await waitFor(() => expect(b.result.current.profile?.full_name).toBe('דנה כהן'))

    act(() => a.result.current.setProfile((p) => ({ ...p, full_name: 'דנה לוי' })))

    // The second consumer sees the update because they share the cache entry.
    await waitFor(() => expect(b.result.current.profile?.full_name).toBe('דנה לוי'))
  })
})
