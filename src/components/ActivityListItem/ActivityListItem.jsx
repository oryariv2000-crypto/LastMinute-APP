import './ActivityListItem.css'

/**
 * ActivityListItem — Single row in the recent-activity list.
 *
 * Props:
 *   type        'sale' | 'pickup' | 'expire' | 'review'
 *   title       string  — primary text
 *   subtitle    string  — secondary text (e.g. customer name)
 *   timeAgo     string  — relative time string (e.g. "לפני 5 דק'")
 *   amount      number  — optional money amount to show on the trailing side
 */
export default function ActivityListItem({
  type = 'sale',
  title,
  subtitle,
  timeAgo,
  amount,
}) {
  return (
    <li className="activity-item">
      <span className={`activity-item__icon activity-item__icon--${type}`} aria-hidden="true">
        {ICONS[type] || ICONS.sale}
      </span>

      <div className="activity-item__body">
        <p className="activity-item__title">{title}</p>
        {subtitle && <p className="activity-item__subtitle">{subtitle}</p>}
      </div>

      <div className="activity-item__meta">
        {amount != null && (
          <span className="activity-item__amount">+₪{amount}</span>
        )}
        {timeAgo && <span className="activity-item__time">{timeAgo}</span>}
      </div>
    </li>
  )
}

const ICONS = {
  sale: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  pickup: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  expire: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  review: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
}
