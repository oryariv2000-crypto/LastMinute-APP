import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import InputField from '../components/InputField/InputField'
import AddressAutocomplete from '../components/AddressAutocomplete/AddressAutocomplete'
import BrandLogo from '../components/BrandLogo/BrandLogo'
import { createMyBusiness } from '../lib/db'
import { useAppMode } from '../lib/useAppMode'
import { BUSINESS_TYPES as BUSINESS_TYPE_LIST } from '../lib/businessTypes'
import { BriefcaseIcon, HomeIcon, MapPinIcon, PhoneIcon, ChevronDownIcon } from '../components/icons'
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
    lat:          prefill.lat          ?? null,
    lng:          prefill.lng          ?? null,
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

  // Free typing invalidates any previously captured coordinates; selecting a
  // suggestion captures the exact lat/lng for the chosen address.
  function onAddressChange(text) {
    setForm(prev => ({ ...prev, address: text, lat: null, lng: null }))
    setErrors(prev => ({ ...prev, address: '' }))
  }
  function onAddressSelect({ address, lat, lng }) {
    setForm(prev => ({ ...prev, address, lat, lng }))
    setErrors(prev => ({ ...prev, address: '' }))
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
        lat:          form.lat,
        lng:          form.lng,
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
            icon={<BriefcaseIcon />}
          />

          {/* Business type select */}
          <div className="register-b2b-form__select-wrap">
            <label className="register-b2b-form__select-label" htmlFor="ob-business-type">
              סוג עסק <span aria-hidden="true" style={{ color: 'var(--color-error)' }}> *</span>
            </label>
            <div className={`register-b2b-form__select-box${errors.businessType ? ' register-b2b-form__select-box--error' : ''}`}>
              <HomeIcon />
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
              <ChevronDownIcon style={{ width: 16, height: 16, flexShrink: 0 }} />
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
              icon={<HomeIcon />}
            />
          )}

          <AddressAutocomplete
            id="ob-address"
            label="כתובת"
            value={form.address}
            onChange={onAddressChange}
            onSelect={onAddressSelect}
            placeholder="רחוב דיזנגוף 50, תל אביב"
            required
            error={errors.address}
            icon={<MapPinIcon />}
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

