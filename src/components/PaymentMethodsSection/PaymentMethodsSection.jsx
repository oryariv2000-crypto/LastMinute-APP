import { CreditCardIcon, LockIcon, AppleIcon } from '../icons'
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
