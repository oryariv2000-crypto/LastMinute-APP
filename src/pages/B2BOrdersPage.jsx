import { useCallback, useEffect, useState } from 'react'
import NavbarB2B from '../components/NavbarB2B/NavbarB2B'
import BottomNavigationB2B from '../components/BottomNavigation/BottomNavigationB2B'
import OrderQrScanner from '../components/OrderQrScanner/OrderQrScanner'
import Loader from '../components/Loader/Loader'
import { Price, Ltr } from '../lib/formatters'
import { CheckIcon, SearchIcon, ShoppingBagIcon } from '../components/icons'
import { getMyBusinessOrders, completeOrder, completeOrderByCode } from '../lib/db'
import { useProfile } from '../lib/useProfile'
import { isActiveStatus } from '../lib/orderStatus'
import { isBusinessOpen } from '../lib/businessHours'
import './B2BPage.css'
import './B2BOrdersPage.css'

/**
 * B2BOrdersPage — Orders Management for business owners. Closes the pickup loop
 * three ways, all landing on the same complete_order flow:
 *   1. a list of open (pending/ready) orders, each with "סמן כנאסף"
 *   2. a quick code field — type the order_code the customer presents
 *   3. a camera QR scanner (bonus) that reads the order_code off their pickup QR
 *
 * Completing an order updates its status to 'completed' in the DB and drops it
 * from the open list immediately.
 *
 * Route: /b2b/orders
 */
export default function B2BOrdersPage() {
  const { profile, business } = useProfile({ withBusiness: true })

  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [code, setCode]       = useState('')
  const [busyId, setBusyId]   = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [scanning, setScanning]   = useState(false)
  const [feedback, setFeedback]   = useState(null) // { tone: 'ok' | 'err', text }

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const rows = await getMyBusinessOrders()
        if (active) setOrders(rows)
      } catch (err) {
        if (active) setError(err?.message || 'שגיאה בטעינת ההזמנות')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const openOrders = orders.filter((o) => isActiveStatus(o.status))

  // Mark a listed order collected via its id (the per-row button).
  async function handleCollect(orderId) {
    setBusyId(orderId)
    setFeedback(null)
    try {
      await completeOrder(orderId)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'completed' } : o)))
      setFeedback({ tone: 'ok', text: 'ההזמנה סומנה כנאספה ✓' })
    } catch (err) {
      setFeedback({ tone: 'err', text: err?.message || 'עדכון ההזמנה נכשל' })
    } finally {
      setBusyId(null)
    }
  }

  // Verify-and-complete by the code the customer presents (typed or scanned).
  const verifyCode = useCallback(async (raw) => {
    const value = (raw ?? '').trim()
    if (!value) return
    setVerifying(true)
    setFeedback(null)
    try {
      const updated = await completeOrderByCode(value)
      // Reflect it in the list too, in case the order was shown there.
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, status: 'completed' } : o)))
      setFeedback({ tone: 'ok', text: `הזמנה ${updated.order_code} סומנה כנאספה ✓` })
      setCode('')
    } catch (err) {
      setFeedback({ tone: 'err', text: err?.message || 'אימות ההזמנה נכשל' })
    } finally {
      setVerifying(false)
    }
  }, [])

  function handleSubmitCode(e) {
    e.preventDefault()
    verifyCode(code)
  }

  const handleScan = useCallback((text) => {
    setScanning(false)
    verifyCode(text)
  }, [verifyCode])

  const businessName = business?.name || profile?.full_name || 'העסק שלי'

  return (
    <div className="b2b-page" dir="rtl">
      <NavbarB2B businessName={businessName} avatarUrl={business?.logo_url} isOpen={isBusinessOpen(business)} notifCount={0} />

      <main className="b2b-page__main">
        <header className="b2b-page__greeting">
          <h1 className="b2b-page__greeting-title">ניהול הזמנות</h1>
          <p className="b2b-page__greeting-sub">אמת/י איסוף וסגור/י הזמנות שממתינות לאיסוף</p>
        </header>

        {/* ── Quick verification: code field + QR scanner ───────────── */}
        <section className="orders-verify" aria-label="אימות הזמנה לאיסוף">
          <form className="orders-verify__form" onSubmit={handleSubmitCode}>
            <label className="orders-verify__label" htmlFor="order-code-input">קוד הזמנה</label>
            <div className="orders-verify__row">
              <input
                id="order-code-input"
                className="orders-verify__input"
                type="text"
                inputMode="latin"
                autoComplete="off"
                placeholder="לדוגמה: LM-AB123"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button
                type="submit"
                className="orders-verify__btn"
                disabled={verifying || !code.trim()}
              >
                <SearchIcon /> אמת קוד
              </button>
            </div>
          </form>

          <button
            type="button"
            className="orders-verify__scan"
            onClick={() => { setFeedback(null); setScanning((s) => !s) }}
            aria-expanded={scanning}
          >
            {scanning ? 'בטל סריקה' : 'סרוק QR'}
          </button>

          {scanning && (
            <OrderQrScanner
              onScan={handleScan}
              onError={() => setFeedback({ tone: 'err', text: 'לא ניתן לפתוח את המצלמה. השתמש/י בהזנת קוד.' })}
              onClose={() => setScanning(false)}
            />
          )}

          {feedback && (
            <p
              className={`orders-verify__feedback orders-verify__feedback--${feedback.tone}`}
              role={feedback.tone === 'err' ? 'alert' : 'status'}
            >
              {feedback.text}
            </p>
          )}
        </section>

        {/* ── Open orders list ──────────────────────────────────────── */}
        {error ? (
          <div className="active-deals-section__empty" role="alert">
            <span aria-hidden="true">⚠️</span>
            <p>{error}</p>
          </div>
        ) : loading ? (
          <Loader label="טוען הזמנות…" />
        ) : openOrders.length === 0 ? (
          <div className="orders-empty">
            <span aria-hidden="true" className="orders-empty__emoji">✅</span>
            <h2 className="orders-empty__title">אין הזמנות ממתינות לאיסוף</h2>
            <p className="orders-empty__sub">הזמנות חדשות יופיעו כאן ברגע שלקוחות יזמינו.</p>
          </div>
        ) : (
          <ul className="orders-list" aria-label="הזמנות ממתינות לאיסוף">
            {openOrders.map((o) => (
              <li key={o.id} className="order-row">
                <span className="order-row__icon" aria-hidden="true"><ShoppingBagIcon /></span>
                <div className="order-row__body">
                  <p className="order-row__title">{o.deals?.title || 'הזמנה'}</p>
                  <p className="order-row__meta">
                    {o.users?.full_name && <span className="order-row__customer">{o.users.full_name}</span>}
                    <span className="order-row__code">קוד: <Ltr>{o.order_code}</Ltr></span>
                    <span className="order-row__qty">{o.quantity ?? 1} יח׳</span>
                  </p>
                </div>
                <div className="order-row__side">
                  <Price value={o.total ?? 0} fraction={0} className="order-row__total" />
                  <button
                    type="button"
                    className="order-row__collect"
                    onClick={() => handleCollect(o.id)}
                    disabled={busyId === o.id}
                  >
                    <CheckIcon /> סמן כנאסף
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <BottomNavigationB2B notifCount={0} />
    </div>
  )
}
