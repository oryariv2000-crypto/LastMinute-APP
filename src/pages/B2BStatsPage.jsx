import { useEffect, useState } from 'react'
import NavbarB2B from '../components/NavbarB2B/NavbarB2B'
import BottomNavigationB2B from '../components/BottomNavigation/BottomNavigationB2B'
import RevenueCard from '../components/RevenueCard/RevenueCard'
import StatsChartsSection from '../components/StatsChartsSection/StatsChartsSection'
import Loader from '../components/Loader/Loader'
import { fetchBusinessStats } from '../lib/db'
import { useProfile } from '../lib/useProfile'
import './B2BPage.css'

/**
 * B2BStatsPage — Revenue + performance overview, computed server-side by the
 * get_business_stats() RPC and rendered live (no client-side aggregation).
 *
 * Route: /b2b/stats
 */
export default function B2BStatsPage() {
  const { business } = useProfile({ withBusiness: true })

  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await fetchBusinessStats() // defaults to the current owner's business
        if (active) setStats(data)
      } catch (err) {
        if (active) setError(err?.message || 'שגיאה בטעינת הסטטיסטיקות')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const revenue = stats ? `₪${stats.total_revenue.toLocaleString('he-IL')}` : '—'

  return (
    <div className="b2b-page" dir="rtl">
      <NavbarB2B businessName={business?.name || 'העסק שלי'} isOpen notifCount={0} />

      <main className="b2b-page__main">
        <header className="b2b-page__greeting">
          <h1 className="b2b-page__greeting-title">סטטיסטיקות</h1>
          <p className="b2b-page__greeting-sub">סקירת ביצועים והכנסות בזמן אמת</p>
        </header>

        {error ? (
          <div className="active-deals-section__empty" role="alert">
            <span aria-hidden="true">⚠️</span>
            <p>{error}</p>
          </div>
        ) : loading ? (
          <Loader label="טוען נתונים…" />
        ) : (
          <>
            <RevenueCard
              label="סך הכנסות"
              value={revenue}
              subtitle="מכל ההזמנות"
              variant="primary"
            />

            <div className="b2b-page__row-2">
              <RevenueCard
                label="הזמנות"
                value={String(stats.total_orders)}
                variant="success"
              />
              <RevenueCard
                label="מבצעים פעילים"
                value={String(stats.active_deals_count)}
                variant="accent"
              />
            </div>

            <StatsChartsSection />
          </>
        )}
      </main>

      <BottomNavigationB2B notifCount={0} />
    </div>
  )
}
