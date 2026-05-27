import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import BottomNavigationB2C from '../components/BottomNavigation/BottomNavigationB2C'
import OrderHistoryList from '../components/OrderHistoryList/OrderHistoryList'
import Loader from '../components/Loader/Loader'
import { getMyOrders } from '../lib/db'
import { useProfile } from '../lib/useProfile'
import './B2CPage.css'

/**
 * B2COrdersPage — Customer order history (active + completed), read live from
 * Supabase and scoped to the current customer by RLS.
 *
 * Route: /b2c/orders
 */
export default function B2COrdersPage() {
  const { profile } = useProfile()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const rows = await getMyOrders()
        if (active) setOrders(rows)
      } catch (err) {
        if (active) setError(err?.message || 'שגיאה בטעינת ההזמנות')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const cards = orders.map((o) => ({
    id: o.id,
    orderCode: o.order_code,
    businessName: o.deals?.businesses?.name ?? '',
    image: o.deals?.image_url,
    date: new Date(o.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }),
    itemsSummary: `${o.quantity ?? 1} פריטים · ${o.deals?.title ?? ''}`,
    status: o.status,
    total: o.total,
  }))

  const activeCount = cards.filter(
    (o) => o.status === 'pending' || o.status === 'active' || o.status === 'ready',
  ).length

  return (
    <div className="b2c-page" dir="rtl">
      <NavbarB2C location="תל אביב" userName={profile?.full_name || 'לקוח/ה'} />

      <main className="b2c-page__main">
        <header className="b2c-page__greeting">
          <h1 className="b2c-page__greeting-title">ההזמנות שלי</h1>
          <p className="b2c-page__greeting-sub">
            {loading
              ? 'ההזמנות שלך, במקום אחד'
              : activeCount > 0
                ? `${activeCount} הזמנות פעילות לאיסוף`
                : 'אין הזמנות פעילות כרגע'}
          </p>
        </header>

        {error ? (
          <div className="product-grid__empty" role="alert">
            <span aria-hidden="true">⚠️</span>
            <p>{error}</p>
          </div>
        ) : loading ? (
          <Loader label="טוען הזמנות…" />
        ) : cards.length === 0 ? (
          <div
            style={{
              minHeight: '60vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-6)',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: '3.25rem' }}>🧾</span>
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>
              עדיין אין לך הזמנות
            </h2>
            <p style={{ margin: 0, maxWidth: 320, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              ההזמנות שתבצע יופיעו כאן. צא לגלות מבצעים אחרונים בקרבתך.
            </p>
            <Link to="/b2c/home" className="btn btn-primary" style={{ marginTop: 'var(--space-2)', minWidth: 180 }}>
              גלה מבצעים
            </Link>
          </div>
        ) : (
          <OrderHistoryList orders={cards} onReorder={() => {}} />
        )}
      </main>

      <BottomNavigationB2C orderCount={activeCount} />
    </div>
  )
}
