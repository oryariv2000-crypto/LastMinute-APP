import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * ProtectedRoute — Guards routes that require an authenticated user.
 *
 * Checks the current Supabase session on mount and listens for auth
 * changes. While the session is being resolved it renders nothing;
 * if there is no logged-in user it redirects to /login, otherwise it
 * renders its children.
 */
export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // Still resolving the session — render nothing to avoid a flash.
  if (session === undefined) return null

  // No active user — bounce to login.
  if (!session) return <Navigate to="/login" replace />

  return children
}
