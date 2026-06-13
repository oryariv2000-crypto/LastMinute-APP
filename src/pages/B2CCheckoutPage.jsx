import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import OrderSummarySection from '../components/OrderSummarySection/OrderSummarySection'
import PaymentMethodsSection from '../components/PaymentMethodsSection/PaymentMethodsSection'
import SubmitButton from '../components/SubmitButton/SubmitButton'
import Loader from '../components/Loader/Loader'
import { getDealById, createOrder } from '../lib/db'
import { getPaymentProvider, PAYMENT_STATUS } from '../lib/payments'
import DevelopmentNotice from '../components/DevelopmentNotice/DevelopmentNotice'
import { Price } from '../lib/formatters'
import { useProfile } from '../lib/useProfile'
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
  const { profile } = useProfile()
  const userName = profile?.full_name || 'לקוח/ה'
  const queryClient = useQueryClient()
  const { dealId, quantity = 1 } = location.state || {}

  const [payment, setPayment] = useState('apple')
  const [agreed, setAgreed]   = useState(false) // must confirm self-pickup before paying
  const [deal, setDeal]       = useState(null)
  const [loadingDeal, setLoadingDeal] = useState(!!dealId)
  const [status, setStatus]   = useState(PAYMENT_STATUS.IDLE) // idle → pending → success/failed
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

  const total = deal ? deal.discount_price * quantity : 0

  const summaryItems = deal
    ? [{
        id: deal.id,
        title: deal.title,
        businessName: deal.businesses?.name,
        image: deal.image_url,
        originalPrice: deal.original_price,
        price: deal.discount_price,
        quantity,
      }]
    : []

  async function handlePay() {
    if (!deal || !agreed) return
    setStatus(PAYMENT_STATUS.PENDING)
    setError('')
    try {
      // 1) Authorize through the payment provider. Currently a placeholder that
      //    does NOT charge (see lib/payments.js); swap getPaymentProvider() for
      //    a real Stripe/Tranzila provider to go live — no changes needed here.
      const provider = getPaymentProvider()
      const payment_result = await provider.authorize({
        amount: total,
        method: payment,
        metadata: { dealId: deal.id, quantity },
      })
      if (payment_result.status !== PAYMENT_STATUS.SUCCESS) {
        setError(payment_result.error || 'התשלום נכשל')
        setStatus(PAYMENT_STATUS.FAILED)
        return
      }

      // 2) Payment authorized → place the order. The TOTAL is recomputed
      //    server-side by place_order() (never trusted from the client).
      const order = await createOrder({ deal_id: deal.id, quantity })
      // Order placed: stock changed server-side + a new active order exists,
      // so drop the caches that reflect them.
      queryClient.invalidateQueries({ queryKey: ['my-orders-active-count'] })
      queryClient.invalidateQueries({ queryKey: ['my-impact'] })
      queryClient.invalidateQueries({ queryKey: ['deal', deal.id] })
      setStatus(PAYMENT_STATUS.SUCCESS)
      navigate(`/b2c/confirmation?code=${encodeURIComponent(order.order_code)}`)
    } catch (err) {
      setError(err?.message || 'יצירת ההזמנה נכשלה')
      setStatus(PAYMENT_STATUS.FAILED)
    }
  }

  // No deal in state (e.g. user hit /checkout directly) — bounce home.
  if (!dealId && !loadingDeal) {
    return (
      <div className="b2c-page" dir="rtl">
        <NavbarB2C userName={userName} showSearch={false} />
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
      <NavbarB2C userName={userName} showSearch={false} />

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

            {/* Self-pickup acknowledgement — required before paying, so no one
                mistakes this for a delivery service. Kept high on the page so
                it's always visible (not hidden behind the sticky pay bar). */}
            <label className={`b2c-pickup-ack${agreed ? ' b2c-pickup-ack--checked' : ''}`}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                קראתי והבנתי שמדובר ב<strong>איסוף עצמי בלבד</strong> מסניף {deal?.businesses?.name || 'העסק'} — ללא משלוח
              </span>
            </label>

            <PaymentMethodsSection value={payment} onChange={setPayment} />

            <DevelopmentNotice variant="banner" title="תכונה בפיתוח — תשלום">
              זהו מציין מקום לאינטגרציית תשלום אמיתית (Stripe / טרנזילה). לא יבוצע חיוב אמיתי.
            </DevelopmentNotice>

            {!agreed && (
              <p className="b2c-checkout-hint" role="note">
                כדי להמשיך — סמן/י שהבנת שמדובר באיסוף עצמי
              </p>
            )}
          </>
        )}
      </main>

      <div className="b2c-pay-bar" role="toolbar" aria-label="תשלום">
        <div className="b2c-pay-bar__total">
          <span className="b2c-pay-bar__total-label">סה״כ</span>
          <Price value={total} fraction={0} className="b2c-pay-bar__total-value" />
        </div>
        <SubmitButton
          loading={status === PAYMENT_STATUS.PENDING}
          variant="action"
          onClick={handlePay}
          fullWidth={false}
          disabled={!agreed}
          id="b2c-pay-btn"
        >
          {payment === 'apple' ? '🍎 שלם ובוא לאסוף' : 'שלם ובוא לאסוף'}
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
