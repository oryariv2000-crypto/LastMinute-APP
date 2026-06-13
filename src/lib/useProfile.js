import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyProfile, getMyBusiness } from './db'

/**
 * useProfile — current user's profile (and optionally their business), served
 * from a SHARED react-query cache (`['my-profile']` / `['my-business']`). Because
 * every caller reads the same cache entry, editing the profile in one place
 * (e.g. the profile page) instantly updates it everywhere it's shown (e.g. the
 * navbar avatar) — `setProfile`/`setBusiness` write straight to that cache.
 *
 * @param {{ withBusiness?: boolean }} opts
 * @returns {{ profile, business, loading, error, setProfile, setBusiness }}
 */
export function useProfile({ withBusiness = false } = {}) {
  const qc = useQueryClient()

  const profileQ = useQuery({ queryKey: ['my-profile'], queryFn: getMyProfile })
  const businessQ = useQuery({
    queryKey: ['my-business'],
    queryFn: getMyBusiness,
    enabled: withBusiness,
  })

  // Accept either a new value or an updater fn, mirroring useState's setter so
  // existing callers (setProfile(obj) and setProfile(p => ...)) keep working.
  const setProfile = (next) =>
    qc.setQueryData(['my-profile'], (prev) => (typeof next === 'function' ? next(prev) : next))
  const setBusiness = (next) =>
    qc.setQueryData(['my-business'], (prev) => (typeof next === 'function' ? next(prev) : next))

  return {
    profile: profileQ.data ?? null,
    business: withBusiness ? (businessQ.data ?? null) : null,
    loading: profileQ.isLoading || (withBusiness && businessQ.isLoading),
    error: profileQ.error?.message || businessQ.error?.message || '',
    setProfile,
    setBusiness,
  }
}
