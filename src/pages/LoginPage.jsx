import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthForm from '../components/AuthForm/AuthForm'
import './AuthPage.css'

/**
 * LoginPage — Full-page login screen.
 *
 * Route: /login
 */
export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(email, password) {
    setLoading(true)
    try {
      // TODO: replace with real API call
      await new Promise(r => setTimeout(r, 1200))
      console.log('Login with:', email, password)
      navigate('/b2c/home')
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
        <AuthForm onSubmit={handleLogin} loading={loading} />

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
