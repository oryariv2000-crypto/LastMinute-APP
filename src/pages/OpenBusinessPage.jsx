import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import InputField from '../components/InputField/InputField'
import BrandLogo from '../components/BrandLogo/BrandLogo'
import { createMyBusiness } from '../lib/db'
import { useAppMode } from '../lib/useAppMode'
import { BUSINESS_TYPES as BUSINESS_TYPE_LIST } from '../lib/businessTypes'
import './AuthPage.css'

/**
 * OpenBusinessPage — authenticated onboarding step to create/finish setting up
 * a business. Called after email confirmation (redirected by requireBusiness
 * ProtectedRoute guard) OR immediately after signup when email confirmation
 * is disabled.
 *
 * Route: /b2c/open-business  OR  /b2b/open-business
 *        Both are accessible to any authenticated user (plain <ProtectedRoute>).
 */

const TYPE_OPTIONS = [
  { value: '', label: 'בחר סוג עסק' },
  ...BUSINESS_TYPE_LIST.map((t) => ({ value: t.slug, label: `${t.icon} ${t.label}` })),
  { value: 'other', label: 'אחר…' },
]

export default function OpenBusinessPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setMode } = useAppMode()

  const prefill = location.state?.prefill ?? {}

  const [form, setForm] = useState({
    name:         prefill.name         ?? '',
    address:      prefill.address      ?? '',
    businessType: prefill.businessType ?? '',
    businessTypeOther: '',
    phone:        prefill.phone        ?? '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function set(field) {
    return (e) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }))
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  function validate() {
    const e = {}
    if (!form.name.trim())           e.name         = 'יש להזין שם עסק'
    if (!form.address.trim())        e.address      = 'יש להזין כתובת'
    if (!form.businessType)          e.businessType = 'יש לבחור סוג עסק'
    else if (form.businessType === 'other' && !form.businessTypeOther.trim())
      e.businessTypeOther = 'יש להזין את סוג העסק'
    if (!form.phone.trim())          e.phone        = 'יש להזין מספר טלפון'
    else if (!/^05\d{8}$/.test(form.phone.replace(/\s/g, '')))
      e.phone = 'מספר טלפון לא תקין (למשל: 0501234567)'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSubmitError('')

    const businessType = form.businessType === 'other'
      ? form.businessTypeOther.trim()
      : form.businessType

    setLoading(true)
    try {
      await createMyBusiness({
        name:         form.name.trim(),
        address:      form.address.trim(),
        businessType,
        phone:        form.phone.replace(/\s/g, ''),
      })
      setMode('business')
      navigate('/b2b/dashboard')
    } catch (err) {
      setSubmitError(err?.message || 'יצירת העסק נכשלה, נסה שוב')
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

        <div className="auth-page__header">
          <h1 className="auth-page__title text-headline-lg">הקמת העסק</h1>
          <p className="auth-page__subtitle text-body-md">
            מלא את פרטי העסק שלך כדי להתחיל לפרסם מבצעים
          </p>
        </div>

        <form
          id="open-business-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="טופס הקמת עסק"
        >
          {submitError && (
            <p className="register-form__error" role="alert">
              {submitError}
            </p>
          )}

          <InputField
            id="ob-business-name"
            label="שם העסק"
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="הפינה של מיכל"
            autoComplete="organization"
            required
            error={errors.name}
            icon={<BuildingIcon />}
          />

          {/* Business type select */}
          <div className="register-b2b-form__select-wrap">
            <label className="register-b2b-form__select-label" htmlFor="ob-business-type">
              סוג עסק <span aria-hidden="true" style={{ color: 'var(--color-error)' }}> *</span>
            </label>
            <div className={`register-b2b-form__select-box${errors.businessType ? ' register-b2b-form__select-box--error' : ''}`}>
              <StorefrontIcon />
              <select
                id="ob-business-type"
                className="register-b2b-form__select"
                value={form.businessType}
                onChange={set('businessType')}
                required
                aria-invalid={!!errors.businessType}
                aria-describedby={errors.businessType ? 'ob-business-type-error' : undefined}
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronIcon />
            </div>
            {errors.businessType && (
              <p id="ob-business-type-error" className="register-b2b-form__select-error" role="alert">
                {errors.businessType}
              </p>
            )}
          </div>

          {form.businessType === 'other' && (
            <InputField
              id="ob-business-type-other"
              label="סוג העסק"
              type="text"
              value={form.businessTypeOther}
              onChange={set('businessTypeOther')}
              placeholder="לדוגמה: פלאפל, חומוסייה…"
              required
              error={errors.businessTypeOther}
              icon={<StorefrontIcon />}
            />
          )}

          <InputField
            id="ob-address"
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

          <InputField
            id="ob-phone"
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

          <button
            id="ob-submit-btn"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', minHeight: 52, marginBlockStart: 8 }}
            disabled={loading}
          >
            {loading ? 'שומר…' : 'צור עסק'}
          </button>
        </form>

      </div>
    </div>
  )
}

/* ── Inline SVG icons (mirrors RegisterFormB2B) ────────────────── */
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
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.84 12 19.79 19.79 0 0 1 1.77 3.35 2 2 0 0 1 3.74 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.65a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
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
