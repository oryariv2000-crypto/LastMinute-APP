import { Price } from '../../lib/formatters'
import './DealInfoSection.css'

/**
 * DealInfoSection — Body content of the deal info page.
 *
 * Includes title, business strip, pricing, description, allergens/tags,
 * and pickup window.
 *
 * Props:
 *   title         string
 *   businessName  string
 *   businessLogo  string  — optional URL
 *   distanceKm    number
 *   rating        number
 *   reviewCount   number
 *   originalPrice number
 *   price         number
 *   discountPct   number
 *   description   string
 *   tags          string[] — small chips beneath title
 *   pickupWindow  string  — e.g. "היום 17:00-19:30"
 *   address       string
 *   onOpenStore   fn
 */
export default function DealInfoSection({
  title,
  businessName,
  businessLogo,
  distanceKm,
  rating,
  reviewCount,
  originalPrice,
  price,
  discountPct,
  description,
  tags = [],
  pickupWindow,
  address,
  onOpenStore,
}) {
  const initials = (businessName || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <section className="deal-info">
      <header className="deal-info__head">
        <h1 className="deal-info__title">{title}</h1>
        {tags.length > 0 && (
          <ul className="deal-info__tags" aria-label="תגיות">
            {tags.map(t => <li key={t}>{t}</li>)}
          </ul>
        )}
      </header>

      <div className="deal-info__pricing">
        <Price value={price} className="deal-info__price" />
        {originalPrice && originalPrice > price && (
          <>
            <Price value={originalPrice} className="deal-info__original" />
            {discountPct > 0 && (
              <span className="deal-info__save">
                חיסכון של <Price value={originalPrice - price} fraction={0} />
              </span>
            )}
          </>
        )}
      </div>

      {/* Business row */}
      <button type="button" className="deal-info__biz" onClick={onOpenStore}>
        <span className="deal-info__biz-avatar">
          {businessLogo
            ? <img src={businessLogo} alt="" />
            : <span aria-hidden="true">{initials}</span>}
        </span>
        <span className="deal-info__biz-text">
          <span className="deal-info__biz-name">{businessName}</span>
          <span className="deal-info__biz-meta">
            {rating != null && (
              <>
                <StarIcon /> {rating.toFixed(1)}
                {reviewCount != null && (
                  <span className="deal-info__biz-reviews"> ({reviewCount})</span>
                )}
              </>
            )}
            {distanceKm != null && (
              <span className="deal-info__biz-distance"> · {formatDistance(distanceKm)}</span>
            )}
          </span>
        </span>
        <ChevronStartIcon />
      </button>

      {description && (
        <div className="deal-info__block">
          <h2 className="deal-info__block-title">תיאור</h2>
          <p className="deal-info__block-body">{description}</p>
        </div>
      )}

      {(pickupWindow || address) && (
        <div className="deal-info__block">
          <h2 className="deal-info__block-title">איסוף</h2>
          <ul className="deal-info__details">
            {pickupWindow && (
              <li>
                <span className="deal-info__detail-icon"><ClockIcon /></span>
                <span>חלון איסוף · <strong>{pickupWindow}</strong></span>
              </li>
            )}
            {address && (
              <li>
                <span className="deal-info__detail-icon"><PinIcon /></span>
                <span>{address}</span>
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  )
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} מ׳`
  return `${km.toFixed(1)} ק״מ`
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
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
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
function ChevronStartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
