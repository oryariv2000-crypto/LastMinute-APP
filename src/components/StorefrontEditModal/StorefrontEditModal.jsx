import { useRef, useState } from 'react'
import { uploadDealImage } from '../../lib/db'
import '../DealEditModal/DealEditModal.css'
import './StorefrontEditModal.css'

/**
 * StorefrontEditModal — full editor for the business storefront: logo, cover,
 * name/owner/contact, category, description and structured weekly hours.
 * Images upload to the deal-images bucket (public) via uploadDealImage.
 *
 * Props:
 *   initial  object   — { name, full_name, address, phone, business_type,
 *                         description, logo_url, cover_url, opening_hours }
 *   onSave   fn(values) — async; persists everything
 *   onClose  fn
 */
const DAYS = [
  { key: 'sun', label: 'ראשון' },
  { key: 'mon', label: 'שני' },
  { key: 'tue', label: 'שלישי' },
  { key: 'wed', label: 'רביעי' },
  { key: 'thu', label: 'חמישי' },
  { key: 'fri', label: 'שישי' },
  { key: 'sat', label: 'שבת' },
]
const DEFAULT_DAY = { open: '09:00', close: '17:00', closed: false }

export default function StorefrontEditModal({ initial = {}, onSave, onClose }) {
  const [values, setValues] = useState({
    name:          initial.name ?? '',
    full_name:     initial.full_name ?? '',
    address:       initial.address ?? '',
    phone:         initial.phone ?? '',
    business_type: initial.business_type ?? '',
    description:   initial.description ?? '',
  })
  const [logo, setLogo]   = useState(initial.logo_url || null)
  const [cover, setCover] = useState(initial.cover_url || null)
  const [hours, setHours] = useState(() => normalizeHours(initial.opening_hours))
  const [busy, setBusy]   = useState('')   // 'logo' | 'cover' while uploading
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const logoRef  = useRef(null)
  const coverRef = useRef(null)

  function set(name) {
    return (e) => setValues((p) => ({ ...p, [name]: e.target.value }))
  }

  async function pickImage(e, kind) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(kind)
    setError('')
    try {
      const url = await uploadDealImage(file)
      ;(kind === 'logo' ? setLogo : setCover)(url)
    } catch (err) {
      setError(err?.message || 'העלאת התמונה נכשלה')
    } finally {
      setBusy('')
    }
  }

  function setDay(key, patch) {
    setHours((h) => ({ ...h, [key]: { ...h[key], ...patch } }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({
        ...values,
        name: values.name.trim(),
        logo_url: logo,
        cover_url: cover,
        opening_hours: hours,
      })
    } catch (err) {
      setError(err?.message || 'שמירת הפרופיל נכשלה')
      setSaving(false)
    }
  }

  return (
    <div className="deal-edit__backdrop" role="dialog" aria-modal="true" aria-label="עריכת חנות" onClick={onClose}>
      <form className="deal-edit__panel card sf-edit" dir="rtl" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="deal-edit__title">עריכת דף העסק</h2>
        {error && <p className="deal-edit__error" role="alert">{error}</p>}

        {/* Cover + logo */}
        <div className="sf-edit__media">
          <button
            type="button"
            className="sf-edit__cover"
            style={cover ? { backgroundImage: `url(${cover})` } : undefined}
            onClick={() => coverRef.current?.click()}
            aria-label="העלאת תמונת רקע"
          >
            {!cover && <span>＋ תמונת רקע</span>}
            {busy === 'cover' && <span className="sf-edit__uploading">מעלה…</span>}
          </button>
          <button
            type="button"
            className="sf-edit__logo"
            onClick={() => logoRef.current?.click()}
            aria-label="העלאת לוגו"
          >
            {logo ? <img src={logo} alt="" /> : <span>＋ לוגו</span>}
            {busy === 'logo' && <span className="sf-edit__uploading">…</span>}
          </button>
          <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => pickImage(e, 'cover')} />
          <input ref={logoRef}  type="file" accept="image/*" hidden onChange={(e) => pickImage(e, 'logo')} />
        </div>

        <div className="deal-edit__row">
          <label className="deal-edit__field">
            <span>שם העסק</span>
            <input type="text" value={values.name} onChange={set('name')} required />
          </label>
          <label className="deal-edit__field">
            <span>קטגוריה</span>
            <input type="text" value={values.business_type} onChange={set('business_type')} placeholder="בית קפה, מאפייה…" />
          </label>
        </div>

        <label className="deal-edit__field">
          <span>שם בעל/ת העסק</span>
          <input type="text" value={values.full_name} onChange={set('full_name')} />
        </label>

        <div className="deal-edit__row">
          <label className="deal-edit__field">
            <span>כתובת</span>
            <input type="text" value={values.address} onChange={set('address')} />
          </label>
          <label className="deal-edit__field">
            <span>טלפון</span>
            <input type="tel" value={values.phone} onChange={set('phone')} />
          </label>
        </div>

        <label className="deal-edit__field">
          <span>תיאור / אודות</span>
          <textarea
            className="sf-edit__textarea"
            value={values.description}
            onChange={set('description')}
            rows={3}
            placeholder="ספרו ללקוחות על העסק — סגנון, התמחות, מה מיוחד אצלכם…"
          />
        </label>

        {/* Weekly hours */}
        <div className="sf-edit__hours">
          <span className="deal-edit__field-label">שעות פעילות</span>
          {DAYS.map((d) => {
            const day = hours[d.key]
            return (
              <div key={d.key} className="sf-edit__hours-row">
                <span className="sf-edit__hours-day">{d.label}</span>
                {day.closed ? (
                  <span className="sf-edit__hours-closed">סגור</span>
                ) : (
                  <span className="sf-edit__hours-times">
                    <input type="time" value={day.open}  onChange={(e) => setDay(d.key, { open: e.target.value })} />
                    <span>–</span>
                    <input type="time" value={day.close} onChange={(e) => setDay(d.key, { close: e.target.value })} />
                  </span>
                )}
                <label className="sf-edit__hours-toggle">
                  <input
                    type="checkbox"
                    checked={day.closed}
                    onChange={(e) => setDay(d.key, { closed: e.target.checked })}
                  />
                  סגור
                </label>
              </div>
            )
          })}
        </div>

        <div className="deal-edit__actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>ביטול</button>
          <button type="submit" className="btn btn-primary" disabled={saving || busy}>
            {saving ? 'שומר…' : 'שמור'}
          </button>
        </div>
      </form>
    </div>
  )
}

/** Ensure every weekday has a well-formed entry. */
function normalizeHours(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  return Object.fromEntries(
    DAYS.map((d) => [d.key, { ...DEFAULT_DAY, ...(src[d.key] || {}) }]),
  )
}
