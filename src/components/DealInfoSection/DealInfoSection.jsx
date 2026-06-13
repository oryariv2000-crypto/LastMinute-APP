import { Price } from '../../lib/formatters'
import { StarFilledIcon, ClockIcon, MapPinIcon, ChevronRightIcon } from '../icons'
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
 *   tags          string[] — small chips beneath title (category + characteristics)
 *   allergens     string[] — "contains" warning labels
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
  allergens = [],
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
        <Price value={price} fraction={0} className="deal-info__price" />
        {originalPrice && originalPrice > price && (
          <>
            <Price value={originalPrice} fraction={0} className="deal-info__original" />
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
                <StarFilledIcon /> {rating.toFixed(1)}
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
        <ChevronRightIcon />
      </button>

      {description && (
        <div className="deal-info__block">
          <h2 className="deal-info__block-title">תיאור</h2>
          <p className="deal-info__block-body">{description}</p>
        </div>
      )}

      {allergens.length > 0 && (
        <div className="deal-info__block">
          <h2 className="deal-info__block-title">מכיל אלרגנים</h2>
          <ul className="deal-info__allergens" aria-label="מכיל אלרגנים">
            {allergens.map((a) => <li key={a}>{a}</li>)}
          </ul>
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
                <span className="deal-info__detail-icon"><MapPinIcon /></span>
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

