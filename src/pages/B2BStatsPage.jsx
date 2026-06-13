import { useEffect, useState } from 'react'
import NavbarB2B from '../components/NavbarB2B/NavbarB2B'
import BottomNavigationB2B from '../components/BottomNavigation/BottomNavigationB2B'
import RevenueCard from '../components/RevenueCard/RevenueCard'
import StatsChartsSection from '../components/StatsChartsSection/StatsChartsSection'
import Loader from '../components/Loader/Loader'
import {
  periodRange,
  fetchBusinessStats,
  fetchSalesTimeseries,
  fetchTopProducts,
} from '../lib/db'
import { useProfile } from '../lib/useProfile'
import { isBusinessOpen } from '../lib/businessHours'
import './B2BPage.css'

/**
 * B2BStatsPage — Revenue + performance overview computed from live orders.
 * The 7/30/90-day switcher drives the whole page (headline cards + charts).
 * Counts every order that wasn't cancelled; revenue = sum of order totals.
 *
 * Route: /b2b/stats
 */
const PERIODS = [
  { id: '7d',  label: '7 ימים' },
  { id: '30d', label: '30 ימים' },
  { id: '90d', label: '90 ימים' },
]

export default function B2BStatsPage() {
  const { business } = useProfile({ withBusiness: true })

  const [period, setPeriod]   = useState('7d')
  const [stats, setStats]     = useState(null)
  const [bars, setBars]       = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    let active = true
    const { from, to, bucket } = periodRange(period)
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const [s, series, top] = await Promise.all([
          fetchBusinessStats({ from, to }),
          fetchSalesTimeseries({ from, to, bucket }),
          fetchTopProducts({ from, to }),
        ])
        if (!active) return
        setStats(s)
        setBars(series.map((r) => ({ label: bucketLabel(r.start, bucket), value: r.revenue })))
        setProducts(top)
      } catch (err) {
        if (active) setError(err?.message || 'שגיאה בטעינת הסטטיסטיקות')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [period])

  const revenue = stats ? `₪${stats.total_revenue.toLocaleString('he-IL')}` : '—'

  return (
    <div className="b2b-page" dir="rtl">
      <NavbarB2B businessName={business?.name || 'העסק שלי'} avatarUrl={business?.logo_url} isOpen={isBusinessOpen(business)} notifCount={0} />

      <main className="b2b-page__main">
        <header className="b2b-page__greeting">
          <h1 className="b2b-page__greeting-title">סטטיסטיקות</h1>
          <p className="b2b-page__greeting-sub">סקירת ביצועים והכנסות לפי הזמנות</p>
        </header>

        {/* Period switcher — drives the whole page */}
        <div className="stats-charts__tabs" role="tablist" aria-label="טווח זמן">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={period === p.id}
              className={`stats-charts__tab${period === p.id ? ' stats-charts__tab--active' : ''}`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

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
              subtitle={`מ-${stats.total_orders.toLocaleString('he-IL')} הזמנות · ${periodSub(period)}`}
              variant="primary"
            />

            <div className="b2b-page__row-2">
              <RevenueCard
                label="הזמנות"
                value={stats.total_orders.toLocaleString('he-IL')}
                variant="success"
              />
              <RevenueCard
                label="מבצעים פעילים"
                value={String(stats.active_deals_count)}
                variant="accent"
              />
            </div>

            <StatsChartsSection bars={bars} products={products} barsTitle={periodSub(period)} />
          </>
        )}
      </main>

      <BottomNavigationB2B notifCount={0} />
    </div>
  )
}

/* Label a bucket start by granularity: weekday letter / d.m / short month.
 * All formatting is done in Asia/Jerusalem so labels match the server buckets
 * regardless of the browser's local timezone. */
const _jFmt = (opts) => new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', ...opts })
const _jDay  = _jFmt({ weekday: 'narrow' })
const _jDate = _jFmt({ day: 'numeric', month: 'numeric' })
const _jMon  = _jFmt({ month: 'short' })

function bucketLabel(date, bucket) {
  if (bucket === 'day')  return _jDay.format(date)
  if (bucket === 'week') return _jDate.format(date)
  return _jMon.format(date)
}

function periodSub(period) {
  if (period === '90d') return '90 ימים אחרונים'
  if (period === '30d') return '30 ימים אחרונים'
  return '7 ימים אחרונים'
}
