import ReviewListItem from '../ReviewListItem/ReviewListItem'
import { PlusIcon } from '../icons'
import './ReviewListSection.css'

/**
 * ReviewListSection — Review screen body that lists AI-suggested deals.
 *
 * Props:
 *   items          array  — review item objects
 *   onQtyChange    fn(id, qty)
 *   onPriceChange  fn(id, field, value)
 *   onImageChange  fn(id, { url, file })
 *   onRemove       fn(id)
 *   onAdd          fn() — append a new blank item the owner fills in manually
 *   suggestedTotal number — optional summary above the list
 */
export default function ReviewListSection({
  items = [],
  onTitleChange,
  onQtyChange,
  onPriceChange,
  onImageChange,
  onTagsChange,
  onRemove,
  onAdd,
  suggestedTotal,
}) {
  return (
    <section className="review-list-section" aria-label="סקירת הצעות AI">
      <header className="review-list-section__header">
        <span className="review-list-section__badge" aria-hidden="true">
          <SparkleIcon />
        </span>
        <div className="review-list-section__heading">
          <h2 className="review-list-section__title">המערכת זיהתה {items.length} מוצרים</h2>
          <p className="review-list-section__subtitle">
            ניתן לערוך מחירים, כמויות ותמונות, ולהמשיך לפרסום
          </p>
        </div>
        {suggestedTotal != null && (
          <span className="review-list-section__total" aria-label="סך הכל מוערך">
            ₪{suggestedTotal}
          </span>
        )}
      </header>

      {items.length === 0 ? (
        <div className="review-list-section__empty">
          <span aria-hidden="true">✨</span>
          <p>לא נותרו פריטים לסקירה</p>
        </div>
      ) : (
        <ul className="review-list-section__list">
          {items.map((it) => (
            <ReviewListItem
              key={it.id}
              {...it}
              onTitleChange={(t) => onTitleChange?.(it.id, t)}
              onQtyChange={(q) => onQtyChange?.(it.id, q)}
              onPriceChange={(field, value) => onPriceChange?.(it.id, field, value)}
              onImageChange={(payload) => onImageChange?.(it.id, payload)}
              onTagsChange={(next) => onTagsChange?.(it.id, next)}
              onRemove={() => onRemove?.(it.id)}
            />
          ))}
        </ul>
      )}

      {onAdd && (
        <button type="button" className="review-list-section__add" onClick={onAdd}>
          <PlusIcon />
          הוסף מוצר ידנית
        </button>
      )}
    </section>
  )
}


function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.4L19 10l-5.1 1.6L12 17l-1.9-5.4L5 10l5.1-1.6z" />
    </svg>
  )
}
