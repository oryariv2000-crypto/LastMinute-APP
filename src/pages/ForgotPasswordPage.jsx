import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import InputField from '../components/InputField/InputField'
import SubmitButton from '../components/SubmitButton/SubmitButton'
import Turnstile from '../components/Turnstile/Turnstile'
import { supabase } from '../lib/supabase'
import BrandLogo from '../components/BrandLogo/BrandLogo'
import './AuthPage.css'

/**
 * ForgotPasswordPage — request a password-reset email. Supabase sends a link
 * back to /reset-password (configure that URL in Auth → URL Configuration).
 *
 * Route: /forgot-password
 */
export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [sent, setSent]       = useState(false)
  const [captchaToken, setCaptchaToken] = useState(undefined)
  const turnstileRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('כתובת אימייל לא תקינה')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
        captchaToken,
      })
      if (resetError) { setError(resetError.message); return }
      setSent(true)
    } catch (err) {
      setError(err?.message || 'שליחת המייל נכשלה, נסו שוב')
    } finally {
      setLoading(false)
      turnstileRef.current?.reset()
    }
  }

  return (
    <div className="auth-page" dir="rtl">
      <div className="auth-page__card">
        <div className="auth-page__brand">
          <BrandLogo tone="dark" size="lg" />
        </div>

        <div className="auth-page__header">
          <h1 className="auth-page__title text-headline-lg">שחזור סיסמה</h1>
          <p className="auth-page__subtitle text-body-md">
            נשלח אליך קישור לאיפוס הסיסמה
          </p>
        </div>

        {sent ? (
          <div
            role="status"
            style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 'var(--space-4)' }}
          >
            <span aria-hidden="true" style={{ fontSize: 40 }}>📩</span>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              אם הכתובת קיימת אצלנו — נשלח אליה קישור לאיפוס. בדקו את תיבת המייל.
            </p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && <p className="auth-form__error" role="alert">{error}</p>}
            <InputField
              id="forgot-email"
              label="אימייל"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <Turnstile ref={turnstileRef} onToken={setCaptchaToken} />
            <SubmitButton loading={loading}>שליחת קישור</SubmitButton>
          </form>
        )}

        <div className="auth-page__divider" aria-hidden="true"><span>או</span></div>
        <p className="auth-page__switch text-label-md">
          נזכרת בסיסמה?{' '}
          <Link to="/login" className="auth-page__switch-link">חזרה לכניסה</Link>
        </p>
      </div>
    </div>
  )
}
