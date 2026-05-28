import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  createSupportTicket, getMySupportTickets, uploadDealImage,
} from '../lib/db'
import { useProfile } from '../lib/useProfile'
import {
  TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, TICKET_TOPICS, labelOf, isAdminEmail,
} from '../lib/support'
import Loader from '../components/Loader/Loader'
import './SupportPage.css'

/**
 * SupportPage — help & support for ANY signed-in user (customer or owner).
 * Submit a ticket (category, priority, subject, description, contact,
 * screenshot) and see the status of your previous tickets.
 *
 * Route: /support
 */
export default function SupportPage() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [email, setEmail] = useState(null)

  const [form, setForm] = useState({
    category: 'question', priority: 'normal',
    topic: TICKET_TOPICS[0].id, subjectOther: '',
    description: '', contact: '',
  })
  const [shot, setShot]       = useState(null)   // { url, uploading }
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        if (active) setEmail(data.user?.email ?? null)
        const rows = await getMySupportTickets()
        if (active) setTickets(rows)
      } catch (err) {
        if (active) setError(err?.message || 'שגיאה בטעינת הפניות')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const set = (name) => (e) => setForm((p) => ({ ...p, [name]: e.target.value }))

  async function handleShot(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setShot({ uploading: true })
    try {
      const url = await uploadDealImage(file)
      setShot({ url, uploading: false })
    } catch (err) {
      setError(err?.message || 'העלאת צילום המסך נכשלה')
      setShot(null)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    // Resolve the subject from the topic picker (free text when "אחר").
    const subject = form.topic === 'other'
      ? form.subjectOther.trim()
      : labelOf(TICKET_TOPICS, form.topic)
    if (!subject) { setError('יש לכתוב נושא לפניה'); return }
    if (!form.contact.trim()) { setError('יש למלא פרטי קשר לחזרה אליך'); return }

    setError('')
    setSaving(true)
    try {
      const created = await createSupportTicket({
        role: profile?.role ?? null,
        category: form.category,
        priority: form.priority,
        subject,
        description: form.description.trim(),
        contact: form.contact.trim(),
        screenshot_url: shot?.url ?? null,
      })
      setTickets((t) => [created, ...t])
      setForm({ category: 'question', priority: 'normal', topic: TICKET_TOPICS[0].id, subjectOther: '', description: '', contact: '' })
      setShot(null)
      setSent(true)
    } catch (err) {
      setError(err?.message || 'שליחת הפניה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="support" dir="rtl">
      <header className="support__top">
        <button type="button" className="support__back" onClick={() => navigate(-1)} aria-label="חזרה">‹ חזרה</button>
        <h1 className="support__title">עזרה ותמיכה</h1>
        {isAdminEmail(email) && (
          <Link to="/admin/support" className="support__admin-link">ניהול פניות ←</Link>
        )}
      </header>

      <main className="support__main">
        <p className="support__intro">נתקלת בבעיה או יש לך שאלה? פתח/י פניה ונחזור אליך.</p>

        {sent && (
          <div className="support__toast" role="status">
            ✓ הפניה נשלחה! נטפל בה בהקדם. אפשר לעקוב אחרי הסטטוס למטה.
          </div>
        )}
        {error && <div className="support__error" role="alert">{error}</div>}

        <form className="support__form card" onSubmit={handleSubmit}>
          <div className="support__row">
            <label className="support__field">
              <span>קטגוריה</span>
              <select value={form.category} onChange={set('category')}>
                {TICKET_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className="support__field">
              <span>דחיפות</span>
              <select value={form.priority} onChange={set('priority')}>
                {TICKET_PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
          </div>

          <label className="support__field">
            <span>נושא</span>
            <select value={form.topic} onChange={set('topic')}>
              {TICKET_TOPICS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>

          {form.topic === 'other' && (
            <label className="support__field">
              <span>פירוט הנושא</span>
              <input type="text" value={form.subjectOther} onChange={set('subjectOther')} required placeholder="במשפט אחד — על מה הפניה?" />
            </label>
          )}

          <label className="support__field">
            <span>תיאור</span>
            <textarea value={form.description} onChange={set('description')} required rows={4} placeholder="פרט/י מה קרה, מה ציפית שיקרה, וכל מידע שיעזור לנו." />
          </label>

          <label className="support__field">
            <span>פרטי קשר לחזרה (טלפון/מייל) *</span>
            <input type="text" value={form.contact} onChange={set('contact')} required placeholder="כדי ששירות הלקוחות יוכל לחזור אליך" />
          </label>

          <div className="support__field">
            <span>צילום מסך (אופציונלי)</span>
            <div className="support__shot">
              {shot?.url && <img src={shot.url} alt="" className="support__shot-preview" />}
              <label className="btn btn-ghost support__shot-btn">
                {shot?.uploading ? 'מעלה…' : shot?.url ? 'החלף תמונה' : 'צרף תמונה'}
                <input type="file" accept="image/*" hidden onChange={handleShot} />
              </label>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving || shot?.uploading}>
            {saving ? 'שולח…' : 'שליחת פניה'}
          </button>
        </form>

        <section className="support__history">
          <h2 className="support__history-title">הפניות שלי</h2>
          {loading ? (
            <Loader label="טוען…" />
          ) : tickets.length === 0 ? (
            <p className="support__empty">עדיין לא פתחת פניות.</p>
          ) : (
            <ul className="support__list">
              {tickets.map((t) => (
                <li key={t.id} className="support__ticket">
                  <div className="support__ticket-head">
                    <span className="support__ticket-subject">{t.subject}</span>
                    <span className={`support__badge support__badge--${t.status}`}>
                      {labelOf(TICKET_STATUSES, t.status)}
                    </span>
                  </div>
                  <div className="support__ticket-meta">
                    {labelOf(TICKET_CATEGORIES, t.category)} · {new Date(t.created_at).toLocaleDateString('he-IL')}
                  </div>
                  <p className="support__ticket-desc">{t.description}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
