import { useState } from 'react'
import { Price, Ltr } from '../../lib/formatters'
import { formatTimer } from '../../lib/time'
import { ClockIcon, EditIcon, PauseIcon, PlayIcon, TrashIcon } from '../icons'
import './ActiveDealCard.css'

/**
 * ActiveDealCard — Surface for an active discount deal.
 *
 * Props:
 *   image        string  — product image URL
 *   title        string  — deal title
 *   originalPrice number — strike-through price
 *   price        number  — current discounted price
 *   discountPct  number  — discount percentage badge
 *   quantity     number  — units left
 *   timeLeftMin  number  — minutes until deal expires (drives timer)
 *   status       string  — 'active' | 'paused' (drives the pause/resume button)
 *   onEdit       fn      — edit handler
 *   onToggleStatus fn    — pause (hide from customers) / resume handler
 *   onDelete     fn      — permanent delete handler
 */
export default function ActiveDealCard({
  image,
  title,
  originalPrice,
  price,
  discountPct,
  quantity,
  timeLeftMin = 0,
  status = 'active',
  onEdit,
  onToggleStatus,
  onDelete,
}) {
  const urgent = timeLeftMin <= 30
  // Capture the expiry instant once on mount so Date.now() isn't called on
  // every render (satisfies React Compiler's purity rule).
  // expiresAt is intentionally frozen at mount — won't re-derive if timeLeftMin prop changes; acceptable as the timer doesn't tick.
  const [expiresAt] = useState(() => Date.now() + timeLeftMin * 60_000)
  const timeText = formatTimer(expiresAt)
  const paused = status === 'paused'

  return (
    <article
      className={`active-deal-card${paused ? ' active-deal-card--paused' : ''}`}
      aria-label={title}
    >
      <div className="active-deal-card__media">
        {image ? (
          <img src={image} alt="" className="active-deal-card__img" />
        ) : (
          <div className="active-deal-card__img active-deal-card__img--placeholder" aria-hidden="true">🥗</div>
        )}
        {discountPct > 0 && (
          <span className="active-deal-card__discount" aria-label={`הנחה ${discountPct}%`}>
            -{discountPct}%
          </span>
        )}
        {paused ? (
          <span className="active-deal-card__paused-badge">מושהה — לא מוצג ללקוחות</span>
        ) : timeLeftMin > 0 ? (
          <span
            className={`active-deal-card__timer${urgent ? ' active-deal-card__timer--urgent' : ''}`}
            aria-label={`זמן שנותר ${timeText}`}
          >
            <ClockIcon /> <Ltr>{timeText}</Ltr>
          </span>
        ) : null}
      </div>

      <div className="active-deal-card__body">
        <h3 className="active-deal-card__title">{title}</h3>

        <div className="active-deal-card__pricing">
          <Price value={price} className="active-deal-card__price" />
          {originalPrice && originalPrice > price && (
            <Price value={originalPrice} className="active-deal-card__original" />
          )}
          <span className="active-deal-card__qty"><Ltr>{`×${quantity}`}</Ltr></span>
        </div>

        <div className="active-deal-card__actions">
          <button
            type="button"
            className="active-deal-card__btn active-deal-card__btn--secondary"
            onClick={onEdit}
            title="שינוי פרטי המבצע (מחיר, כמות, שם)"
          >
            <EditIcon /> ערוך
          </button>

          {paused ? (
            <button
              type="button"
              className="active-deal-card__btn active-deal-card__btn--resume"
              onClick={onToggleStatus}
              title="החזרת המבצע לתצוגה אצל הלקוחות"
            >
              <PlayIcon /> הפעל
            </button>
          ) : (
            <button
              type="button"
              className="active-deal-card__btn active-deal-card__btn--pause"
              onClick={onToggleStatus}
              title="הסתרה זמנית מהלקוחות — המבצע נשמר ואפשר להחזיר אותו בכל רגע"
            >
              <PauseIcon /> השהה
            </button>
          )}

          <button
            type="button"
            className="active-deal-card__btn active-deal-card__btn--danger"
            onClick={onDelete}
            title="מחיקת המבצע לצמיתות — לא ניתן לשחזר"
          >
            <TrashIcon /> מחק
          </button>
        </div>
      </div>
    </article>
  )
}
