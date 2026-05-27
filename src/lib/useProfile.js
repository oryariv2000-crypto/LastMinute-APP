import { useEffect, useState } from 'react'
import { getMyProfile, getMyBusiness } from './db'

/**
 * useProfile — Loads the current user's profile (and optionally their
 * business) once on mount. Used to feed real names/avatars into the navbars
 * and profile screens.
 *
 * @param {{ withBusiness?: boolean }} opts
 * @returns {{ profile, business, loading, error, setProfile, setBusiness }}
 */
export function useProfile({ withBusiness = false } = {}) {
  const [profile, setProfile]   = useState(null)
  const [business, setBusiness] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const p = await getMyProfile()
        if (active) setProfile(p)
        if (withBusiness) {
          const b = await getMyBusiness()
          if (active) setBusiness(b)
        }
      } catch (err) {
        if (active) setError(err?.message || 'שגיאה בטעינת הפרופיל')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [withBusiness])

  return { profile, business, loading, error, setProfile, setBusiness }
}
