import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import QRCodeDisplay from '../components/QRCodeDisplay/QRCodeDisplay'
import PickupInstructions from '../components/PickupInstructions/PickupInstructions'
import { getOrderByCode } from '../lib/db'
import './B2CPage.css'

/**
 * B2CConfirmationPage — Order confirmation with QR for pickup. Fetches the
 * order by its code so the pickup details survive a refresh.
 *
 * Route: /b2c/confirmation  (order code passed via ?code=… query string)
 */
export default function B2CConfirmationPage() {
  const [searchParams] = useSearchParams()
  const orderCode = searchParams.get('code') || ''
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)

  useEffect(() => {
    if (!orderCode) return
    let active = true
    getOrderByCode(orderCode)
      .then((row) => { if (active) setOrder(row) })
      .catch(() => {}) // confirmation still renders with the code alone
    return () => { active = false }
  }, [orderCode])

  const shop = order?.deals?.businesses
  const businessName = shop?.name || 'העסק'
  const address = shop?.address || ''
  const phone = shop?.phone || ''
  const pickupWindow = order?.deals?.pickup_start
    ? new Date(order.deals.pickup_start).toLocaleString('he-IL')
    : ''

  return (
    <div className="b2c-page" dir="rtl">
      <NavbarB2C location="תל אביב" userName="דנה כהן" />

      <main className="b2c-page__main">
        <section className="b2c-confirm-hero">
          <span className="b2c-confirm-hero__check" aria-hidden="true">
            <CheckIcon />
          </span>
          <h1 className="b2c-confirm-hero__title">ההזמנה אושרה!</h1>
          <p className="b2c-confirm-hero__subtitle">
            ההזמנה ממתינה לאיסוף ב{businessName}
          </p>
        </section>

        <QRCodeDisplay
          value={orderCode}
          orderCode={orderCode}
          businessName={businessName}
        />

        <PickupInstructions
          businessName={businessName}
          address={address}
          pickupWindow={pickupWindow}
          onGetDirections={() => {
            if (!address) return
            const q = encodeURIComponent(address)
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, '_blank', 'noopener')
          }}
          onCallStore={() => { if (phone) window.location.href = `tel:${phone}` }}
        />

        <button
          type="button"
          className="b2c-confirm-done"
          onClick={() => navigate('/b2c/orders')}
        >
          להזמנות שלי
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
