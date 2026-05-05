import './ReviewListItem.css'

/**
 * ReviewListItem — Editable row for AI-suggested deals during review.
 *
 * Props:
 *   image        string  — preview image URL
 *   title        string  — item name (editable via parent later)
 *   originalPrice number — original price
 *   suggestedPrice number — AI-suggested discount price
 *   discountPct  number  — derived discount percent
 *   quantity     number  — quantity (controlled)
 *   onQtyChange  fn(next)— called with updated quantity
 *   onRemove     fn      — remove this row from the list
 */
export default function ReviewListItem({
  image,
  title,
  originalPrice,
  suggestedPrice,
  discountPct,
  quantity,
  onQtyChange,
  onRemove,
}) {
  const dec = () => onQtyChange?.(Math.max(0, quantity - 1))
  const inc = () => onQtyChange?.(quantity + 1)

  return (
    <li className="review-item">
      <div className="review-item__media">
        {image ? (
          <img src={image} alt="" className="review-item__img" />
        ) : (
          <div className="review-item__img review-item__img--placeholder" aria-hidden="true">🥖</div>
        )}
      </div>

      <div className="review-item__body">
        <p className="review-item__title">{title}</p>
        <div className="review-item__pricing">
          <span className="review-item__price">₪{suggestedPrice}</span>
          {originalPrice && originalPrice > suggestedPrice && (
            <span className="review-item__original">₪{originalPrice}</span>
          )}
          {discountPct > 0 && (
            <span className="review-item__discount">-{discountPct}%</span>
          )}
        </div>

        <div className="review-item__controls">
          <div className="review-item__qty" role="group" aria-label={`כמות ${title}`}>
            <button
              type="button"
              className="review-item__qty-btn"
              onClick={dec}
              disabled={quantity <= 0}
              aria-label="הפחת כמות"
            >
              <MinusIcon />
            </button>
            <span className="review-item__qty-value" aria-live="polite">{quantity}</span>
            <button
              type="button"
              className="review-item__qty-btn"
              onClick={inc}
              aria-label="הוסף כמות"
            >
              <PlusIcon />
            </button>
          </div>

          <button
            type="button"
            className="review-item__remove"
            onClick={onRemove}
            aria-label={`הסר ${title}`}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </li>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
