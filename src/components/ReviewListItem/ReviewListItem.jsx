import InputField from '../InputField/InputField'
import './ReviewListItem.css'

/**
 * ReviewListItem — Editable row for AI-suggested deals during review.
 *
 * The owner can edit the title, set a manual price per deal (regular + sale),
 * attach a dedicated product photo, adjust the quantity, or remove the row.
 *
 * Props:
 *   id             string  — item id (for input/label association)
 *   image          string  — preview image URL (or null)
 *   title          string  — item name (editable)
 *   category       string  — AI category label (shown as a chip)
 *   originalPrice  number   — regular price (editable)
 *   suggestedPrice number   — sale price (editable, the "manual price")
 *   quantity       number   — quantity (controlled)
 *   onTitleChange  fn(next)            — updated title
 *   onQtyChange    fn(next)            — updated quantity
 *   onPriceChange  fn(field, value)    — field is 'originalPrice' | 'suggestedPrice'
 *   onImageChange  fn({ url, file })   — owner picked a photo for this deal
 *   onRemove       fn                  — remove this row from the list
 */
export default function ReviewListItem({
  id,
  image,
  title,
  category,
  originalPrice = 0,
  suggestedPrice = 0,
  quantity,
  onTitleChange,
  onQtyChange,
  onPriceChange,
  onImageChange,
  onRemove,
}) {
  const dec = () => onQtyChange?.(Math.max(0, quantity - 1))
  const inc = () => onQtyChange?.(quantity + 1)

  const pct =
    originalPrice > 0 && originalPrice > suggestedPrice
      ? Math.round((1 - suggestedPrice / originalPrice) * 100)
      : 0

  function handlePrice(field) {
    return (e) => {
      const v = e.target.value
      onPriceChange?.(field, v === '' ? 0 : Math.max(0, Number(v)))
    }
  }

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    onImageChange?.({ url: URL.createObjectURL(file), file })
    e.target.value = ''
  }

  return (
    <li className="review-item">
      {/* Per-deal photo picker */}
      <label className="review-item__media" aria-label={`הוסף תמונה ל${title}`}>
        {image ? (
          <img src={image} alt="" className="review-item__img" />
        ) : (
          <div className="review-item__img review-item__img--placeholder" aria-hidden="true">🥖</div>
        )}
        <span className="review-item__media-overlay" aria-hidden="true">
          <CameraIcon />
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={handleImage}
        />
      </label>

      <div className="review-item__body">
        {/* Editable title + AI category chip */}
        <div className="review-item__head">
          <div className="review-item__title-field">
            <InputField
              id={`deal-title-${id}`}
              value={title}
              onChange={(e) => onTitleChange?.(e.target.value)}
              placeholder="שם המוצר"
              aria-label="שם המוצר"
            />
          </div>
          {category && <span className="review-item__category">{category}</span>}
        </div>

        {/* Editable pricing */}
        <div className="review-item__prices">
          <label className="review-item__price-field">
            <span className="review-item__price-label">מחיר מבצע</span>
            <span className="review-item__price-input-wrap">
              <span className="review-item__currency" aria-hidden="true">₪</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                className="review-item__price-input review-item__price-input--sale"
                value={suggestedPrice || ''}
                onChange={handlePrice('suggestedPrice')}
                aria-label={`מחיר מבצע ל${title}`}
                placeholder="0"
              />
            </span>
          </label>

          <label className="review-item__price-field">
            <span className="review-item__price-label">מחיר רגיל</span>
            <span className="review-item__price-input-wrap">
              <span className="review-item__currency" aria-hidden="true">₪</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                className="review-item__price-input"
                value={originalPrice || ''}
                onChange={handlePrice('originalPrice')}
                aria-label={`מחיר רגיל ל${title}`}
                placeholder="0"
              />
            </span>
          </label>

          {pct > 0 && (
            <span className="review-item__discount" aria-label={`הנחה ${pct} אחוז`}>
              -{pct}%
            </span>
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

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
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
