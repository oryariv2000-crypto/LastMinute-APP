import { useRef, useState } from 'react'
import InputField from '../InputField/InputField'
import TagSelector from '../TagSelector/TagSelector'
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
 *   originalPrice  number   — regular price (editable)
 *   suggestedPrice number   — sale price (editable, the "manual price")
 *   quantity       number   — quantity (controlled)
 *   tags           string[] — selected characteristic slugs (diet/state/allergen)
 *   onTitleChange  fn(next)            — updated title
 *   onQtyChange    fn(next)            — updated quantity
 *   onPriceChange  fn(field, value)    — field is 'originalPrice' | 'suggestedPrice'
 *   onImageChange  fn({ url, file })   — owner picked a photo for this deal
 *   onTagsChange   fn(nextSlugs)       — updated characteristic tags
 *   onRemove       fn                  — remove this row from the list
 */
export default function ReviewListItem({
  id,
  image,
  title,
  originalPrice = 0,
  suggestedPrice = 0,
  quantity,
  tags = [],
  onTitleChange,
  onQtyChange,
  onPriceChange,
  onImageChange,
  onTagsChange,
  onRemove,
}) {
  const dec = () => onQtyChange?.(Math.max(0, quantity - 1))
  const inc = () => onQtyChange?.(quantity + 1)

  // Photo source picker: tapping the tile opens a menu to either shoot a new
  // photo (camera) or pick an existing file. Two inputs back the two paths —
  // only the camera one carries `capture` so the file path opens the gallery.
  const [menuOpen, setMenuOpen] = useState(false)
  const cameraRef = useRef(null)
  const fileRef = useRef(null)

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
    setMenuOpen(false)
  }

  return (
    <li className="review-item">
      {/* Per-deal photo picker — tile opens a camera / file choice menu */}
      <div className="review-item__media-wrap">
        <button
          type="button"
          className="review-item__media"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={`הוסף תמונה ל${title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          {image ? (
            <img src={image} alt="" className="review-item__img" />
          ) : (
            <div className="review-item__img review-item__img--placeholder" aria-hidden="true">🥖</div>
          )}
          <span className="review-item__media-overlay" aria-hidden="true">
            <CameraIcon />
          </span>
        </button>

        {menuOpen && (
          <>
            <div className="review-item__media-backdrop" onClick={() => setMenuOpen(false)} />
            <div className="review-item__media-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => cameraRef.current?.click()}>
                <CameraIcon /> צלם תמונה
              </button>
              <button type="button" role="menuitem" onClick={() => fileRef.current?.click()}>
                <ImageIcon /> בחר מהקבצים
              </button>
            </div>
          </>
        )}

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleImage} />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImage} />
      </div>

      <div className="review-item__body">
        {/* Editable title */}
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

        {/* Characteristics (dietary / state / allergens) — collapsed by default
            so the row stays compact; a count badge shows when any are picked. */}
        <details className="review-item__tags">
          <summary className="review-item__tags-summary">
            <TagIcon />
            מאפיינים{tags.length > 0 ? ` (${tags.length})` : ''}
          </summary>
          <TagSelector value={tags} onChange={(next) => onTagsChange?.(next)} />
        </details>

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
function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
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
function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
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
