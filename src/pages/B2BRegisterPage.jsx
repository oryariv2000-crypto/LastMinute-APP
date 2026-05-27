import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import RoleSelector from '../components/RoleSelector/RoleSelector'
import RegisterFormB2B from '../components/RegisterFormB2B/RegisterFormB2B'
import { supabase } from '../lib/supabase'
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
      // 1. Create the auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })
      if (signUpError) {
        setError(signUpError.message)
        return
      }

      const user = signUpData.user
      if (!user) {
        // Happens when email confirmation is enabled — no session yet.
        setError('נשלח אליך מייל לאימות. אשר אותו כדי להשלים את ההרשמה.')
        return
      }

      // 2. Insert the profile row into `users` with role = business_owner
      const { error: profileError } = await supabase.from('users').insert({
        id: user.id,
        email: data.email,
        full_name: data.ownerName,
        role: 'business_owner',
      })
      if (profileError) {
        setError(profileError.message)
        return
      }

      // 3. Insert the business record owned by this user (owner = user_id).
      const { error: businessError } = await supabase.from('businesses').insert({
        user_id: user.id,
        name: data.businessName,
        address: data.address,
        business_type: data.businessType,
        phone: data.phone,
      })
      if (businessError) {
        setError(businessError.message)
        return
      }

      navigate('/b2b/dashboard')
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

            <RegisterFormB2B onSubmit={handleSubmit} loading={loading} error={error} />
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
