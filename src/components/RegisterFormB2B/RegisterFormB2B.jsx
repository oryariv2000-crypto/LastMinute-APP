import { useState } from 'react'
import InputField from '../InputField/InputField'
import SubmitButton from '../SubmitButton/SubmitButton'
import './RegisterFormB2B.css'

/**
 * RegisterFormB2B — Registration form for business owners.
 *
 * Props:
 *   onSubmit  fn(data)  — called with form data on successful validation
 *   loading   boolean   — shows spinner while request is in flight
 */

const BUSINESS_TYPES = [
  { value: '', label: 'בחר סוג עסק' },
  { value: 'restaurant', label: 'מסעדה / בית קפה' },
  { value: 'bakery',     label: 'מאפייה' },
  { value: 'grocery',    label: 'מכולת / סופרמרקט' },
  { value: 'deli',       label: 'דלי / קצביה' },
  { value: 'other',      label: 'אחר' },
]

export default function RegisterFormB2B({ onSubmit, loading = false, error = '' }) {
  const [form, setForm] = useState({
    businessName:  '',
    ownerName:     '',
    email:         '',
    phone:         '',
    businessType:  '',
    address:       '',
    password:      '',
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
    if (!form.businessName.trim()) e.businessName = 'יש להזין שם עסק'
    if (!form.ownerName.trim())    e.ownerName    = 'יש להזין שם בעל העסק'
    if (!form.email.trim())        e.email        = 'יש להזין אימייל'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'כתובת אימייל לא תקינה'
    if (!form.phone.trim())        e.phone        = 'יש להזין מספר טלפון'
    else if (!/^05\d{8}$/.test(form.phone.replace(/\s/g, '')))
      e.phone = 'מספר טלפון לא תקין (למשל: 0501234567)'
    if (!form.businessType)        e.businessType = 'יש לבחור סוג עסק'
    if (!form.address.trim())      e.address      = 'יש להזין כתובת'
    if (!form.password)            e.password     = 'יש להזין סיסמה'
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
      id="register-b2b-form"
      className="register-b2b-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label="טופס הרשמה עסק"
    >
      {error && (
        <p className="register-form__error" role="alert">
          {error}
        </p>
      )}

      {/* Business details section */}
      <fieldset className="register-b2b-form__section">
        <legend className="register-b2b-form__section-title">
          <BuildingIcon /> פרטי העסק
        </legend>

        <InputField
          id="b2b-business-name"
          label="שם העסק"
          type="text"
          value={form.businessName}
          onChange={set('businessName')}
          placeholder="הפינה של מיכל"
          autoComplete="organization"
          required
          error={errors.businessName}
          icon={<BuildingIcon />}
        />

        <div className="register-b2b-form__select-wrap">
          <label className="register-b2b-form__select-label" htmlFor="b2b-business-type">
            סוג עסק <span aria-hidden="true" style={{ color: 'var(--color-error)' }}> *</span>
          </label>
          <div className={`register-b2b-form__select-box${errors.businessType ? ' register-b2b-form__select-box--error' : ''}`}>
            <StorefrontIcon />
            <select
              id="b2b-business-type"
              className="register-b2b-form__select"
              value={form.businessType}
              onChange={set('businessType')}
              required
              aria-invalid={!!errors.businessType}
              aria-describedby={errors.businessType ? 'b2b-business-type-error' : undefined}
            >
              {BUSINESS_TYPES.map(opt => (
                <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronIcon />
          </div>
          {errors.businessType && (
            <p id="b2b-business-type-error" className="register-b2b-form__select-error" role="alert">
              {errors.businessType}
            </p>
          )}
        </div>

        <InputField
          id="b2b-address"
          label="כתובת"
          type="text"
          value={form.address}
          onChange={set('address')}
          placeholder="רחוב דיזנגוף 50, תל אביב"
          autoComplete="street-address"
          required
          error={errors.address}
          icon={<LocationIcon />}
        />
      </fieldset>

      {/* Owner details section */}
      <fieldset className="register-b2b-form__section">
        <legend className="register-b2b-form__section-title">
          <UserIcon /> פרטים אישיים
        </legend>

        <InputField
          id="b2b-owner-name"
          label="שם המנהל/ת"
          type="text"
          value={form.ownerName}
          onChange={set('ownerName')}
          placeholder="מיכל כהן"
          autoComplete="name"
          required
          error={errors.ownerName}
          icon={<UserIcon />}
        />

        <InputField
          id="b2b-email"
          label="אימייל"
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="business@example.com"
          autoComplete="email"
          required
          error={errors.email}
          icon={<EmailIcon />}
        />

        <InputField
          id="b2b-phone"
          label="טלפון"
          type="tel"
          value={form.phone}
          onChange={set('phone')}
          placeholder="050 000 0000"
          autoComplete="tel"
          required
          error={errors.phone}
          icon={<PhoneIcon />}
        />
      </fieldset>

      {/* Password section */}
      <fieldset className="register-b2b-form__section">
        <legend className="register-b2b-form__section-title">
          <LockIcon /> אבטחה
        </legend>

        <InputField
          id="b2b-password"
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
          id="b2b-confirm-password"
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
      </fieldset>

      <SubmitButton loading={loading} id="b2b-register-submit">
        יצירת חשבון עסקי
      </SubmitButton>
    </form>
  )
}

/* ── Shared helpers ───────────────────────────────────────────── */
function TogglePassBtn({ show, onToggle }) {
  return (
    <button
      type="button"
      className="register-b2b-toggle-pass"
      onClick={onToggle}
      aria-label={show ? 'הסתר סיסמה' : 'הצג סיסמה'}
    >
      {show ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  )
}

/* ── Inline SVG icons ─────────────────────────────────────────── */
function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="17" />
      <line x1="9.5" y1="14.5" x2="14.5" y2="14.5" />
    </svg>
  )
}
function StorefrontIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 18, height: 18 }}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
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
function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 16, height: 16, flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
