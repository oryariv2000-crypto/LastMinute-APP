import { Link, useLocation } from 'react-router-dom'
import './BottomNavigation.css'

/**
 * BottomNavigationB2B — Fixed bottom tab bar for business owners.
 *
 * Tabs: Home · Stats · [Publish FAB] · Deals · Profile
 *
 * The center slot is a floating action button (FAB) for "Publish Deal"
 * — styled with the Sunset Orange accent color from the design system.
 *
 * Props:
 *   notifCount  number — badge on Home tab (pending orders / alerts)
 */
export default function BottomNavigationB2B({ notifCount = 5 }) {
  const { pathname } = useLocation()

  const leftTabs = [
    {
      id:    'b2b-tab-home',
      to:    '/b2b/dashboard',
      label: 'ראשי',
      icon:  <HomeIcon />,
      match: '/b2b/dashboard',
      badge: notifCount,
    },
    {
      id:    'b2b-tab-stats',
      to:    '/b2b/stats',
      label: 'סטטיסטיקות',
      icon:  <BarChartIcon />,
      match: '/b2b/stats',
    },
  ]

  const rightTabs = [
    {
      id:    'b2b-tab-deals',
      to:    '/b2b/deals',
      label: 'מבצעים',
      icon:  <TagIcon />,
      match: '/b2b/deals',
    },
    {
      id:    'b2b-tab-profile',
      to:    '/b2b/profile',
      label: 'פרופיל',
      icon:  <StoreIcon />,
      match: '/b2b/profile',
    },
  ]

  function renderTab(tab) {
    const isActive = pathname.startsWith(tab.match)
    return (
      <Link
        key={tab.id}
        id={tab.id}
        to={tab.to}
        className={`bottom-nav__tab${isActive ? ' bottom-nav__tab--active' : ''}`}
        aria-label={tab.label}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="bottom-nav__icon">
          {tab.icon}
          {tab.badge > 0 && (
            <span className="bottom-nav__badge" aria-label={`${tab.badge} התראות`}>
              {tab.badge > 9 ? '9+' : tab.badge}
            </span>
          )}
        </span>
        <span className="bottom-nav__label">{tab.label}</span>
      </Link>
    )
  }

  return (
    <nav className="bottom-nav" aria-label="ניווט לעסקים">
      <div className="bottom-nav__inner">
        {leftTabs.map(renderTab)}

        {/* ── Center FAB — Publish new deal ───────────── */}
        <Link
          id="b2b-tab-publish"
          to="/b2b/new-deal"
          className="bottom-nav__fab"
          aria-label="פרסם מבצע חדש"
        >
          <span className="bottom-nav__fab-btn">
            <PlusIcon />
          </span>
          <span className="bottom-nav__fab-label">פרסם</span>
        </Link>

        {rightTabs.map(renderTab)}
      </div>
    </nav>
  )
}

/* ── Icons ──────────────────────────────────────────────────── */
function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function BarChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="14" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l1-6h16l1 6" />
      <path d="M3 9a2 2 0 1 0 4 0 2 2 0 1 0 4 0 2 2 0 1 0 4 0 2 2 0 1 0 4 0" />
      <path d="M5 9v12h14V9" />
      <rect x="9" y="14" width="6" height="7" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
