import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import RoleSelector from '../components/RoleSelector/RoleSelector'
import RegisterFormB2B from '../components/RegisterFormB2B/RegisterFormB2B'
import { supabase } from '../lib/supabase'
import BrandLogo from '../components/BrandLogo/BrandLogo'
import './AuthPage.css'

/**
 * B2BRegisterPage — Two-step registration for business owners.
 *
 * Step 1: RoleSelector (pre-selects B2B, can switch to B2C)
 * Step 2: RegisterFormB2B
 *
 * Route: /register/b2b
 */
export default function B2BRegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep]       = useState(location.state?.goToForm ? 2 : 1)
  const [role, setRole]       = useState('b2b')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [sent, setSent]       = useState(false) // email-confirmation pending

  function handleRoleNext() {
    if (role === 'b2c') {
      navigate('/register/b2c', { state: { goToForm: true } })
      return
    }
    setStep(2)
  }

  async function handleSubmit(data) {
    setLoading(true)
    setError('')
    try {
      // Create the auth user. The `users` profile row (role=business_owner) is
      // created server-side by the handle_new_user trigger from this metadata.
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.ownerName, role: 'business_owner' },
        },
      })
      if (signUpError) {
        setError(signUpError.message)
        return
      }

      // No session ⇒ email confirmation on. No business data is written here —
      // the user will complete business setup via OpenBusinessPage after
      // confirming their email and logging in (requireBusiness routes now
      // redirect there automatically).
      if (!signUpData.session) {
        setSent(true)
        return
      }

      // Session exists → hand off to OpenBusinessPage with the business details
      // pre-filled so the user completes setup in one step.
      navigate('/b2b/open-business', {
        state: {
          prefill: {
            name:         data.businessName,
            address:      data.address,
            businessType: data.businessType,
            phone:        data.phone,
          },
        },
      })
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
              id="b2b-role-next-btn"
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

        {/* ── Step 2: Business registration form */}
        {step === 2 && (
          <>
            <div className="auth-page__header">
              <button
                className="auth-page__back-btn"
                id="b2b-register-back"
                type="button"
                onClick={() => setStep(1)}
                aria-label="חזרה לבחירת סוג חשבון"
              >
                <ChevronRightIcon /> חזרה
              </button>
              <h1 className="auth-page__title text-headline-lg">יצירת חשבון עסקי</h1>
              <p className="auth-page__subtitle text-body-md">
                הצטרף לעסקים שמפחיתים בזבוז מזון ומרוויחים יותר
              </p>
            </div>

            {sent ? (
              <div
                className="auth-page__notice"
                role="status"
                style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 'var(--space-4)' }}
              >
                <span aria-hidden="true" style={{ fontSize: 40 }}>📩</span>
                <p style={{ margin: 0, lineHeight: 1.6 }}>שלחנו אליך מייל לאישור החשבון. אשרו אותו, התחברו, והשלימו את הקמת העסק.</p>
              </div>
            ) : (
              <RegisterFormB2B onSubmit={handleSubmit} loading={loading} error={error} />
            )}
          </>
        )}

        {/* Divider */}
        <div className="auth-page__divider" aria-hidden="true"><span>או</span></div>

        {/* Login link */}
        <p className="auth-page__switch text-label-md">
          כבר יש לך חשבון?{' '}
          <Link to="/login" className="auth-page__switch-link" id="go-login-from-b2b">
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
