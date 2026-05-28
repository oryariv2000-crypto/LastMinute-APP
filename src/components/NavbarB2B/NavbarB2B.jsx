import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import NotificationsBell from '../NotificationsBell/NotificationsBell'
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
  avatarUrl,
}) {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

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
          {/* Notifications center */}
          <NotificationsBell />

          {/* Avatar / Profile */}
          <Link
            to="/b2b/profile"
            className="navbar-b2b__avatar"
            aria-label={`פרופיל — ${businessName}`}
            id="b2b-nav-avatar"
          >
            {avatarUrl ? (
              <img className="navbar-b2b__avatar-img" src={avatarUrl} alt="" />
            ) : (
              derivedInitials
            )}
          </Link>

          {/* Logout */}
          <button
            className="navbar-b2b__icon-btn"
            onClick={handleLogout}
            aria-label="התנתקות"
            id="b2b-nav-logout"
          >
            <LogoutIcon />
          </button>
        </div>

      </div>
    </header>
  )
}

/* ── Inline SVG icons (no external dependency) ───────────── */
function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
