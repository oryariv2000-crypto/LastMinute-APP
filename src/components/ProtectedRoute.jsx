import { Navigate } from 'react-router-dom'
import { useSession } from '../lib/useSession'
import { useProfile } from '../lib/useProfile'
import { isAdmin } from '../lib/support'
import Loader from './Loader/Loader'

/**
 * ProtectedRoute — Guards routes that require an authenticated user, optionally
 * with the B2B capability (`is_business`) or the support-team email allowlist.
 *
 * Auth is decided from the SESSION (useSession → getSession, no network), so
 * navigating between protected pages is instant and never flashes the loader,
 * and a transient network blip can't masquerade as "logged out". The profile
 * row is only fetched when a route's capability gate actually needs it
 * (requireBusiness / adminOnly) — plain authenticated routes don't wait on it.
 *
 * The profile, when needed, is read from the SHARED react-query cache via
 * useProfile() (db.js → getMyProfile, RLS-scoped to the caller), the same
 * ['my-profile'] entry the navbar/profile pages populate — so the gate adds no
 * extra round-trip per navigation.
 *
 * Rendering:
 *   - first session hydration → branded page loader (once, on first paint)
 *   - no session              → redirect to /login
 *   - capability route, profile still loading → page loader
 *   - capability route, profile failed to load (but session is valid) → inline
 *     retry (NOT a /login bounce — that would ping-pong with LoginPage, which
 *     now redirects authenticated users straight back here)
 *
 * @param {boolean} [requireBusiness] - when true, only users with `is_business`
 *        true are allowed. When false/omitted, any authenticated user is allowed.
 * @param {boolean} [adminOnly] - restrict to the support-team email allowlist.
 */
export default function ProtectedRoute({ children, requireBusiness = false, adminOnly = false }) {
  const { session, initializing } = useSession()
  const needsProfile = requireBusiness || adminOnly
  // Fetch the profile only for capability routes, and only once we have a
  // session to scope it to. Hooks stay unconditional; `enabled` controls work.
  const { profile, loading: profileLoading, error: profileError } =
    useProfile({ enabled: needsProfile && !!session })

  // First paint — still resolving whether there's a session at all.
  if (initializing) return <Loader fullscreen label="טוען…" />

  // Nobody to authorize → login.
  if (!session) return <Navigate to="/login" replace />

  // Plain authenticated route (B2C / shared): a valid session is enough.
  if (!needsProfile) return children

  // Capability route — we need the profile row to authorize.
  if (profileLoading) return <Loader fullscreen label="טוען…" />

  // Profile failed to load while the session is valid: this is a data error,
  // not an auth failure. Bouncing to /login would loop (LoginPage sends an
  // authenticated user right back), so surface a retry instead.
  if (profileError || !profile) {
    return (
      <div role="alert" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', gap: 12, textAlign: 'center', padding: 24 }} dir="rtl">
        <p>אירעה שגיאה בטעינת הפרופיל.</p>
        <button type="button" onClick={() => window.location.reload()}>נסה שוב</button>
      </div>
    )
  }

  // Admin-only route — gate by the support-team allowlist.
  if (adminOnly) {
    if (!isAdmin(profile)) {
      return <Navigate to={profile.is_business ? '/b2b/dashboard' : '/b2c/home'} replace />
    }
    return children
  }

  // B2B capability gate — non-business users go finish business onboarding.
  if (requireBusiness && profile.is_business !== true) {
    return <Navigate to="/b2c/open-business" replace />
  }

  return children
}
