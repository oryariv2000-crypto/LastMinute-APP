import { useState } from 'react'
import InputField from '../InputField/InputField'
import SubmitButton from '../SubmitButton/SubmitButton'
import './RegisterFormB2C.css'

/**
 * RegisterFormB2C — Registration form for end customers.
 *
 * Props:
 *   onSubmit  fn(data)  — called with form data on successful validation
 *   loading   boolean   — shows spinner while request is in flight
 *   error     string    — server-side error message shown above the form
 */
export default function RegisterFormB2C({ onSubmit, loading = false, error = '' }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [showPass, setShowPass]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors]           = useState({})

  function set(field) {
    return (e) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }))
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  function validate() {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'יש להזין שם פרטי'
    if (!form.lastName.trim())  e.lastName  = 'יש להזין שם משפחה'
    if (!form.email.trim())     e.email     = 'יש להזין אימייל'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'כתובת אימייל לא תקינה'
    if (form.phone && !/^05\d{8}$/.test(form.phone.replace(/\s/g, '')))
      e.phone = 'מספר טלפון לא תקין (למשל: 0501234567)'
    if (!form.password)          e.password = 'יש להזין סיסמה'
    else if (form.password.length < 8) e.password = 'הסיסמה חייבת להכיל לפחות 8 תווים'
    if (form.confirmPassword !== form.password) e.confirmPassword = 'הסיסמאות אינן תואמות'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    onSubmit?.({ ...form })
  }

  return (
    <form
      id="register-b2c-form"
      className="register-b2c-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label="טופס הרשמה לקוח"
    >
      {error && (
        <p className="register-form__error" role="alert">
          {error}
        </p>
      )}

      {/* Name row */}
      <div className="register-b2c-form__name-row">
        <InputField
          id="b2c-first-name"
          label="שם פרטי"
          type="text"
          value={form.firstName}
          onChange={set('firstName')}
          placeholder="ישראל"
          autoComplete="given-name"
          required
          error={errors.firstName}
          icon={<UserIcon />}
        />
        <InputField
          id="b2c-last-name"
          label="שם משפחה"
          type="text"
          value={form.lastName}
          onChange={set('lastName')}
          placeholder="ישראלי"
          autoComplete="family-name"
          required
          error={errors.lastName}
        />
      </div>

      <InputField
        id="b2c-email"
        label="אימייל"
        type="email"
        value={form.email}
        onChange={set('email')}
        placeholder="you@example.com"
        autoComplete="email"
        required
        error={errors.email}
        icon={<EmailIcon />}
      />

      <InputField
        id="b2c-phone"
        label="טלפון (אופציונלי)"
        type="tel"
        value={form.phone}
        onChange={set('phone')}
        placeholder="050 000 0000"
        autoComplete="tel"
        error={errors.phone}
        icon={<PhoneIcon />}
      />

      <InputField
        id="b2c-password"
        label="סיסמה"
        type={showPass ? 'text' : 'password'}
        value={form.password}
        onChange={set('password')}
        placeholder="לפחות 8 תווים"
        autoComplete="new-password"
        required
        error={errors.password}
        icon={<LockIcon />}
        rightSlot={
          <TogglePassBtn show={showPass} onToggle={() => setShowPass(p => !p)} />
        }
      />

      <InputField
        id="b2c-confirm-password"
        label="אימות סיסמה"
        type={showConfirm ? 'text' : 'password'}
        value={form.confirmPassword}
        onChange={set('confirmPassword')}
        placeholder="חזור על הסיסמה"
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
        icon={<LockIcon />}
        rightSlot={
          <TogglePassBtn show={showConfirm} onToggle={() => setShowConfirm(p => !p)} />
        }
      />

      <SubmitButton loading={loading} id="b2c-register-submit">
        יצירת חשבון
      </SubmitButton>
    </form>
  )
}

/* ── Shared helpers ───────────────────────────────────────────── */
function TogglePassBtn({ show, onToggle }) {
  return (
    <button
      type="button"
      className="register-toggle-pass"
      onClick={onToggle}
      aria-label={show ? 'הסתר סיסמה' : 'הצג סיסמה'}
    >
      {show ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  )
}

/* ── Inline SVG icons ─────────────────────────────────────────── */
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2 4 12 13 22 4" />
    </svg>
  )
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.84 12 19.79 19.79 0 0 1 1.77 3.35 2 2 0 0 1 3.74 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.65a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
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
