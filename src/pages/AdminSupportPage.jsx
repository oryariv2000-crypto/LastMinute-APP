import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllSupportTickets, updateSupportTicket } from '../lib/db'
import {
  TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, labelOf,
} from '../lib/support'
import Loader from '../components/Loader/Loader'
import './SupportPage.css'
import './AdminSupportPage.css'

/**
 * AdminSupportPage — the support team's triage board. Lists every ticket,
 * filters by status/category, and lets the team change status, category and
 * priority inline. Access is gated to the admin email (ProtectedRoute adminOnly
 * + RLS on support_tickets).
 *
 * Route: /admin/support
 */
const ROLE_LABEL = { customer: 'לקוח', business_owner: 'בעל עסק' }

export default function AdminSupportPage() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const rows = await getAllSupportTickets()
        if (active) setTickets(rows)
      } catch (err) {
        if (active) setError(err?.message || 'שגיאה בטעינת הפניות')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  async function patch(id, fields) {
    const prev = tickets
    setTickets((t) => t.map((x) => (x.id === id ? { ...x, ...fields } : x)))
    try {
      await updateSupportTicket(id, fields)
    } catch (err) {
      setTickets(prev)
      alert(err?.message || 'העדכון נכשל')
    }
  }

  const filtered = useMemo(() => tickets.filter((t) =>
    (statusFilter === 'all' || t.status === statusFilter) &&
    (categoryFilter === 'all' || t.category === categoryFilter),
  ), [tickets, statusFilter, categoryFilter])

  const openCount = tickets.filter((t) => t.status !== 'resolved').length

  return (
    <div className="support" dir="rtl">
      <header className="support__top">
        <button type="button" className="support__back" onClick={() => navigate(-1)} aria-label="חזרה">‹ חזרה</button>
        <h1 className="support__title">ניהול פניות תמיכה</h1>
        <span className="admin-sup__count">{openCount} פתוחות</span>
      </header>

      <main className="support__main">
        {error && <div className="support__error" role="alert">{error}</div>}

        {/* Filters */}
        <div className="admin-sup__filters">
          <label className="support__field">
            <span>סטטוס</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">הכל</option>
              {TICKET_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label className="support__field">
            <span>קטגוריה</span>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">הכל</option>
              {TICKET_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        </div>

        {loading ? (
          <Loader label="טוען פניות…" />
        ) : filtered.length === 0 ? (
          <p className="support__empty">אין פניות התואמות לסינון.</p>
        ) : (
          <ul className="support__list">
            {filtered.map((t) => (
              <li key={t.id} className={`support__ticket admin-sup__ticket admin-sup__ticket--${t.priority}`}>
                <div className="support__ticket-head">
                  <span className="support__ticket-subject">{t.subject}</span>
                  <span className={`support__badge support__badge--${t.status}`}>
                    {labelOf(TICKET_STATUSES, t.status)}
                  </span>
                </div>
                <div className="support__ticket-meta">
                  {ROLE_LABEL[t.role] || 'משתמש'} · דחיפות {labelOf(TICKET_PRIORITIES, t.priority)} · {new Date(t.created_at).toLocaleString('he-IL')}
                </div>
                <p className="admin-sup__desc">{t.description}</p>
                {t.contact && <p className="admin-sup__contact">קשר: {t.contact}</p>}
                {t.screenshot_url && (
                  <a className="admin-sup__shot" href={t.screenshot_url} target="_blank" rel="noreferrer">צפייה בצילום המסך ↗</a>
                )}

                <div className="admin-sup__controls">
                  <label>
                    סטטוס
                    <select value={t.status} onChange={(e) => patch(t.id, { status: e.target.value })}>
                      {TICKET_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </label>
                  <label>
                    קטגוריה
                    <select value={t.category} onChange={(e) => patch(t.id, { category: e.target.value })}>
                      {TICKET_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </label>
                  <label>
                    דחיפות
                    <select value={t.priority} onChange={(e) => patch(t.id, { priority: e.target.value })}>
                      {TICKET_PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
