import { Link, useLocation } from 'react-router-dom'
import './NavbarB2B.css'

/**
 * NavbarB2B — Sticky top navigation for business owners.
 *
 * Props:
 *   businessName   string  — name of the logged-in business (default: placeholder)
 *   isOpen         bool    — whether the business is currently open/active
 *   initials       string  — avatar initials (default: derived from businessName)
 *   notifCount     number  — pending notifications (shows dot when > 0)
 */
export default function NavbarB2B({
  businessName = 'הפינה של מיכל',
  isOpen = true,
  initials,
  notifCount = 3,
}) {
  const derivedInitials =
    initials ||
    businessName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase()

  return (
    <header className="navbar-b2b" role="banner">
      <div className="navbar-b2b__inner">

        {/* ── Brand ─────────────────────────────────────── */}
        <Link to="/b2b/dashboard" className="navbar-b2b__brand" aria-label="Last Minute — דף הבית">
          <span className="navbar-b2b__logo-mark" aria-hidden="true">🌿</span>
          <span>
            <span className="navbar-b2b__brand-name">Last Minute</span>
            <span className="navbar-b2b__brand-tag">לעסקים</span>
          </span>
        </Link>

        {/* ── Business Info ──────────────────────────────── */}
        <div className="navbar-b2b__biz" aria-label="עסק פעיל">
          <span className="navbar-b2b__biz-name">{businessName}</span>
          <span className="navbar-b2b__biz-status">
            <span
              className={`navbar-b2b__status-dot${isOpen ? '' : ' navbar-b2b__status-dot--offline'}`}
              aria-hidden="true"
            />
            {isOpen ? 'פתוח עכשיו' : 'סגור'}
          </span>
        </div>

        {/* ── Actions ────────────────────────────────────── */}
        <div className="navbar-b2b__actions">
          {/* Notifications bell */}
          <button
            className="navbar-b2b__icon-btn"
            aria-label={`התראות${notifCount > 0 ? ` — ${notifCount} חדשות` : ''}`}
            id="b2b-nav-notifications"
          >
            <BellIcon />
            {notifCount > 0 && (
              <span className="navbar-b2b__notif-badge" aria-hidden="true" />
            )}
          </button>

          {/* Avatar / Profile */}
          <Link
            to="/b2b/profile"
            className="navbar-b2b__avatar"
            aria-label={`פרופיל — ${businessName}`}
            id="b2b-nav-avatar"
          >
            {derivedInitials}
          </Link>
        </div>

      </div>
    </header>
  )
}

/* ── Inline SVG icons (no external dependency) ───────────── */
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
