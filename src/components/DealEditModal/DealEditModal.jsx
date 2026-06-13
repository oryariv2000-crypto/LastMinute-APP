import { useState, useEffect, useRef } from 'react'
import { uploadDealImage } from '../../lib/db'
import TagSelector from '../TagSelector/TagSelector'
import { XIcon, CameraIcon } from '../icons'
import './DealEditModal.css'

/**
 * DealEditModal — Lightweight edit form for a single deal (Step 17 update).
 *
 * Props:
 *   deal     object  — the deal row to edit (DB shape: name, original_price, …)
 *   onSave   fn(fields) — async; receives the changed fields to persist
 *   onClose  fn        — dismiss without saving
 */
export default function DealEditModal({ deal, onSave, onClose }) {
  const [form, setForm] = useState({
    title:            deal.title ?? deal.name ?? '',
    original_price:   deal.original_price ?? deal.originalPrice ?? '',
    discount_price: deal.discount_price ?? deal.price ?? '',
    quantity_left:    deal.quantity_left ?? deal.quantity ?? 1,
    status:           deal.status ?? 'active',
    tags:             Array.isArray(deal.tags) ? deal.tags : [],
  })
  // Image: keep the current URL; preview a newly-picked file before upload.
  const currentImage = deal.image_url ?? deal.image ?? null
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(currentImage)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  // Track the object URL we created for the local preview so we can revoke it.
  const objectUrlRef = useRef(null)
  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  // Esc closes the dialog.
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const savingsPct =
    Number(form.original_price) > 0 && Number(form.original_price) > Number(form.discount_price)
      ? Math.round((1 - Number(form.discount_price) / Number(form.original_price)) * 100)
      : 0

  function set(field) {
    return (e) => setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  function handlePickImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!String(file.type || '').startsWith('image/')) {
      setError('יש לבחור קובץ תמונה תקין')
      return
    }
    setError('')
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setImageFile(file)
    setImagePreview(url)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const fields = {
        title: form.title.trim(),
        original_price: Number(form.original_price),
        discount_price: Number(form.discount_price),
        quantity_left: Number(form.quantity_left),
        status: form.status,
        tags: form.tags,
      }
      // Upload the new image only when the owner actually picked one.
      if (imageFile) {
        fields.image_url = await uploadDealImage(imageFile)
      }
      await onSave(fields)
    } catch (err) {
      setError(err?.message || 'שמירת השינויים נכשלה')
      setSaving(false)
    }
  }

  return (
    <div className="deal-edit__backdrop" role="dialog" aria-modal="true" aria-label="עריכת מבצע" onClick={onClose}>
      <form className="deal-edit__panel" dir="rtl" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <header className="deal-edit__header">
          <h2 className="deal-edit__title">עריכת מבצע</h2>
          <button type="button" className="deal-edit__close" onClick={onClose} aria-label="סגירה">
            <XIcon />
          </button>
        </header>

        <div className="deal-edit__body">
          {error && <p className="deal-edit__error" role="alert">{error}</p>}

          {/* ── Display image ───────────────────────────────── */}
          <div className="deal-edit__image-field">
            <span className="deal-edit__image-label">תמונה לתצוגה</span>
            <div className="deal-edit__image-row">
              <div className="deal-edit__image-preview">
                {imagePreview ? (
                  <img src={imagePreview} alt="" />
                ) : (
                  <span aria-hidden="true">🥗</span>
                )}
              </div>
              <label className="deal-edit__image-pick">
                <CameraIcon />
                {imageFile ? 'תמונה נבחרה — שנה/י' : 'שנה/י תמונה'}
                <input type="file" accept="image/*" onChange={handlePickImage} hidden />
              </label>
            </div>
          </div>

          <label className="deal-edit__field">
            <span>שם המבצע</span>
            <input type="text" value={form.title} onChange={set('title')} required />
          </label>

          <div className="deal-edit__row">
            <label className="deal-edit__field">
              <span>מחיר מקורי (₪)</span>
              <input type="number" min="0" step="0.5" value={form.original_price} onChange={set('original_price')} required />
            </label>
            <label className="deal-edit__field">
              <span>מחיר מבצע (₪)</span>
              <input type="number" min="0" step="0.5" value={form.discount_price} onChange={set('discount_price')} required />
            </label>
            {savingsPct > 0 && (
              <span className="deal-edit__savings" aria-label={`הנחה ${savingsPct} אחוז`}>-{savingsPct}%</span>
            )}
          </div>

          <div className="deal-edit__row">
          <label className="deal-edit__field">
            <span>מלאי</span>
            <input type="number" min="0" step="1" value={form.quantity_left} onChange={set('quantity_left')} required />
          </label>
          <label className="deal-edit__field">
            <span>סטטוס</span>
            <select value={form.status} onChange={set('status')}>
              <option value="active">פעיל</option>
              <option value="paused">מושהה</option>
            </select>
          </label>
        </div>

          <div className="deal-edit__field">
            <span>מאפיינים</span>
            <TagSelector
              value={form.tags}
              onChange={(next) => setForm((p) => ({ ...p, tags: next }))}
            />
          </div>
        </div>

        <footer className="deal-edit__actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            ביטול
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'שומר…' : 'שמור שינויים'}
          </button>
        </footer>
      </form>
    </div>
  )
}

