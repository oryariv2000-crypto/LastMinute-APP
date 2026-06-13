import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import QRCodeDisplay from '../components/QRCodeDisplay/QRCodeDisplay'
import PickupInstructions from '../components/PickupInstructions/PickupInstructions'
import SwipeToConfirm from '../components/SwipeToConfirm/SwipeToConfirm'
import { getOrderByCode, completeOrder, cancelOrder } from '../lib/db'
import { useProfile } from '../lib/useProfile'
import { isActiveStatus } from '../lib/orderStatus'
import { CheckIcon } from '../components/icons'
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
  const { profile } = useProfile()
  const queryClient = useQueryClient()

  const [order, setOrder] = useState(null)
  const [busy, setBusy]   = useState(false)
  const [actionError, setActionError] = useState('')

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
  const pickupStart = order?.deals?.pickup_start ? new Date(order.deals.pickup_start) : null
  const pickupWindow = pickupStart ? pickupStart.toLocaleString('he-IL') : ''

  const status = order?.status
  const isActive    = isActiveStatus(status)
  const isCompleted = status === 'completed'
  const isCancelled = status === 'cancelled'

  // Cancellation closes once the pickup window opens (NULL window = always open).
  // `mountedAt` captures the time once (lazy init keeps the read out of render);
  // the server (cancel_order) re-checks the window authoritatively anyway.
  const [mountedAt] = useState(() => Date.now())
  const canCancel = isActive && (!pickupStart || mountedAt < pickupStart.getTime())

  async function runAction(fn) {
    if (!order?.id || busy) return null
    setBusy(true)
    setActionError('')
    try {
      const updated = await fn(order.id)
      setOrder((prev) => ({ ...prev, ...updated }))
      // The active-orders badge + impact totals depend on this order's status.
      queryClient.invalidateQueries({ queryKey: ['my-orders-active-count'] })
      queryClient.invalidateQueries({ queryKey: ['my-impact'] })
      return updated
    } catch (err) {
      setActionError(err?.message || 'הפעולה נכשלה')
      return null
    } finally {
      setBusy(false)
    }
  }

  function handleCancel() {
    if (!window.confirm('לבטל את ההזמנה? המלאי יוחזר לעסק.')) return
    runAction(cancelOrder)
  }

  // Hero copy reflects the live status.
  const hero = isCompleted
    ? { title: 'ההזמנה נאספה — תודה! 🌿', subtitle: `נאספה ב${businessName}` }
    : isCancelled
      ? { title: 'ההזמנה בוטלה', subtitle: `הביטול נקלט. המלאי הוחזר ל${businessName}` }
      : { title: 'ההזמנה אושרה!', subtitle: `ההזמנה ממתינה לאיסוף ב${businessName}` }

  return (
    <div className="b2c-page" dir="rtl">
      <NavbarB2C userName={profile?.full_name || 'לקוח/ה'} showSearch={false} />

      <main className="b2c-page__main">
        <section className={`b2c-confirm-hero${isCancelled ? ' b2c-confirm-hero--cancelled' : ''}`}>
          <span className="b2c-confirm-hero__check" aria-hidden="true">
            <CheckIcon strokeWidth={3} />
          </span>
          <h1 className="b2c-confirm-hero__title">{hero.title}</h1>
          <p className="b2c-confirm-hero__subtitle">{hero.subtitle}</p>
        </section>

        {/* QR + pickup details are only useful while the order is still open. */}
        {!isCancelled && (
          <>
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
          </>
        )}

        {actionError && (
          <p className="b2c-page__greeting-sub" role="alert" style={{ color: 'var(--color-error)' }}>
            {actionError}
          </p>
        )}

        {/* Click & Collect handoff: the customer slides this at the counter. */}
        {isActive && order?.id && (
          <div className="b2c-confirm-collect">
            <p className="b2c-confirm-collect__hint">בקופה? החלק לאישור האיסוף מול העובד/ת</p>
            <SwipeToConfirm
              label="החלק לאישור איסוף"
              confirmedLabel="נאסף ✓"
              loading={busy}
              onConfirm={() => runAction(completeOrder)}
            />
          </div>
        )}

        <button
          type="button"
          className="b2c-confirm-done"
          onClick={() => navigate('/b2c/orders')}
        >
          להזמנות שלי
        </button>

        {/* Cancellation closes once the pickup window opens. */}
        {canCancel && (
          <button
            type="button"
            className="b2c-confirm-cancel"
            onClick={handleCancel}
            disabled={busy}
          >
            בטל הזמנה
          </button>
        )}
        {isActive && !canCancel && (
          <p className="b2c-confirm-cancel-note">חלון האיסוף התחיל — לא ניתן לבטל. נתראה בקופה!</p>
        )}
      </main>
    </div>
  )
}

