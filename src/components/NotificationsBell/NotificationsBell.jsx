import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyDeals, getMySupportTickets } from '../../lib/db'
import { labelOf, TICKET_STATUSES } from '../../lib/support'
import './NotificationsBell.css'

/**
 * NotificationsBell — the top-bar bell, now a real notification center for the
 * business owner. Surfaces actionable items from data the owner already reads:
 *   • deals out of stock / running low
 *   • status updates on their support tickets
 * Clicking an item navigates to the relevant screen.
 */
export default function NotificationsBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const ref = useRef(null)

  // Load once on mount so the badge count is meaningful before opening.
  useEffect(() => {
    let active = true
    ;(async () => {
      // Independent sources: a missing support table shouldn't hide stock alerts.
      const [dealsRes, ticketsRes] = await Promise.allSettled([getMyDeals(), getMySupportTickets()])
      if (!active) return
      const deals = dealsRes.status === 'fulfilled' ? dealsRes.value : []
      const tickets = ticketsRes.status === 'fulfilled' ? ticketsRes.value : []
      setItems(buildNotifications(deals, tickets))
    })()
    return () => { active = false }
  }, [])

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const count = items.length

  return (
    <div className="notif" ref={ref}>
      <button
        type="button"
        className="navbar-b2b__icon-btn"
        aria-label={`התראות${count ? ` — ${count} חדשות` : ''}`}
        aria-expanded={open}
        id="b2b-nav-notifications"
        onClick={() => setOpen((o) => !o)}
      >
        <BellIcon />
        {count > 0 && <span className="navbar-b2b__notif-badge" aria-hidden="true" />}
      </button>

      {open && (
        <div className="notif__panel" role="menu">
          <div className="notif__header">התראות</div>
          {count === 0 ? (
            <p className="notif__empty">אין התראות חדשות 🎉</p>
          ) : (
            <ul className="notif__list">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className="notif__item"
                    role="menuitem"
                    onClick={() => { setOpen(false); navigate(n.to) }}
                  >
                    <span className={`notif__dot notif__dot--${n.tone}`} aria-hidden="true" />
                    <span className="notif__text">
                      <span className="notif__item-title">{n.title}</span>
                      {n.sub && <span className="notif__item-sub">{n.sub}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/* Derive notification rows from the owner's deals + their support tickets. */
function buildNotifications(deals = [], tickets = []) {
  const out = []

  for (const d of deals) {
    if (d.status === 'paused') continue
    const left = d.quantity_left ?? 0
    if (left === 0) {
      out.push({ id: `oos-${d.id}`, tone: 'danger', to: '/b2b/dashboard',
        title: `אזל המלאי: ${d.title}`, sub: 'שקול/י לחדש או להסיר את המבצע' })
    } else if (left <= 3) {
      out.push({ id: `low-${d.id}`, tone: 'warn', to: '/b2b/dashboard',
        title: `נותרו ${left} יח׳: ${d.title}`, sub: 'המלאי כמעט אזל' })
    }
  }

  for (const t of tickets) {
    if (t.status === 'new') continue // nothing new to tell the user yet
    out.push({ id: `tk-${t.id}`, tone: t.status === 'resolved' ? 'ok' : 'info', to: '/support',
      title: `פנייתך "${t.subject}"`, sub: `סטטוס: ${labelOf(TICKET_STATUSES, t.status)}` })
  }

  return out
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
