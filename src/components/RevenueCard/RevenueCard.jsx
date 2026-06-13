import { ArrowUpIcon, ArrowDownIcon } from '../icons'
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

