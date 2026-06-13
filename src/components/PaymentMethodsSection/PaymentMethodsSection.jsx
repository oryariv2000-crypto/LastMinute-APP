import { CreditCardIcon, LockIcon } from '../icons'
import './PaymentMethodsSection.css'

/**
 * PaymentMethodsSection — Choose Apple Pay or Credit Card.
 *
 * Props:
 *   value      'apple' | 'card'
 *   onChange   fn(method)
 *   cardLast4  string  — preview for the saved card row (optional)
 */
export default function PaymentMethodsSection({ value = 'apple', onChange, cardLast4 }) {
  return (
    <section className="payment-methods" aria-label="אמצעי תשלום">
      <header className="payment-methods__head">
        <h2 className="payment-methods__title">אמצעי תשלום</h2>
      </header>

      <div className="payment-methods__list" role="radiogroup">
        <PaymentRow
          id="pay-apple"
          selected={value === 'apple'}
          onSelect={() => onChange?.('apple')}
          icon={<AppleIcon />}
          title="Apple Pay"
          subtitle="תשלום מהיר ללא הזנת פרטים"
          variant="apple"
        />
        <PaymentRow
          id="pay-card"
          selected={value === 'card'}
          onSelect={() => onChange?.('card')}
          icon={<CreditCardIcon />}
          title="כרטיס אשראי"
          subtitle={cardLast4 ? `Visa •••• ${cardLast4}` : 'הוסף כרטיס חדש'}
          variant="card"
        />
      </div>

      <p className="payment-methods__note">
        <LockIcon /> התשלום מאובטח ומוצפן end-to-end
      </p>
    </section>
  )
}

function PaymentRow({ id, selected, onSelect, icon, title, subtitle, variant }) {
  return (
    <button
      id={id}
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`payment-row payment-row--${variant}${selected ? ' payment-row--selected' : ''}`}
    >
      <span className="payment-row__icon">{icon}</span>
      <span className="payment-row__text">
        <span className="payment-row__title">{title}</span>
        <span className="payment-row__subtitle">{subtitle}</span>
      </span>
      <span className={`payment-row__radio${selected ? ' payment-row__radio--on' : ''}`} aria-hidden="true">
        {selected && <span className="payment-row__radio-dot" />}
      </span>
    </button>
  )
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.41 2.18-1.23 2.95-.85.81-1.86 1.27-2.94 1.18-.06-1.13.45-2.27 1.27-3.06.83-.79 1.93-1.18 2.9-1.07zM20.5 17.4c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.51-4.12 3.52-1.54.02-1.94-1.01-4.04-1-2.1.01-2.54 1.02-4.08 1-1.73-.01-3.05-1.78-4.05-3.34C-.05 16.84-.34 11.71 2.06 8.93c1.7-1.97 4.39-3.13 6.92-3.13 1.49 0 2.5.61 3.59.61 1.07 0 1.72-.61 3.45-.61 1.4 0 2.89.76 3.95 2.07-3.47 1.9-2.91 6.85.53 8.53z"/>
    </svg>
  )
}
