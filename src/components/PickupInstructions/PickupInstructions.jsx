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
          <PinIcon /> {address}
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

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function NavIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  )
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.84 12 19.79 19.79 0 0 1 1.77 3.35 2 2 0 0 1 3.74 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.65a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}
