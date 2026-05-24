import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthForm from '../components/AuthForm/AuthForm'
import { supabase } from '../lib/supabase'
import './AuthPage.css'

/**
 * LoginPage — Full-page login screen.
 *
 * Route: /login
 */
export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const navigate = useNavigate()

  async function handleLogin(email, password) {
    setLoading(true)
    setError('')
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError || !data.user) {
        setError('אימייל או סיסמה שגויים')
        return
      }

      // Fetch the user's role to decide where to land them
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profileError) {
        setError('אירעה שגיאה בטעינת פרטי המשתמש')
        return
      }

      navigate(profile?.role === 'business_owner' ? '/b2b/dashboard' : '/b2c/home')
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
          <span className="auth-page__logo-mark" aria-hidden="true">🌿</span>
          <span className="auth-page__brand-name">Last Minute</span>
        </div>

        {/* Headline */}
        <div className="auth-page__header">
          <h1 className="auth-page__title text-headline-lg">ברוכים השבים!</h1>
          <p className="auth-page__subtitle text-body-md">
            כניסה לחשבון שלך
          </p>
        </div>

        {/* Form */}
        <AuthForm onSubmit={handleLogin} loading={loading} error={error} />

        {/* Divider */}
        <div className="auth-page__divider" aria-hidden="true">
          <span>או</span>
        </div>

        {/* Register link */}
        <p className="auth-page__switch text-label-md">
          עדיין אין לך חשבון?{' '}
          <Link to="/register/b2c" className="auth-page__switch-link" id="go-register">
            הרשמה
          </Link>
        </p>

      </div>
    </div>
  )
}
