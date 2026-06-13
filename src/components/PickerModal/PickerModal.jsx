import '../DealEditModal/DealEditModal.css'
import './PickerModal.css'

/**
 * PickerModal — single-choice bottom sheet for a preference (language, city,
 * search radius…). Selecting an option applies it immediately and closes.
 *
 * Props:
 *   title     string
 *   options   [{ value, label, hint? }]
 *   value     current selected value
 *   onSelect  fn(value)
 *   onClose   fn
 */
export default function PickerModal({ title, options = [], value, onSelect, onClose }) {
  return (
    <div className="deal-edit__backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="deal-edit__panel card picker" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <h2 className="deal-edit__title">{title}</h2>

        <ul className="picker__list" role="radiogroup" aria-label={title}>
          {options.map((opt) => {
            const active = opt.value === value
            return (
              <li key={String(opt.value)}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`picker__option${active ? ' picker__option--active' : ''}`}
                  onClick={() => { onSelect?.(opt.value); onClose?.() }}
                >
                  <span className="picker__option-text">
                    <span className="picker__option-label">{opt.label}</span>
                    {opt.hint && <span className="picker__option-hint">{opt.hint}</span>}
                  </span>
                  {active && <CheckIcon />}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="deal-edit__actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>סגור</button>
        </div>
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="picker__check">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
