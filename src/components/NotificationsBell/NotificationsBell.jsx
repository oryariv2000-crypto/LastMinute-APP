import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyDeals, getMySupportTickets, getMyNotifications, markNotificationRead } from '../../lib/db'
import { labelOf, TICKET_STATUSES } from '../../lib/support'
import { BellIcon } from '../icons'
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
      // Independent sources: one missing table shouldn't hide the others'
      // alerts (e.g. a missing support table mustn't suppress new-order rows).
      const [dealsRes, ticketsRes, notifsRes] = await Promise.allSettled([
        getMyDeals(), getMySupportTickets(), getMyNotifications(),
      ])
      if (!active) return
      const deals = dealsRes.status === 'fulfilled' ? dealsRes.value : []
      const tickets = ticketsRes.status === 'fulfilled' ? ticketsRes.value : []
      const notifs = notifsRes.status === 'fulfilled' ? notifsRes.value : []
      setItems(buildNotifications(deals, tickets, notifs))
    })()
    return () => { active = false }
  }, [])

  // Acting on a stored notification: mark it read (best-effort) and route to
  // the screen where the owner can act on it. Removing it locally keeps the
  // badge honest without a refetch.
  function handleSelect(n) {
    setOpen(false)
    if (n.dbId) {
      setItems((prev) => prev.filter((i) => i.id !== n.id))
      markNotificationRead(n.dbId).catch(() => {})
    }
    navigate(n.to)
  }

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
                    onClick={() => handleSelect(n)}
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

/* Where clicking a stored notification takes the owner. New orders open the
   Orders Management page, deep-linked to the specific order when known. */
function routeForNotification(n) {
  switch (n.type) {
    case 'new_order': return n.order_id ? `/b2b/orders?order=${n.order_id}` : '/b2b/orders'
    default:          return '/b2b/dashboard'
  }
}

/* Merge stored DB notifications (e.g. new orders) with alerts derived from the
   owner's deals + support tickets. Stored, unread notifications come first as
   the most time-sensitive; read ones are dropped so the badge stays accurate. */
function buildNotifications(deals = [], tickets = [], notifications = []) {
  const out = []

  for (const n of notifications) {
    if (n.is_read) continue
    out.push({
      id: `db-${n.id}`, dbId: n.id,
      tone: n.type === 'new_order' ? 'ok' : 'info',
      to: routeForNotification(n),
      title: n.title, sub: n.body,
    })
  }

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

