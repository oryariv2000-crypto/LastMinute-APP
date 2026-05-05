import './QRCodeDisplay.css'

/**
 * QRCodeDisplay — Pickup QR code panel.
 *
 * Renders a placeholder QR (an SVG pattern that *looks* like a QR code) so
 * the screen can be built without pulling in a QR-encoder dependency. The
 * component accepts an optional `value` prop so the parent can later swap
 * the placeholder for a real encoded image while keeping the same layout.
 *
 * Props:
 *   value       string — payload (used for aria-label only in the placeholder)
 *   imageUrl    string — optional pre-rendered QR PNG/SVG to display instead
 *   orderCode   string — short human-readable code shown beneath the QR
 *   businessName string — store name (rendered in the caption)
 */
export default function QRCodeDisplay({
  value,
  imageUrl,
  orderCode,
  businessName,
}) {
  return (
    <section className="qr-display" aria-label="קוד QR לאיסוף">
      <div className="qr-display__frame">
        {imageUrl ? (
          <img src={imageUrl} alt="קוד QR" className="qr-display__img" />
        ) : (
          <PlaceholderQR value={value || orderCode || ''} />
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

/* ── Decorative pseudo-QR ─────────────────────────────────────
   Builds a deterministic 21×21 grid of cells from the value's char codes,
   plus the three corner finder squares so it reads as a QR at a glance. */
function PlaceholderQR({ value }) {
  const SIZE = 21
  const cells = []
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // skip cells inside the three finder squares — drawn separately
      if (inFinder(x, y, SIZE)) continue
      const seed = (value.charCodeAt((x * 31 + y * 17) % Math.max(value.length, 1)) || 0) + x * 7 + y * 13
      if (seed % 5 < 2) {
        cells.push(<rect key={`c-${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0f5238" />)
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="qr-display__svg"
      role="img"
      aria-label={`QR placeholder ${value}`}
    >
      <rect x="0" y="0" width={SIZE} height={SIZE} fill="#fff" />
      {cells}
      {/* finder squares (top-left, top-right, bottom-left) */}
      <Finder x={0} y={0} />
      <Finder x={SIZE - 7} y={0} />
      <Finder x={0} y={SIZE - 7} />
    </svg>
  )
}

function Finder({ x, y }) {
  return (
    <g>
      <rect x={x} y={y} width="7" height="7" fill="#0f5238" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#0f5238" />
    </g>
  )
}

function inFinder(x, y, size) {
  return (
    (x < 7 && y < 7) ||
    (x >= size - 7 && y < 7) ||
    (x < 7 && y >= size - 7)
  )
}
