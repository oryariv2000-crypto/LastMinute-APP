import { Link } from 'react-router-dom'
import { Price } from '../../lib/formatters'
import './OrderHistoryCard.css'

/**
 * OrderHistoryCard — Single past or active order in the orders list.
 *
 * Props:
 *   id            string|number
 *   orderCode     string
 *   businessName  string
 *   image         string
 *   date          string  — short formatted date / "היום"
 *   itemsSummary  string  — e.g. "2 פריטים · מאפים"
 *   status        'active' | 'ready' | 'completed' | 'cancelled'
 *   total         number
 *   onReorder     fn      — optional: shown for completed orders
 *   onViewQr      fn      — optional override for active "showQR" link
 */
const STATUS_LABEL = {
  pending:   'בהמתנה לאיסוף',
  active:    'בהמתנה לאיסוף',
  ready:     'מוכן לאיסוף',
  completed: 'הושלם',
  cancelled: 'בוטל',
}

export default function OrderHistoryCard({
  orderCode,
  businessName,
  image,
  date,
  itemsSummary,
  status = 'completed',
  total,
  onReorder,
  onViewQr,
}) {
  const isActive = status === 'pending' || status === 'active' || status === 'ready'

  return (
    <article className={`order-history-card order-history-card--${status}`} aria-label={`הזמנה ${orderCode}`}>
      <div className="order-history-card__main">
        <div className="order-history-card__thumb">
          {image
            ? <img src={image} alt="" />
            : <span aria-hidden="true">🛍️</span>}
        </div>

        <div className="order-history-card__body">
          <div className="order-history-card__row">
            <h3 className="order-history-card__biz">{businessName}</h3>
            <span className={`order-history-card__status order-history-card__status--${status}`}>
              {STATUS_LABEL[status]}
            </span>
          </div>

          <p className="order-history-card__items">{itemsSummary}</p>

          <p className="order-history-card__meta">
            <span>#{orderCode}</span>
            <span aria-hidden="true">·</span>
            <span>{date}</span>
            {total != null && (
              <>
                <span aria-hidden="true">·</span>
                <Price value={total} fraction={0} className="order-history-card__total" />
              </>
            )}
          </p>
        </div>
      </div>

      <div className="order-history-card__actions">
        {isActive ? (
          <Link
            to={`/b2c/confirmation?code=${encodeURIComponent(orderCode)}`}
            onClick={onViewQr}
            className="order-history-card__btn order-history-card__btn--primary"
          >
            הצג QR
          </Link>
        ) : status === 'completed' ? (
          <>
            <button
              type="button"
              className="order-history-card__btn order-history-card__btn--secondary"
              onClick={onReorder}
            >
              הזמן שוב
            </button>
            <Link
              to={`/b2c/confirmation?code=${encodeURIComponent(orderCode)}`}
              className="order-history-card__btn order-history-card__btn--ghost"
            >
              פרטים
            </Link>
          </>
        ) : (
          <Link
            to={`/b2c/confirmation?code=${encodeURIComponent(orderCode)}`}
            className="order-history-card__btn order-history-card__btn--ghost"
          >
            פרטים
          </Link>
        )}
      </div>
    </article>
  )
}
