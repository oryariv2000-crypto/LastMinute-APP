import { Price } from '../../lib/formatters'
import { CheckIcon } from '../icons'
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
          <span className="publish-actions__total">סה״כ <Price value={total} fraction={0} /></span>
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

