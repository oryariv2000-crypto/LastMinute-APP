import { useState } from 'react'
import { MapPinIcon, TrashIcon } from '../icons'
import '../DealEditModal/DealEditModal.css'
import './AddressBookModal.css'

/**
 * AddressBookModal — manage saved addresses, each with a label (בית / עבודה /
 * custom). Frontend-only; the parent persists the returned list. These labelled
 * addresses become reference pins on the Explore map ("worth popping by work").
 *
 * Address shape: { label: string, address: string }. Legacy plain strings are
 * normalised on open so older saved data keeps working.
 *
 * Props:
 *   addresses  Array<{label,address}|string>
 *   onSave     fn(nextAddresses)  — array of { label, address }
 *   onClose    fn
 */
const QUICK_LABELS = ['בית', 'עבודה', 'אחר']

function normalize(addresses) {
  return (addresses || []).map((a) =>
    typeof a === 'string' ? { label: '', address: a } : { label: a.label || '', address: a.address || '' },
  )
}

export default function AddressBookModal({ addresses = [], onSave, onClose }) {
  const [list, setList]   = useState(() => normalize(addresses))
  const [label, setLabel] = useState('בית')
  const [draft, setDraft] = useState('')

  function add() {
    const address = draft.trim()
    if (!address) return
    setList((l) => [...l, { label: label.trim(), address }])
    setDraft('')
  }
  function remove(i) {
    setList((l) => l.filter((_, idx) => idx !== i))
  }

  return (
    <div className="deal-edit__backdrop" role="dialog" aria-modal="true" aria-label="כתובות שמורות" onClick={onClose}>
      <div className="deal-edit__panel card" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <h2 className="deal-edit__title">כתובות שמורות</h2>

        {list.length === 0 ? (
          <p className="addr__empty">עדיין לא הוספת כתובות. הכתובות יסומנו עבורך כנקודות ציון בדף "גלה".</p>
        ) : (
          <ul className="addr__list">
            {list.map((item, i) => (
              <li key={`${item.address}-${i}`} className="addr__row">
                <span className="addr__pin" aria-hidden="true"><MapPinIcon /></span>
                <span className="addr__text">
                  {item.label && <span className="addr__tag">{item.label}</span>}
                  <span className="addr__addr">{item.address}</span>
                </span>
                <button type="button" className="addr__remove" onClick={() => remove(i)} aria-label={`הסר ${item.address}`}>
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add form: quick label chips + label/address inputs */}
        <div className="addr__add">
          <div className="addr__chips" role="group" aria-label="סוג כתובת">
            {QUICK_LABELS.map((q) => (
              <button
                key={q}
                type="button"
                className={`addr__chip${label === q ? ' addr__chip--active' : ''}`}
                onClick={() => setLabel(q)}
              >
                {q}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="addr__input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="כינוי (בית, עבודה, החברה…)"
            aria-label="כינוי הכתובת"
          />
          <div className="addr__add-row">
            <input
              type="text"
              className="addr__input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
              placeholder="רחוב, מספר, עיר"
              aria-label="כתובת"
            />
            <button type="button" className="btn btn-secondary addr__add-btn" onClick={add} disabled={!draft.trim()}>
              הוסף
            </button>
          </div>
        </div>

        <div className="deal-edit__actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>ביטול</button>
          <button type="button" className="btn btn-primary" onClick={() => { onSave?.(list); onClose?.() }}>
            שמור
          </button>
        </div>
      </div>
    </div>
  )
}

