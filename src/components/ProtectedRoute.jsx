import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Loader from './Loader/Loader'

/* Where each role belongs — used to bounce mismatched users home. */
const HOME_BY_ROLE = {
  customer: '/b2c/home',
  business_owner: '/b2b/dashboard',
}

/**
 * ProtectedRoute — Guards routes that require an authenticated user with a
 * specific role (strict B2C / B2B isolation per the ERD).
 *
 * Checks the current Supabase session on mount and listens for auth changes.
 * Alongside the session it fetches the user's `role` from the `users` table.
 * While auth/role is being resolved it renders nothing; with no session it
 * redirects to /login; if the role does not match `allowedRole` it redirects
 * the user to their own ecosystem; otherwise it renders its children.
 *
 * @param {'customer'|'business_owner'} allowedRole - role permitted on this route
 */
export default function ProtectedRoute({ children, allowedRole }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [role, setRole] = useState(undefined)       // undefined = loading

  useEffect(() => {
    let active = true

    // Resolve the session, then look up the user's role from the DB.
    async function resolve(currentSession) {
      if (!active) return
      setSession(currentSession)

      if (!currentSession?.user) {
        setRole(null)
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentSession.user.id)
        .single()

      if (active) setRole(error ? null : data?.role ?? null)
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      // Reset role to loading while we re-resolve it for the new session.
      setRole(undefined)
      resolve(s)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // Still resolving session or role — show the branded page loader.
  if (session === undefined || role === undefined) return <Loader fullscreen label="טוען…" />

  // No active user — bounce to login.
  if (!session) return <Navigate to="/login" replace />

  // Wrong ecosystem — send the user to their own home (falls back to login
  // if the role is missing/unrecognised).
  if (role !== allowedRole) {
    return <Navigate to={HOME_BY_ROLE[role] ?? '/login'} replace />
  }

  return children
}
