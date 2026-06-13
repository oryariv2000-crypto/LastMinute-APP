import { useState } from 'react'
import InputField from '../InputField/InputField'
import SubmitButton from '../SubmitButton/SubmitButton'
import { UserIcon, EmailIcon, PhoneIcon, LockIcon, EyeIcon, EyeOffIcon } from '../icons'
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

