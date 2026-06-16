import { QRCodeSVG } from 'qrcode.react'
import './QRCodeDisplay.css'

/**
 * QRCodeDisplay — Pickup QR code panel.
 *
 * Renders a real, scannable QR (via qrcode.react) encoding the order's payload
 * so the business owner's scanner can read the exact order_code at the counter.
 * An optional pre-rendered `imageUrl` takes precedence when supplied.
 *
 * Props:
 *   value        string — payload to encode (defaults to orderCode)
 *   imageUrl     string — optional pre-rendered QR PNG/SVG to display instead
 *   orderCode    string — short human-readable code shown beneath the QR
 *   businessName string — store name (rendered in the caption)
 */
export default function QRCodeDisplay({
  value,
  imageUrl,
  orderCode,
  businessName,
}) {
  const payload = value || orderCode || ''

  return (
    <section className="qr-display" aria-label="קוד QR לאיסוף">
      <div className="qr-display__frame">
        {imageUrl ? (
          <img src={imageUrl} alt="קוד QR" className="qr-display__img" />
        ) : (
          <QRCodeSVG
            value={payload}
            title={payload}
            className="qr-display__svg"
            size={216}
            level="M"
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#0f5238"
          />
        )}

        {/* corner anchors over the QR for the "scanner" look */}
        <span className="qr-display__corner qr-display__corner--tl" aria-hidden="true" />
        <span className="qr-display__corner qr-display__corner--tr" aria-hidden="true" />
        <span className="qr-display__corner qr-display__corner--bl" aria-hidden="true" />
        <span className="qr-display__corner qr-display__corner--br" aria-hidden="true" />
      </div>

      {orderCode && (
        <div className="qr-display__code-block">
          <span className="qr-display__code-label">קוד הזמנה</span>
          <span className="qr-display__code-value" id="qr-order-code">{orderCode}</span>
        </div>
      )}

      <p className="qr-display__caption">
        הצג את הקוד בקופה{businessName ? ` של ${businessName}` : ''} לאיסוף
      </p>
    </section>
  )
}
