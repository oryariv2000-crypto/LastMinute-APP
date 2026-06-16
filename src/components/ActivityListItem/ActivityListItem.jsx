import { Price } from '../../lib/formatters'
import { TagIcon, CheckSquareIcon, AlertCircleIcon, StarIcon } from '../icons'
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
          <Price value={amount} fraction={0} currency="+₪" className="activity-item__amount" />
        )}
        {timeAgo && <span className="activity-item__time">{timeAgo}</span>}
      </div>
    </li>
  )
}

const ICONS = {
  sale: <TagIcon />,
  pickup: <CheckSquareIcon />,
  expire: <AlertCircleIcon />,
  review: <StarIcon filled={false} />,
}
