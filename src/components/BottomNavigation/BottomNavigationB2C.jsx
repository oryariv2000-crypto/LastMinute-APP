import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMyOrders } from '../../lib/db'
import { ACTIVE_STATUSES } from '../../lib/orderStatus'
import './BottomNavigation.css'

/**
 * BottomNavigationB2C — Fixed bottom tab bar for end customers.
 *
 * Tabs: Home · Explore · Orders · Profile
 *
 * The Orders badge shows the customer's active (awaiting-pickup) order count.
 * By default the bar fetches it itself (shared, cached query) so every page is
 * consistent. A page that already has the orders loaded can pass `orderCount`
 * to override and skip the extra fetch.
 *
 * Props:
 *   orderCount  number — optional badge override (0 = hidden). When omitted, the
 *               count is fetched live from Supabase.
 */
export default function BottomNavigationB2C({ orderCount }) {
  const { pathname } = useLocation()

  const { data: fetchedCount = 0 } = useQuery({
    queryKey: ['my-orders-active-count'],
    queryFn: async () => {
      const rows = await getMyOrders()
      return rows.filter((o) => ACTIVE_STATUSES.includes(o.status)).length
    },
    enabled: orderCount === undefined, // skip when a page supplies the count
  })
  const badgeCount = orderCount ?? fetchedCount

  const tabs = [
    {
      id:    'b2c-tab-home',
      to:    '/b2c/home',
      label: 'ראשי',
      icon:  <HomeIcon />,
      match: '/b2c/home',
    },
    {
      id:    'b2c-tab-explore',
      to:    '/b2c/explore',
      label: 'גלה',
      icon:  <CompassIcon />,
      match: '/b2c/explore',
    },
    {
      id:    'b2c-tab-orders',
      to:    '/b2c/orders',
      label: 'הזמנות',
      icon:  <BagIcon />,
      match: '/b2c/orders',
      badge: badgeCount,
    },
    {
      id:    'b2c-tab-profile',
      to:    '/b2c/profile',
      label: 'פרופיל',
      icon:  <UserIcon />,
      match: '/b2c/profile',
    },
  ]

  return (
    <nav className="bottom-nav bottom-nav--b2c" aria-label="ניווט ראשי">
      <div className="bottom-nav__inner">
        {tabs.map((tab) => {
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
                  <span className="bottom-nav__badge" aria-label={`${tab.badge} הזמנות`}>
                    {tab.badge}
                  </span>
                )}
              </span>
              <span className="bottom-nav__label">{tab.label}</span>
            </Link>
          )
        })}
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

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
