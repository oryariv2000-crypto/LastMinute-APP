import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import RoleSelector from '../components/RoleSelector/RoleSelector'
import RegisterFormB2C from '../components/RegisterFormB2C/RegisterFormB2C'
import { supabase } from '../lib/supabase'
import BrandLogo from '../components/BrandLogo/BrandLogo'
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
  const navigate = useNavigate()
  const location = useLocation()
  // If we arrived here from a role switch, jump straight to the form (step 2).
  const [step, setStep]       = useState(location.state?.goToForm ? 2 : 1)
  const [role, setRole]       = useState('b2c')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [sent, setSent]       = useState(false) // email-confirmation pending

  // One "המשך" click: switch to the chosen ecosystem's form, no double step.
  function handleRoleNext() {
    if (role === 'b2b') {
      navigate('/register/b2b', { state: { goToForm: true } })
      return
    }
    setStep(2)
  }

  async function handleSubmit(data) {
    setLoading(true)
    setError('')
    try {
      // Create the auth user. The profile row in `users` is created server-side
      // by the handle_new_user trigger from this metadata (works with email
      // confirmation on, where the client has no session yet).
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: `${data.firstName} ${data.lastName}`.trim(), role: 'customer' },
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

      navigate('/b2c/home')
    } catch (err) {
      setError(err?.message || 'ההרשמה נכשלה, נסה שוב')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" dir="rtl">
      <div className="auth-page__card">

        {/* Brand */}
        <div className="auth-page__brand">
          <BrandLogo tone="dark" size="lg" />
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
              <RegisterFormB2C onSubmit={handleSubmit} loading={loading} error={error} />
            )}
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
