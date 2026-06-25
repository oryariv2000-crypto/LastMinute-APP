import { Link, useLocation } from 'react-router-dom'
import { HomeIcon, PlusIcon, BarChartIcon, ShoppingBagIcon, SettingsIcon } from '../icons'
import './BottomNavigation.css'

/**
 * BottomNavigationB2B — Fixed bottom tab bar for business owners.
 *
 * Tabs: Home · Orders · [Publish FAB] · Stats · Settings
 *
 * The center slot is a floating action button (FAB) for "Publish Deal"
 * — styled with the Sunset Orange accent color from the design system.
 * The tabs are split evenly (two each side) so the FAB sits dead-center
 * on every screen width. Settings links to the business profile/settings
 * page (also reachable from the top-bar avatar).
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
      id:    'b2b-tab-orders',
      to:    '/b2b/orders',
      label: 'הזמנות',
      icon:  <ShoppingBagIcon />,
      match: '/b2b/orders',
    },
  ]

  const rightTabs = [
    {
      id:    'b2b-tab-stats',
      to:    '/b2b/stats',
      label: 'סטטיסטיקות',
      icon:  <BarChartIcon />,
      match: '/b2b/stats',
    },
    {
      id:    'b2b-tab-settings',
      to:    '/b2b/profile',
      label: 'הגדרות',
      icon:  <SettingsIcon />,
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
