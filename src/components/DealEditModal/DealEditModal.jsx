import { useState } from 'react'
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
    discounted_price: deal.discounted_price ?? deal.price ?? '',
    quantity_left:    deal.quantity_left ?? deal.quantity ?? 1,
    status:           deal.status ?? 'active',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(field) {
    return (e) => setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({
        title: form.title.trim(),
        original_price: Number(form.original_price),
        discounted_price: Number(form.discounted_price),
        quantity_left: Number(form.quantity_left),
        status: form.status,
      })
    } catch (err) {
      setError(err?.message || 'שמירת השינויים נכשלה')
      setSaving(false)
    }
  }

  return (
    <div className="deal-edit__backdrop" role="dialog" aria-modal="true" aria-label="עריכת מבצע" onClick={onClose}>
      <form className="deal-edit__panel card" dir="rtl" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="deal-edit__title">עריכת מבצע</h2>

        {error && <p className="deal-edit__error" role="alert">{error}</p>}

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
            <input type="number" min="0" step="0.5" value={form.discounted_price} onChange={set('discounted_price')} required />
          </label>
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
              <option value="draft">טיוטה</option>
              <option value="sold_out">אזל</option>
              <option value="expired">הסתיים</option>
            </select>
          </label>
        </div>

        <div className="deal-edit__actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            ביטול
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'שומר…' : 'שמור שינויים'}
          </button>
        </div>
      </form>
    </div>
  )
}
