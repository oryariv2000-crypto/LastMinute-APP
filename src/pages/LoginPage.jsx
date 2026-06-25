import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import AuthForm from '../components/AuthForm/AuthForm'
import GoogleSignInButton from '../components/GoogleSignInButton/GoogleSignInButton'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/useSession'
import { useProfile } from '../lib/useProfile'
import BrandLogo from '../components/BrandLogo/BrandLogo'
import Loader from '../components/Loader/Loader'
import './AuthPage.css'

// OAuth providers redirect back here. On success the URL carries `?code=…`
// (PKCE), which detectSessionInUrl exchanges for a session; on failure it
// carries `?error=…&error_description=…`. Read both from the live URL.
function readOAuthCallback() {
  const params = new URLSearchParams(window.location.search)
  return {
    hasCode: params.has('code'),
    errorDescription: params.get('error_description') || (params.get('error') ? 'ההתחברות עם Google נכשלה' : ''),
  }
}

/**
 * LoginPage — Full-page login screen.
 *
 * Route: /login
 */
export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const navigate = useNavigate()

  // Already-authenticated users must not be parked on the login form — this is
  // the path both a "remember me" return visit AND the Google OAuth round-trip
  // land on. Decide from the session (no network); fetch the profile only to
  // pick the capability-correct home.
  const { session, initializing } = useSession()
  const { profile, loading: profileLoading } = useProfile({ enabled: !!session })
  const { errorDescription } = readOAuthCallback()

  // Still hydrating the session (first paint, a remember-me return visit, or the
  // OAuth code exchange in flight) — hold the loader so the form never flashes
  // before we know whether to redirect an already-authenticated user.
  if (initializing) return <Loader fullscreen />

  if (session) {
    if (profileLoading) return <Loader fullscreen />
    // Route by the is_business capability, not the role string: a customer who
    // later opened a business keeps role:'customer' but is_business:true.
    const dest = profile?.is_business === true ? '/b2b/dashboard' : '/b2c/home'
    return <Navigate to={dest} replace />
  }

  async function handleLogin(email, password, { captchaToken } = {}) {
    setLoading(true)
    setError('')
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      })
      if (signInError || !data.user) {
        setError('אימייל או סיסמה שגויים')
        return
      }

      // Fetch the user's capability to decide where to land them.
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('is_business')
        .eq('id', data.user.id)
        .single()

      if (profileError) {
        setError('אירעה שגיאה בטעינת פרטי המשתמש')
        return
      }

      navigate(profile?.is_business === true ? '/b2b/dashboard' : '/b2c/home')
    } catch {
      setError('אימייל או סיסמה שגויים')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" dir="rtl">
      <div className="auth-page__card">

        {/* Brand header */}
        <div className="auth-page__brand" aria-label="Last Minute — דף ראשי">
          <BrandLogo tone="dark" size="lg" />
        </div>

        {/* Headline */}
        <div className="auth-page__header">
          <h1 className="auth-page__title text-headline-lg">ברוכים השבים!</h1>
          <p className="auth-page__subtitle text-body-md">
            כניסה לחשבון שלך
          </p>
        </div>

        {/* Form */}
        <AuthForm onSubmit={handleLogin} loading={loading} error={error || errorDescription} />

        {/* Google OAuth */}
        <GoogleSignInButton />

        {/* Divider */}
        <div className="auth-page__divider" aria-hidden="true">
          <span>או</span>
        </div>

        {/* Register link */}
        <p className="auth-page__switch text-label-md">
          עדיין אין לך חשבון?{' '}
          <Link to="/register" className="auth-page__switch-link" id="go-register">
            הרשמה
          </Link>
        </p>

      </div>
    </div>
  )
}
