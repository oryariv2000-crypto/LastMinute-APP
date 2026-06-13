import { useState } from 'react'
import InputField from '../InputField/InputField'
import SubmitButton from '../SubmitButton/SubmitButton'
import { BUSINESS_TYPES as BUSINESS_TYPE_LIST } from '../../lib/businessTypes'
import { UserIcon, EmailIcon, PhoneIcon, LockIcon, EyeIcon, EyeOffIcon, HomeIcon, MapPinIcon, BriefcaseIcon, ChevronDownIcon } from '../icons'
import './RegisterFormB2B.css'

/**
 * RegisterFormB2B — Registration form for business owners.
 *
 * Props:
 *   onSubmit  fn(data)  — called with form data on successful validation
 *   loading   boolean   — shows spinner while request is in flight
 */

// Options for the picker = the shared business-type taxonomy + a placeholder
// and an "Other" escape hatch that reveals a free-text field.
const TYPE_OPTIONS = [
  { value: '', label: 'בחר סוג עסק' },
  ...BUSINESS_TYPE_LIST.map((t) => ({ value: t.slug, label: `${t.icon} ${t.label}` })),
  { value: 'other', label: 'אחר…' },
]

export default function RegisterFormB2B({ onSubmit, loading = false, error = '' }) {
  const [form, setForm] = useState({
    businessName:  '',
    ownerName:     '',
    email:         '',
    phone:         '',
    businessType:  '',
    businessTypeOther: '',
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
    else if (form.businessType === 'other' && !form.businessTypeOther.trim())
      e.businessTypeOther = 'יש להזין את סוג העסק'
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
    // Resolve "Other" to the typed free text so a single value (slug or custom
    // text) is persisted to businesses.business_type.
    const businessType = form.businessType === 'other'
      ? form.businessTypeOther.trim()
      : form.businessType
    onSubmit?.({ ...form, businessType })
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
          <BriefcaseIcon /> פרטי העסק
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
          icon={<BriefcaseIcon />}
        />

        <div className="register-b2b-form__select-wrap">
          <label className="register-b2b-form__select-label" htmlFor="b2b-business-type">
            סוג עסק <span aria-hidden="true" style={{ color: 'var(--color-error)' }}> *</span>
          </label>
          <div className={`register-b2b-form__select-box${errors.businessType ? ' register-b2b-form__select-box--error' : ''}`}>
            <HomeIcon />
            <select
              id="b2b-business-type"
              className="register-b2b-form__select"
              value={form.businessType}
              onChange={set('businessType')}
              required
              aria-invalid={!!errors.businessType}
              aria-describedby={errors.businessType ? 'b2b-business-type-error' : undefined}
            >
              {TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon style={{ width: 16, height: 16, flexShrink: 0 }} />
          </div>
          {errors.businessType && (
            <p id="b2b-business-type-error" className="register-b2b-form__select-error" role="alert">
              {errors.businessType}
            </p>
          )}
        </div>

        {form.businessType === 'other' && (
          <InputField
            id="b2b-business-type-other"
            label="סוג העסק"
            type="text"
            value={form.businessTypeOther}
            onChange={set('businessTypeOther')}
            placeholder="לדוגמה: פלאפל, חומוסייה…"
            required
            error={errors.businessTypeOther}
            icon={<HomeIcon />}
          />
        )}

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
          icon={<MapPinIcon />}
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

