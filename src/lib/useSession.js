import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

/**
 * useSession — the single source of truth for "is there a logged-in user?".
 *
 * The session is resolved ONCE for the whole app from `getSession()` (reads the
 * token straight from storage — NO network) and then kept in sync via
 * `onAuthStateChange`. It lives in a module-level store read through
 * `useSyncExternalStore`, so every consumer — and every remount caused by route
 * navigation — reads the SAME already-resolved value synchronously.
 *
 * Why this matters: when each hook instance called `getSession()` itself, every
 * protected-route remount started in an `initializing` state and flashed a
 * full-screen loader (and the login form flashed before a remember-me redirect).
 * With one shared store, `initializing` is true only on the very first paint of
 * the app — never again on navigation — so route guards decide instantly and
 * transitions are seamless.
 *
 * @returns {{ session: import('@supabase/supabase-js').Session | null, initializing: boolean }}
 */

// undefined = still hydrating the first getSession; null = resolved, no session.
let snapshot
let started = false
const listeners = new Set()

function emit() {
  for (const l of listeners) l()
}

function start() {
  if (started) return
  started = true
  // One-time hydration from storage (no network).
  supabase.auth.getSession().then(({ data }) => {
    snapshot = data.session ?? null
    emit()
  })
  // One global subscription for the app's lifetime. Fires on SIGNED_IN /
  // SIGNED_OUT / TOKEN_REFRESHED — including the session detectSessionInUrl
  // establishes after the Google OAuth redirect.
  supabase.auth.onAuthStateChange((_event, next) => {
    snapshot = next ?? null
    emit()
  })
}

function subscribe(onChange) {
  start()
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

function getSnapshot() {
  return snapshot
}

export function useSession() {
  const session = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { session: session ?? null, initializing: session === undefined }
}
