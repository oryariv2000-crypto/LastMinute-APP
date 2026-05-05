import NavbarB2B from '../components/NavbarB2B/NavbarB2B'
import BottomNavigationB2B from '../components/BottomNavigation/BottomNavigationB2B'
import DashboardSummary from '../components/DashboardSummary/DashboardSummary'
import NewDealButton from '../components/NewDealButton/NewDealButton'
import ActiveDealsSection from '../components/ActiveDealsSection/ActiveDealsSection'
import RecentActivitySection from '../components/RecentActivitySection/RecentActivitySection'
import './B2BPage.css'

/**
 * B2BDashboardPage — Business owner home screen.
 *
 * Route: /b2b/dashboard
 */
export default function B2BDashboardPage() {
  return (
    <div className="b2b-page" dir="rtl">
      <NavbarB2B businessName="הפינה של מיכל" isOpen notifCount={3} />

      <main className="b2b-page__main">
        <header className="b2b-page__greeting">
          <h1 className="b2b-page__greeting-title">שלום מיכל 👋</h1>
          <p className="b2b-page__greeting-sub">הנה סיכום היום שלך</p>
        </header>

        <DashboardSummary stats={MOCK_STATS} />

        <NewDealButton />

        <ActiveDealsSection
          deals={MOCK_DEALS}
          onEdit={(id) => console.log('edit', id)}
          onPause={(id) => console.log('pause', id)}
        />

        <RecentActivitySection items={MOCK_ACTIVITY} />
      </main>

      <BottomNavigationB2B notifCount={2} />
    </div>
  )
}

/* ── Mock data (placeholder until API hookup) ─────────────────── */
const MOCK_STATS = [
  {
    id: 'sales',
    label: 'מכירות היום',
    value: '₪842',
    delta: '+12% מאתמול',
    accent: 'success',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    ),
  },
  {
    id: 'orders',
    label: 'הזמנות פעילות',
    value: '8',
    delta: '+3 חדשות',
    accent: 'primary',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    ),
  },
  {
    id: 'saved',
    label: 'מזון שניצל',
    value: '14kg',
    delta: 'השבוע',
    accent: 'accent',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
    ),
  },
  {
    id: 'rating',
    label: 'דירוג ממוצע',
    value: '4.8★',
    delta: '23 ביקורות',
    accent: 'accent',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    ),
  },
]

const MOCK_DEALS = [
  {
    id: 1,
    title: 'מגש סלטים יום שלישי',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    originalPrice: 60,
    price: 30,
    discountPct: 50,
    quantity: 3,
    timeLeftMin: 45,
  },
  {
    id: 2,
    title: 'לחמניות בריוש טריות',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=300&fit=crop',
    originalPrice: 24,
    price: 12,
    discountPct: 50,
    quantity: 8,
    timeLeftMin: 25,
  },
  {
    id: 3,
    title: 'קישים גבינה ופטריות',
    image: 'https://images.unsplash.com/photo-1565299543923-37dd37887442?w=400&h=300&fit=crop',
    originalPrice: 35,
    price: 22,
    discountPct: 37,
    quantity: 5,
    timeLeftMin: 120,
  },
]

const MOCK_ACTIVITY = [
  {
    id: 'a1',
    type: 'sale',
    title: 'מכירה חדשה — מגש סלטים',
    subtitle: 'דנה כהן · #ORD-1041',
    timeAgo: 'לפני 5 דק׳',
    amount: 30,
  },
  {
    id: 'a2',
    type: 'pickup',
    title: 'הזמנה נאספה — קישים',
    subtitle: 'יוסי לוי · #ORD-1038',
    timeAgo: 'לפני 18 דק׳',
  },
  {
    id: 'a3',
    type: 'review',
    title: 'ביקורת חדשה ★ 5',
    subtitle: '״האוכל היה מצוין, ממליצה!״',
    timeAgo: 'לפני שעה',
  },
  {
    id: 'a4',
    type: 'expire',
    title: 'מבצע פג — בייגלה טרי',
    subtitle: 'נמכרו 4 מתוך 6',
    timeAgo: 'לפני שעתיים',
  },
]
