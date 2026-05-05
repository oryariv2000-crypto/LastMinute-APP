import { Price, Ltr, formatTimer } from '../../lib/formatters'
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
 *   onEdit       fn      — edit handler
 *   onPause      fn      — pause/cancel handler
 */
export default function ActiveDealCard({
  image,
  title,
  originalPrice,
  price,
  discountPct,
  quantity,
  timeLeftMin = 0,
  onEdit,
  onPause,
}) {
  const urgent = timeLeftMin <= 30
  const timeText = formatTimer(timeLeftMin)

  return (
    <article className="active-deal-card" aria-label={title}>
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
        <span
          className={`active-deal-card__timer${urgent ? ' active-deal-card__timer--urgent' : ''}`}
          aria-label={`זמן שנותר ${timeText}`}
        >
          <ClockIcon /> <Ltr>{timeText}</Ltr>
        </span>
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
          >
            <EditIcon /> ערוך
          </button>
          <button
            type="button"
            className="active-deal-card__btn active-deal-card__btn--danger"
            onClick={onPause}
          >
            <PauseIcon /> השהה
          </button>
        </div>
      </div>
    </article>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  )
}
