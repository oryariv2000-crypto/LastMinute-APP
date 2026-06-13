import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isAdminEmail } from '../lib/support'
import Loader from './Loader/Loader'

/**
 * ProtectedRoute — Guards routes that require an authenticated user, optionally
 * with the B2B capability (`is_business`).
 *
 * Checks the current Supabase session on mount and listens for auth changes.
 * Alongside the session it fetches the user's `is_business` from the `users`
 * table. While auth/profile is being resolved it renders the branded page
 * loader; with no session it redirects to /login; if `requireBusiness` is true
 * and the user does not have the B2B capability it redirects to /b2c/open-business;
 * otherwise it renders its children.
 *
 * @param {boolean} [requireBusiness] - when true, only users with `is_business`
 *        true are allowed. When false/omitted, any authenticated user is allowed.
 * @param {boolean} [adminOnly] - restrict to the support-team email allowlist.
 */
export default function ProtectedRoute({ children, requireBusiness = false, adminOnly = false }) {
  const [session, setSession] = useState(undefined)      // undefined = loading
  const [isBusiness, setIsBusiness] = useState(undefined) // undefined = loading

  useEffect(() => {
    let active = true

    // Resolve the session, then look up the user's business capability from the DB.
    async function resolve(currentSession) {
      if (!active) return
      setSession(currentSession)

      if (!currentSession?.user) {
        setIsBusiness(false)
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('is_business')
        .eq('id', currentSession.user.id)
        .single()

      if (active) {
        setIsBusiness(error ? false : data?.is_business === true)
      }
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      // Reset to loading while we re-resolve for the new session.
      setIsBusiness(undefined)
      resolve(s)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // Still resolving session or profile — show the branded page loader.
  if (session === undefined || isBusiness === undefined) return <Loader fullscreen label="טוען…" />

  // No active user — bounce to login.
  if (!session) return <Navigate to="/login" replace />

  // Admin-only route — gate by the support-team email allowlist.
  if (adminOnly) {
    if (!isAdminEmail(session.user?.email)) {
      return <Navigate to={isBusiness ? '/b2b/dashboard' : '/b2c/home'} replace />
    }
    return children
  }

  // B2B capability gate — non-business users are redirected to the business
  // onboarding page so they can finish setting up their business.
  if (requireBusiness && !isBusiness) {
    return <Navigate to="/b2c/open-business" replace />
  }

  // Any authenticated user is allowed (B2C routes or shared pages).
  return children
}
