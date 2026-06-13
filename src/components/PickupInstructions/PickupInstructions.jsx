import { MapPinIcon, ClockIcon, PhoneIcon } from '../icons'
import './PickupInstructions.css'

/**
 * PickupInstructions — "How to pick up" steps + business location + ETA.
 *
 * Props:
 *   businessName  string
 *   address       string
 *   pickupWindow  string  — e.g. "היום 17:00-19:30"
 *   onGetDirections fn
 *   onCallStore     fn
 */
export default function PickupInstructions({
  businessName,
  address,
  pickupWindow,
  onGetDirections,
  onCallStore,
}) {
  return (
    <section className="pickup-instructions" aria-label="הוראות איסוף">
      <header className="pickup-instructions__head">
        <h2 className="pickup-instructions__title">איך אוספים?</h2>
      </header>

      <ol className="pickup-instructions__steps">
        {STEPS.map((s, i) => (
          <li key={i} className="pickup-instructions__step">
            <span className="pickup-instructions__step-num">{i + 1}</span>
            <div>
              <h3 className="pickup-instructions__step-title">{s.title}</h3>
              <p className="pickup-instructions__step-body">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="pickup-instructions__location">
        <h3 className="pickup-instructions__loc-title">{businessName}</h3>
        <p className="pickup-instructions__loc-row">
          <MapPinIcon /> {address}
        </p>
        {pickupWindow && (
          <p className="pickup-instructions__loc-row">
            <ClockIcon /> חלון איסוף · <strong>{pickupWindow}</strong>
          </p>
        )}

        <div className="pickup-instructions__actions">
          <button
            type="button"
            className="pickup-instructions__btn pickup-instructions__btn--primary"
            onClick={onGetDirections}
          >
            <NavIcon /> נווט לעסק
          </button>
          <button
            type="button"
            className="pickup-instructions__btn pickup-instructions__btn--secondary"
            onClick={onCallStore}
          >
            <PhoneIcon /> התקשר
          </button>
        </div>
      </div>
    </section>
  )
}

const STEPS = [
  {
    title: 'הגיע/י עד סוף חלון האיסוף',
    body: 'איסוף לאחר השעה שהוקצתה עלול לבטל את ההזמנה.',
  },
  {
    title: 'הצג/י את קוד ה-QR לקופאי',
    body: 'הקוד נסרק במכשיר העסק ומוודא את ההזמנה.',
  },
  {
    title: 'קבל/י את ההזמנה',
    body: 'בדוק/י שהפריטים תואמים לפני העזיבה.',
  },
]

function NavIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  )
}
