import NavbarB2B from '../components/NavbarB2B/NavbarB2B'
import BottomNavigationB2B from '../components/BottomNavigation/BottomNavigationB2B'
import RevenueCard from '../components/RevenueCard/RevenueCard'
import StatsChartsSection from '../components/StatsChartsSection/StatsChartsSection'
import './B2BPage.css'

/**
 * B2BStatsPage — Revenue + performance overview for the business.
 *
 * Route: /b2b/stats
 */
export default function B2BStatsPage() {
  return (
    <div className="b2b-page" dir="rtl">
      <NavbarB2B businessName="הפינה של מיכל" isOpen notifCount={3} />

      <main className="b2b-page__main">
        <header className="b2b-page__greeting">
          <h1 className="b2b-page__greeting-title">סטטיסטיקות</h1>
          <p className="b2b-page__greeting-sub">סקירת ביצועים, הכנסות וקיימות</p>
        </header>

        <RevenueCard
          label="סך הכנסות החודש"
          value="₪12,450"
          subtitle="ינואר 2026"
          delta="+18% מהחודש שעבר"
          trend="up"
          variant="primary"
        />

        <div className="b2b-page__row-2">
          <RevenueCard
            label="מכירות"
            value="187"
            delta="+24"
            trend="up"
            variant="success"
          />
          <RevenueCard
            label="מזון שניצל"
            value="58 ק״ג"
            delta="≈ 145 ארוחות"
            trend="up"
            variant="accent"
          />
        </div>

        <StatsChartsSection />
      </main>

      <BottomNavigationB2B notifCount={2} />
    </div>
  )
}
