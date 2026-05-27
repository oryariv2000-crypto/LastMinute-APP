import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import OrderSummarySection from '../components/OrderSummarySection/OrderSummarySection'
import PaymentMethodsSection from '../components/PaymentMethodsSection/PaymentMethodsSection'
import SubmitButton from '../components/SubmitButton/SubmitButton'
import Loader from '../components/Loader/Loader'
import { getDealById, createOrder } from '../lib/db'
import './B2CPage.css'

/**
 * B2CCheckoutPage — Review the selected deal, choose payment, confirm order.
 * The deal id + quantity arrive via router state from the product page. On
 * pay it inserts a row into `orders` linked to the deal and the customer
 * (Step 18), then redirects to the confirmation screen with the order code.
 *
 * Route: /b2c/checkout
 */
export default function B2CCheckoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { dealId, quantity = 1 } = location.state || {}

  const [payment, setPayment] = useState('apple')
  const [deal, setDeal]       = useState(null)
  const [loadingDeal, setLoadingDeal] = useState(!!dealId)
  const [paying, setPaying]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!dealId) return
    let active = true
    ;(async () => {
      try {
        const row = await getDealById(dealId)
        if (active) setDeal(row)
      } catch (err) {
        if (active) setError(err?.message || 'שגיאה בטעינת המבצע')
      } finally {
        if (active) setLoadingDeal(false)
      }
    })()
    return () => { active = false }
  }, [dealId])

  const total = deal ? deal.discounted_price * quantity : 0

  const summaryItems = deal
    ? [{
        id: deal.id,
        title: deal.title,
        businessName: deal.businesses?.name,
        image: deal.image_url,
        originalPrice: deal.original_price,
        price: deal.discounted_price,
        quantity,
      }]
    : []

  async function handlePay() {
    if (!deal) return
    setPaying(true)
    setError('')
    try {
      const order = await createOrder({ deal_id: deal.id, quantity, total })
      navigate(`/b2c/confirmation?code=${encodeURIComponent(order.order_code)}`)
    } catch (err) {
      setError(err?.message || 'יצירת ההזמנה נכשלה')
      setPaying(false)
    }
  }

  // No deal in state (e.g. user hit /checkout directly) — bounce home.
  if (!dealId && !loadingDeal) {
    return (
      <div className="b2c-page" dir="rtl">
        <NavbarB2C location="תל אביב" userName="דנה כהן" />
        <main className="b2c-page__main">
          <div className="product-grid__empty">
            <span aria-hidden="true">🛒</span>
            <p>אין פריט לתשלום. חזור לפיד ובחר מבצע.</p>
            <button className="btn btn-primary" style={{ marginTop: 'var(--space-3)' }} onClick={() => navigate('/b2c/home')}>
              לפיד המבצעים
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="b2c-page b2c-page--with-bar" dir="rtl">
      <NavbarB2C location="תל אביב" userName="דנה כהן" />

      <main className="b2c-page__main">
        <header className="b2c-page__greeting">
          <button type="button" className="b2c-page__back" onClick={() => navigate(-1)} aria-label="חזרה">
            <ChevronStartIcon /> חזרה
          </button>
          <h1 className="b2c-page__greeting-title">תשלום</h1>
          <p className="b2c-page__greeting-sub">בדיקה אחרונה לפני אישור</p>
        </header>

        {error && (
          <p className="b2c-page__greeting-sub" role="alert" style={{ color: 'var(--color-error)' }}>
            {error}
          </p>
        )}

        {loadingDeal ? (
          <Loader label="טוען…" />
        ) : (
          <>
            <OrderSummarySection items={summaryItems} serviceFee={0} />
            <PaymentMethodsSection value={payment} onChange={setPayment} cardLast4="4242" />
          </>
        )}
      </main>

      <div className="b2c-pay-bar" role="toolbar" aria-label="תשלום">
        <div className="b2c-pay-bar__total">
          <span className="b2c-pay-bar__total-label">סה״כ</span>
          <span className="b2c-pay-bar__total-value">₪{total}</span>
        </div>
        <SubmitButton
          loading={paying}
          variant="action"
          onClick={handlePay}
          fullWidth={false}
          id="b2c-pay-btn"
        >
          {payment === 'apple' ? '🍎 שלם עם Apple Pay' : 'שלם בכרטיס'}
        </SubmitButton>
      </div>
    </div>
  )
}

function ChevronStartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
