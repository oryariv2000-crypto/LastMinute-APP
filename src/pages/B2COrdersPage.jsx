import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import BottomNavigationB2C from '../components/BottomNavigation/BottomNavigationB2C'
import OrderHistoryList from '../components/OrderHistoryList/OrderHistoryList'
import './B2CPage.css'

/**
 * B2COrdersPage — Customer order history (active + completed).
 *
 * Route: /b2c/orders
 */
export default function B2COrdersPage() {
  const activeCount = MOCK_ORDERS.filter(o => o.status === 'active' || o.status === 'ready').length

  return (
    <div className="b2c-page" dir="rtl">
      <NavbarB2C location="תל אביב" userName="דנה כהן" />

      <main className="b2c-page__main">
        <header className="b2c-page__greeting">
          <h1 className="b2c-page__greeting-title">ההזמנות שלי</h1>
          <p className="b2c-page__greeting-sub">
            {activeCount > 0
              ? `${activeCount} הזמנות פעילות לאיסוף`
              : 'אין הזמנות פעילות כרגע'}
          </p>
        </header>

        <OrderHistoryList
          orders={MOCK_ORDERS}
          onReorder={(id) => console.log('reorder', id)}
        />
      </main>

      <BottomNavigationB2C orderCount={activeCount} />
    </div>
  )
}

/* ── Mock data ───────────────────────────────────────────────── */
const MOCK_ORDERS = [
  {
    id: 1,
    orderCode: 'LM-K7P9X',
    businessName: 'הפינה של מיכל',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop',
    date: 'היום · 17:30',
    itemsSummary: '1 פריט · סלטים',
    status: 'ready',
    total: 30,
  },
  {
    id: 2,
    orderCode: 'LM-A2B4M',
    businessName: 'מאפיית רחל',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    date: 'היום · 18:45',
    itemsSummary: '2 פריטים · מאפים',
    status: 'active',
    total: 18,
  },
  {
    id: 3,
    orderCode: 'LM-Q9F1W',
    businessName: 'Coffee Lab',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop',
    date: 'אתמול · 16:10',
    itemsSummary: '1 פריט · קפה',
    status: 'completed',
    total: 12,
  },
  {
    id: 4,
    orderCode: 'LM-T3R8N',
    businessName: 'Green Bowl',
    image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=400&h=400&fit=crop',
    date: '12.4.2026',
    itemsSummary: '1 פריט · מנה עיקרית',
    status: 'completed',
    total: 32,
  },
  {
    id: 5,
    orderCode: 'LM-J0E5C',
    businessName: 'הפינה של מיכל',
    image: 'https://images.unsplash.com/photo-1565299543923-37dd37887442?w=400&h=400&fit=crop',
    date: '8.4.2026',
    itemsSummary: '2 פריטים · קישים',
    status: 'cancelled',
    total: 44,
  },
]
