import './OrderSummarySection.css'

/**
 * OrderSummarySection — Itemised cart with highlighted savings total.
 *
 * Props:
 *   items     array — [{ id, title, businessName, image, originalPrice, price, quantity }]
 *   serviceFee number
 */
export default function OrderSummarySection({ items = [], serviceFee = 0 }) {
  const subtotal     = items.reduce((s, it) => s + it.price * it.quantity, 0)
  const originalTotal = items.reduce((s, it) => s + (it.originalPrice ?? it.price) * it.quantity, 0)
  const savings      = originalTotal - subtotal
  const total        = subtotal + serviceFee

  return (
    <section className="order-summary" aria-label="סיכום הזמנה">
      <header className="order-summary__head">
        <h2 className="order-summary__title">סיכום הזמנה</h2>
        <span className="order-summary__count">{items.length} פריטים</span>
      </header>

      <ul className="order-summary__list">
        {items.map(it => (
          <li key={it.id} className="order-summary__row">
            <span className="order-summary__thumb">
              {it.image
                ? <img src={it.image} alt="" />
                : <span aria-hidden="true">🥗</span>}
              <span className="order-summary__qty">×{it.quantity}</span>
            </span>
            <span className="order-summary__row-text">
              <span className="order-summary__row-title">{it.title}</span>
              <span className="order-summary__row-biz">{it.businessName}</span>
            </span>
            <span className="order-summary__row-price">
              <span>₪{it.price * it.quantity}</span>
              {it.originalPrice && it.originalPrice > it.price && (
                <span className="order-summary__row-original">
                  ₪{it.originalPrice * it.quantity}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <dl className="order-summary__totals">
        <div>
          <dt>סכום ביניים</dt>
          <dd>₪{subtotal}</dd>
        </div>
        {serviceFee > 0 && (
          <div>
            <dt>דמי שירות</dt>
            <dd>₪{serviceFee}</dd>
          </div>
        )}
        {savings > 0 && (
          <div className="order-summary__savings">
            <dt>חיסכון 🌿</dt>
            <dd>-₪{savings}</dd>
          </div>
        )}
        <div className="order-summary__grand">
          <dt>סה״כ לתשלום</dt>
          <dd>₪{total}</dd>
        </div>
      </dl>
    </section>
  )
}
