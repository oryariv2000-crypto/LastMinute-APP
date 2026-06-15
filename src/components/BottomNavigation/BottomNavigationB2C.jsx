import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMyOrders } from '../../lib/db'
import { ACTIVE_STATUSES } from '../../lib/orderStatus'
import { HomeIcon, UserIcon, ShoppingBagIcon, CompassIcon } from '../icons'
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
      icon:  <ShoppingBagIcon />,
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

