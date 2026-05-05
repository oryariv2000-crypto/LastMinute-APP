import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import OrderSummarySection from '../components/OrderSummarySection/OrderSummarySection'
import PaymentMethodsSection from '../components/PaymentMethodsSection/PaymentMethodsSection'
import SubmitButton from '../components/SubmitButton/SubmitButton'
import './B2CPage.css'

/**
 * B2CCheckoutPage — Review cart, choose payment, confirm order.
 *
 * Route: /b2c/checkout
 */
export default function B2CCheckoutPage() {
  const navigate = useNavigate()
  const [payment, setPayment] = useState('apple')
  const [loading, setLoading] = useState(false)

  const items = MOCK_CART
  const subtotal     = items.reduce((s, it) => s + it.price * it.quantity, 0)
  const SERVICE_FEE  = 0
  const total        = subtotal + SERVICE_FEE

  async function handlePay() {
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 1300))
      const orderCode = `LM-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
      navigate(`/b2c/confirmation?code=${encodeURIComponent(orderCode)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="b2c-page b2c-page--with-bar" dir="rtl">
      <NavbarB2C location="תל אביב" userName="דנה כהן" />

      <main className="b2c-page__main">
        <header className="b2c-page__greeting">
          <button
            type="button"
            className="b2c-page__back"
            onClick={() => navigate(-1)}
            aria-label="חזרה"
          >
            <ChevronStartIcon /> חזרה
          </button>
          <h1 className="b2c-page__greeting-title">תשלום</h1>
          <p className="b2c-page__greeting-sub">בדיקה אחרונה לפני אישור</p>
        </header>

        <OrderSummarySection items={items} serviceFee={SERVICE_FEE} />

        <PaymentMethodsSection
          value={payment}
          onChange={setPayment}
          cardLast4="4242"
        />
      </main>

      {/* Sticky pay bar */}
      <div className="b2c-pay-bar" role="toolbar" aria-label="תשלום">
        <div className="b2c-pay-bar__total">
          <span className="b2c-pay-bar__total-label">סה״כ</span>
          <span className="b2c-pay-bar__total-value">₪{total}</span>
        </div>
        <SubmitButton
          loading={loading}
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

/* ── Mock cart ───────────────────────────────────────────────── */
const MOCK_CART = [
  {
    id: 1,
    title: 'מגש סלטים יום שלישי',
    businessName: 'הפינה של מיכל',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop',
    originalPrice: 60,
    price: 30,
    quantity: 1,
  },
  {
    id: 2,
    title: 'בייגלה שומשום טרי',
    businessName: 'מאפיית רחל',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    originalPrice: 18,
    price: 9,
    quantity: 2,
  },
]
