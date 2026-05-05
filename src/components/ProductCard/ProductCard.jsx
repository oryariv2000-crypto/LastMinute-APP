import { Link } from 'react-router-dom'
import { Price, Ltr, formatTimer } from '../../lib/formatters'
import './ProductCard.css'

/**
 * ProductCard — Compact deal tile used inside the customer feed.
 *
 * Props:
 *   id            string|number  — used to build the deal info link
 *   image         string         — image URL
 *   title         string         — deal title
 *   businessName  string
 *   distanceKm    number         — distance to the business
 *   originalPrice number
 *   price         number         — discounted price
 *   discountPct   number
 *   timeLeftMin   number         — minutes until expiry (timer)
 *   tag           string         — optional tag label (e.g. "Vegan")
 *   to            string         — override link target
 *   asLink        boolean        — render the card as a <Link> (default true).
 *                                  Pass `false` when an outer <Link> already
 *                                  wraps the card to avoid nested anchors.
 */
export default function ProductCard({
  id,
  image,
  title,
  businessName,
  distanceKm,
  originalPrice,
  price,
  discountPct,
  timeLeftMin = 0,
  tag,
  to,
  asLink = true,
}) {
  const urgent = timeLeftMin <= 30
  const timeText = formatTimer(timeLeftMin)

  const href = to ?? `/b2c/product/${id}`
  const Wrapper = asLink ? Link : 'article'
  const wrapperProps = asLink
    ? { to: href, className: 'product-card', 'aria-label': `${title} — ${businessName}` }
    : { className: 'product-card', 'aria-label': `${title} — ${businessName}` }

  return (
    <Wrapper {...wrapperProps}>
      <div className="product-card__media">
        {image ? (
          <img src={image} alt="" className="product-card__img" loading="lazy" />
        ) : (
          <div className="product-card__img product-card__img--placeholder" aria-hidden="true">🥗</div>
        )}

        {discountPct > 0 && (
          <span className="product-card__discount" aria-label={`הנחה ${discountPct}%`}>
            -{discountPct}%
          </span>
        )}

        <span className={`product-card__timer${urgent ? ' product-card__timer--urgent' : ''}`}>
          <ClockIcon /> <Ltr>{timeText}</Ltr>
        </span>
      </div>

      <div className="product-card__body">
        {tag && <span className="product-card__tag">{tag}</span>}
        <h3 className="product-card__title">{title}</h3>
        <p className="product-card__biz">
          <StoreIcon /> {businessName}
          {distanceKm != null && (
            <span className="product-card__distance"> · {formatDistance(distanceKm)}</span>
          )}
        </p>

        <div className="product-card__pricing">
          <Price value={price} className="product-card__price" />
          {originalPrice && originalPrice > price && (
            <Price value={originalPrice} className="product-card__original" />
          )}
        </div>
      </div>
    </Wrapper>
  )
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} מ׳`
  return `${km.toFixed(1)} ק״מ`
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
function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l1-6h16l1 6" />
      <path d="M3 9a2 2 0 1 0 4 0 2 2 0 1 0 4 0 2 2 0 1 0 4 0 2 2 0 1 0 4 0" />
      <path d="M5 9v12h14V9" />
    </svg>
  )
}
