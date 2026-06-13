import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import InputField from '../InputField/InputField'
import SubmitButton from '../SubmitButton/SubmitButton'
import Turnstile from '../Turnstile/Turnstile'
import { setRemember } from '../../lib/authStorage'
import './AuthForm.css'

/**
 * AuthForm — Login section component.
 *
 * Props:
 *   onSubmit   fn(email, password, { captchaToken }) — called with credentials
 *              on valid submit. The remember-me preference is persisted via
 *              setRemember() here, BEFORE onSubmit runs, so the session lands in
 *              the correct store.
 *   loading    boolean             — disables form while request is in flight
 *   error      string              — server-side error message shown above the form
 */
export default function AuthForm({ onSubmit, loading = false, error = '' }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRememberChecked] = useState(true)
  const [captchaToken, setCaptchaToken] = useState(undefined)
  const [errors, setErrors]     = useState({})
  const turnstileRef = useRef(null)

  function validate() {
    const e = {}
    if (!email.trim()) e.email = 'יש להזין כתובת אימייל'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'כתובת אימייל לא תקינה'
    if (!password)     e.password = 'יש להזין סיסמה'
    else if (password.length < 6) e.password = 'הסיסמה חייבת להכיל לפחות 6 תווים'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})
    // Persist the remember-me preference BEFORE sign-in so the Supabase session
    // is written to the correct store (localStorage vs sessionStorage).
    setRemember(remember)
    Promise.resolve(onSubmit?.(email.trim(), password, { captchaToken }))
      .finally(() => turnstileRef.current?.reset())
  }

  return (
    <form
      id="auth-form"
      className="auth-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label="טופס כניסה"
    >
      {error && (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      )}

      <InputField
        id="login-email"
        label="אימייל"
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })) }}
        placeholder="you@example.com"
        autoComplete="email"
        required
        error={errors.email}
        icon={<EmailIcon />}
      />

      <InputField
        id="login-password"
        label="סיסמה"
        type={showPass ? 'text' : 'password'}
        value={password}
        onChange={e => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })) }}
        placeholder="הזן סיסמה"
        autoComplete="current-password"
        required
        error={errors.password}
        icon={<LockIcon />}
        rightSlot={
          <button
            type="button"
            className="auth-form__toggle-pass"
            onClick={() => setShowPass(p => !p)}
            aria-label={showPass ? 'הסתר סיסמה' : 'הצג סיסמה'}
          >
            {showPass ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
      />

      <div className="auth-form__row">
        <label className="auth-form__remember" htmlFor="login-remember">
          <input
            id="login-remember"
            type="checkbox"
            checked={remember}
            onChange={e => setRememberChecked(e.target.checked)}
          />
          <span>זכור אותי</span>
        </label>

        <Link to="/forgot-password" className="auth-form__forgot" id="auth-forgot-link">
          שכחת סיסמה?
        </Link>
      </div>

      <Turnstile ref={turnstileRef} onToken={setCaptchaToken} />

      <SubmitButton loading={loading} id="auth-submit-btn">
        כניסה
      </SubmitButton>
    </form>
  )
}

/* ── Inline SVG icons ─────────────────────────────────────────── */
function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2 4 12 13 22 4" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}
