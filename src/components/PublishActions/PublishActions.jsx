import './PublishActions.css'

/**
 * PublishActions — Sticky bottom action bar for the AI review screen.
 *
 * Props:
 *   itemCount  number — items remaining in the review list
 *   total      number — money total / estimated revenue
 *   loading    bool   — disables and shows spinner on the publish button
 *   onCancel   fn     — secondary action
 *   onPublish  fn     — primary action
 */
export default function PublishActions({
  itemCount = 0,
  total,
  loading = false,
  onCancel,
  onPublish,
}) {
  const disabled = loading || itemCount === 0

  return (
    <div className="publish-actions" role="toolbar" aria-label="פעולות פרסום">
      <div className="publish-actions__summary">
        <span className="publish-actions__count">{itemCount} פריטים</span>
        {total != null && (
          <span className="publish-actions__total">סה״כ ₪{total}</span>
        )}
      </div>

      <div className="publish-actions__buttons">
        <button
          type="button"
          className="publish-actions__btn publish-actions__btn--ghost"
          onClick={onCancel}
          disabled={loading}
        >
          ביטול
        </button>
        <button
          type="button"
          className="publish-actions__btn publish-actions__btn--action"
          onClick={onPublish}
          disabled={disabled}
          aria-busy={loading}
        >
          {loading ? (
            <span className="publish-actions__spinner" aria-label="מפרסם..." />
          ) : (
            <>
              <CheckIcon />
              פרסם הכל
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
