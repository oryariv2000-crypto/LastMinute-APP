import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import RoleSelector from '../components/RoleSelector/RoleSelector'
import RegisterFormB2C from '../components/RegisterFormB2C/RegisterFormB2C'
import './AuthPage.css'

/**
 * B2CRegisterPage — Two-step registration for customers.
 *
 * Step 1: RoleSelector (choose B2C — pre-selected here, user can switch to B2B)
 * Step 2: RegisterFormB2C
 *
 * Route: /register/b2c
 */
export default function B2CRegisterPage() {
  const [step, setStep]       = useState(1)   // 1 = role, 2 = form
  const [role, setRole]       = useState('b2c')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function handleRoleNext() {
    if (role === 'b2b') {
      navigate('/register/b2b')
      return
    }
    setStep(2)
  }

  async function handleSubmit(data) {
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 1400))
      console.log('B2C Register:', data)
      navigate('/b2c/home')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" dir="rtl">
      <div className="auth-page__card">

        {/* Brand */}
        <div className="auth-page__brand">
          <span className="auth-page__logo-mark" aria-hidden="true">🌿</span>
          <span className="auth-page__brand-name">Last Minute</span>
        </div>

        {/* Step indicators */}
        <div className="auth-page__step-indicator" aria-label={`שלב ${step} מתוך 2`}>
          <span
            className={`auth-page__step-dot${step === 1 ? ' auth-page__step-dot--active' : ''}`}
          />
          <span
            className={`auth-page__step-dot${step === 2 ? ' auth-page__step-dot--active' : ''}`}
          />
          <span style={{ marginInlineStart: 4 }}>שלב {step} מתוך 2</span>
        </div>

        {/* ── Step 1: Role selection */}
        {step === 1 && (
          <>
            <div className="auth-page__header">
              <h1 className="auth-page__title text-headline-lg">הרשמה</h1>
              <p className="auth-page__subtitle text-body-md">בחר את סוג החשבון שלך</p>
            </div>

            <RoleSelector value={role} onChange={setRole} />

            <button
              id="b2c-role-next-btn"
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', minHeight: 52 }}
              onClick={handleRoleNext}
              disabled={!role}
            >
              המשך
            </button>
          </>
        )}

        {/* ── Step 2: Registration form */}
        {step === 2 && (
          <>
            <div className="auth-page__header">
              <button
                className="auth-page__back-btn"
                id="b2c-register-back"
                type="button"
                onClick={() => setStep(1)}
                aria-label="חזרה לבחירת סוג חשבון"
              >
                <ChevronRightIcon /> חזרה
              </button>
              <h1 className="auth-page__title text-headline-lg">יצירת חשבון לקוח</h1>
              <p className="auth-page__subtitle text-body-md">
                מלא את הפרטים כדי להתחיל לחסוך
              </p>
            </div>

            <RegisterFormB2C onSubmit={handleSubmit} loading={loading} />
          </>
        )}

        {/* Divider */}
        <div className="auth-page__divider" aria-hidden="true"><span>או</span></div>

        {/* Login link */}
        <p className="auth-page__switch text-label-md">
          כבר יש לך חשבון?{' '}
          <Link to="/login" className="auth-page__switch-link" id="go-login-from-b2c">
            כניסה
          </Link>
        </p>

      </div>
    </div>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
