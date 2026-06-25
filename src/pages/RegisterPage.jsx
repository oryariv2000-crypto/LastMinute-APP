import { useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import RegisterFormB2C from '../components/RegisterFormB2C/RegisterFormB2C'
import GoogleSignInButton from '../components/GoogleSignInButton/GoogleSignInButton'
import Turnstile from '../components/Turnstile/Turnstile'
import { supabase } from '../lib/supabase'
import BrandLogo from '../components/BrandLogo/BrandLogo'
import './AuthPage.css'

/**
 * RegisterPage — Unified, single-step registration.
 *
 * Every new user signs up as a plain customer (role:'customer', is_business
 * false). There is no "customer vs business" choice up front — opening a
 * business happens later from the profile ("Open a Business Account").
 *
 * Business intent: a `?intent=business` query param (set by the landing page's
 * "I have a business" CTAs) only changes the post-signup redirect — it routes a
 * freshly-signed-up user straight into the onboarding flow instead of the
 * customer home. The account itself is still an ordinary customer.
 *
 * Route: /register  (with /register/b2c and /register/b2b redirecting here)
 */
export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const businessIntent = searchParams.get('intent') === 'business'

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [sent, setSent]       = useState(false) // email-confirmation pending
  const [captchaToken, setCaptchaToken] = useState(undefined)
  const turnstileRef = useRef(null)

  async function handleSubmit(data) {
    setLoading(true)
    setError('')
    try {
      // Create the auth user. The profile row in `users` is created server-side
      // by the handle_new_user trigger from this metadata (role:'customer' →
      // is_business stays false). Works with email confirmation on, where the
      // client has no session yet.
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: `${data.firstName} ${data.lastName}`.trim(), role: 'customer' },
          captchaToken,
        },
      })
      if (signUpError) {
        setError(signUpError.message)
        return
      }

      // No session ⇒ email confirmation is enabled — tell them to check email.
      if (!signUpData.session) {
        setSent(true)
        return
      }

      // Business intent jumps straight into onboarding; everyone else lands on
      // the customer home.
      navigate(businessIntent ? '/b2c/open-business' : '/b2c/home')
    } catch (err) {
      setError(err?.message || 'ההרשמה נכשלה, נסה שוב')
    } finally {
      setLoading(false)
      turnstileRef.current?.reset()
    }
  }

  return (
    <div className="auth-page" dir="rtl">
      <div className="auth-page__card">

        {/* Brand */}
        <div className="auth-page__brand">
          <BrandLogo tone="dark" size="lg" />
        </div>

        <div className="auth-page__header">
          <h1 className="auth-page__title text-headline-lg">הרשמה</h1>
          <p className="auth-page__subtitle text-body-md">
            מלא את הפרטים כדי להתחיל לחסוך
          </p>
        </div>

        {sent ? (
          <div
            className="auth-page__notice"
            role="status"
            style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 'var(--space-4)' }}
          >
            <span aria-hidden="true" style={{ fontSize: 40 }}>📩</span>
            <p style={{ margin: 0, lineHeight: 1.6 }}>שלחנו אליך מייל לאישור החשבון. אשרו אותו ואז התחברו.</p>
          </div>
        ) : (
          <>
            <RegisterFormB2C onSubmit={handleSubmit} loading={loading} error={error} />
            <Turnstile ref={turnstileRef} onToken={setCaptchaToken} />
          </>
        )}

        {/* Google OAuth */}
        <GoogleSignInButton label="הרשמה עם Google" />

        {/* Divider */}
        <div className="auth-page__divider" aria-hidden="true"><span>או</span></div>

        {/* Login link */}
        <p className="auth-page__switch text-label-md">
          כבר יש לך חשבון?{' '}
          <Link to="/login" className="auth-page__switch-link" id="go-login">
            כניסה
          </Link>
        </p>

      </div>
    </div>
  )
}
