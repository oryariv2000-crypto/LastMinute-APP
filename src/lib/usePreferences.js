import { useCallback, useEffect, useState } from 'react'

/**
 * usePreferences — customer UI preferences, persisted to localStorage.
 *
 * Frontend-only for now (survives refresh, no backend). When we wire the
 * backend this is the single seam to swap: load from / save to Supabase
 * (users/profiles + notify_* columns) instead of localStorage, keeping the
 * same { prefs, setPref } shape so the Profile UI doesn't change.
 */
const STORAGE_KEY = 'lm:prefs:v1'

export const DEFAULT_PREFS = {
  language: 'he',          // 'he' | 'en' | 'ar'
  region: 'מרכז',          // region label (see lib/regions.js)
  city: 'תל אביב',
  radiusKm: 5,             // search radius
  veganOnly: false,
  pushNotifs: true,
  emailDeals: true,
  addresses: [],           // string[] — saved pickup/delivery addresses
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState(load)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)) } catch { /* quota/private mode — ignore */ }
  }, [prefs])

  const setPref = useCallback((key, value) => {
    setPrefs((p) => ({ ...p, [key]: value }))
  }, [])

  return { prefs, setPref, setPrefs }
}
