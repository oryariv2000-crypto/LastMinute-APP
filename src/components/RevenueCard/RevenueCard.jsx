import './RevenueCard.css'

/**
 * RevenueCard — Headline revenue/metric card used on stats screens.
 *
 * Props:
 *   label        string  — e.g. "סך הכנסות החודש"
 *   value        string  — primary number (formatted, e.g. "₪12,450")
 *   delta        string  — optional comparison string ("+18% מהחודש שעבר")
 *   trend        'up'|'down'|'flat'
 *   subtitle     string  — small caption under value
 *   variant      'primary'|'success'|'accent' — accent color
 */
export default function RevenueCard({
  label,
  value,
  delta,
  trend = 'up',
  subtitle,
  variant = 'primary',
}) {
  return (
    <article className={`revenue-card revenue-card--${variant}`}>
      <p className="revenue-card__label">{label}</p>
      <p className="revenue-card__value">{value}</p>
      {subtitle && <p className="revenue-card__subtitle">{subtitle}</p>}
      {delta && (
        <span className={`revenue-card__delta revenue-card__delta--${trend}`}>
          {trend === 'up' && <ArrowUpIcon />}
          {trend === 'down' && <ArrowDownIcon />}
          {delta}
        </span>
      )}
    </article>
  )
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  )
}
function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  )
}
