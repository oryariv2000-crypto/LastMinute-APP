import { useNavigate, useSearchParams } from 'react-router-dom'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import QRCodeDisplay from '../components/QRCodeDisplay/QRCodeDisplay'
import PickupInstructions from '../components/PickupInstructions/PickupInstructions'
import './B2CPage.css'

/**
 * B2CConfirmationPage — Order confirmation with QR for pickup.
 *
 * Route: /b2c/confirmation  (order code passed via ?code=… query string)
 */
export default function B2CConfirmationPage() {
  const [searchParams] = useSearchParams()
  const orderCode = searchParams.get('code') || 'LM-DEMO1'
  const navigate = useNavigate()

  // In a real app this would be fetched by orderCode.
  const order = MOCK_ORDER

  return (
    <div className="b2c-page" dir="rtl">
      <NavbarB2C location="תל אביב" userName="דנה כהן" />

      <main className="b2c-page__main">
        {/* Hero / success banner */}
        <section className="b2c-confirm-hero">
          <span className="b2c-confirm-hero__check" aria-hidden="true">
            <CheckIcon />
          </span>
          <h1 className="b2c-confirm-hero__title">ההזמנה אושרה!</h1>
          <p className="b2c-confirm-hero__subtitle">
            ההזמנה ממתינה לאיסוף ב{order.businessName}
          </p>
        </section>

        <QRCodeDisplay
          value={orderCode}
          orderCode={orderCode}
          businessName={order.businessName}
        />

        <PickupInstructions
          businessName={order.businessName}
          address={order.address}
          pickupWindow={order.pickupWindow}
          onGetDirections={() => {
            const q = encodeURIComponent(order.address)
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, '_blank', 'noopener')
          }}
          onCallStore={() => { window.location.href = `tel:${order.phone}` }}
        />

        <button
          type="button"
          className="b2c-confirm-done"
          onClick={() => navigate('/b2c/home')}
        >
          חזרה לדף הבית
        </button>
      </main>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

/* ── Mock order ─────────────────────────────────────────────── */
const MOCK_ORDER = {
  businessName: 'הפינה של מיכל',
  address: 'דיזנגוף 50, תל אביב',
  pickupWindow: 'היום 17:00-19:30',
  phone: '+972501234567',
}
