import ReviewListItem from '../ReviewListItem/ReviewListItem'
import './ReviewListSection.css'

/**
 * ReviewListSection — Review screen body that lists AI-suggested deals.
 *
 * Props:
 *   items          array  — review item objects
 *   onQtyChange    fn(id, qty)
 *   onRemove       fn(id)
 *   suggestedTotal number — optional summary above the list
 */
export default function ReviewListSection({
  items = [],
  onQtyChange,
  onRemove,
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
            ניתן לערוך כמויות, להסיר פריטים ולהמשיך לפרסום
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
              onQtyChange={(q) => onQtyChange?.(it.id, q)}
              onRemove={() => onRemove?.(it.id)}
            />
          ))}
        </ul>
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
