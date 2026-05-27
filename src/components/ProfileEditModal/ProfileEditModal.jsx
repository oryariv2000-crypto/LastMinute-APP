import { useRef, useState } from 'react'
import { uploadAvatar } from '../../lib/db'
import '../DealEditModal/DealEditModal.css'

/**
 * ProfileEditModal — Edit-profile form with avatar upload (Steps 19 + 22).
 *
 * Props:
 *   title       string                — modal heading
 *   fields      [{ name, label, type }] — text fields to edit
 *   initial     object                — initial values keyed by field name
 *   avatarUrl   string                — current avatar/logo URL
 *   onSave      fn(values)            — async; persists the edited fields
 *   onAvatarChange fn(url)            — called after a successful avatar upload
 *   onClose     fn
 */
export default function ProfileEditModal({
  title = 'עריכת פרופיל',
  fields = [],
  initial = {},
  avatarUrl,
  onSave,
  onAvatarChange,
  onClose,
}) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? ''])),
  )
  const [avatar, setAvatar]   = useState(avatarUrl || null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const fileRef = useRef(null)

  function set(name) {
    return (e) => setValues((p) => ({ ...p, [name]: e.target.value }))
  }

  async function handleAvatarPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadAvatar(file)
      setAvatar(url)
      onAvatarChange?.(url)
    } catch (err) {
      setError(err?.message || 'העלאת התמונה נכשלה')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave(values)
    } catch (err) {
      setError(err?.message || 'שמירת הפרופיל נכשלה')
      setSaving(false)
    }
  }

  return (
    <div className="deal-edit__backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <form className="deal-edit__panel card" dir="rtl" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="deal-edit__title">{title}</h2>

        {error && <p className="deal-edit__error" role="alert">{error}</p>}

        {/* Avatar upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', overflow: 'hidden',
            background: 'var(--color-surface-container-high)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {avatar
              ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span aria-hidden="true">📷</span>}
          </div>
          <button type="button" className="btn btn-ghost" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? 'מעלה…' : 'החלף תמונה'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarPick} />
        </div>

        {fields.map((f) => (
          <label key={f.name} className="deal-edit__field">
            <span>{f.label}</span>
            <input type={f.type || 'text'} value={values[f.name]} onChange={set(f.name)} />
          </label>
        ))}

        <div className="deal-edit__actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>ביטול</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'שומר…' : 'שמור'}
          </button>
        </div>
      </form>
    </div>
  )
}
