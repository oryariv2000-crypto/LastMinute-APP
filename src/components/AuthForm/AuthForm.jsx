import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import InputField from '../InputField/InputField'
import SubmitButton from '../SubmitButton/SubmitButton'
import Turnstile from '../Turnstile/Turnstile'
import { setRemember, setRememberedEmail, getRememberedEmail } from '../../lib/authStorage'
import { EmailIcon, LockIcon, EyeIcon, EyeOffIcon } from '../icons'
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
  // Prefill the address a returning "remember me" user saved last time (UX only;
  // the lazy initializer reads localStorage exactly once on mount).
  const [email, setEmail]       = useState(getRememberedEmail)
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
    const trimmedEmail = email.trim()
    // Persist the remember-me preference BEFORE sign-in so the Supabase session
    // is written to the correct store (localStorage vs sessionStorage).
    setRemember(remember)
    // Remember (or forget) the email for the next visit, matching the checkbox.
    setRememberedEmail(trimmedEmail, remember)
    Promise.resolve(onSubmit?.(trimmedEmail, password, { captchaToken }))
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

