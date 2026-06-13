import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Price, Ltr } from '../../lib/formatters'
import { formatTimer } from '../../lib/time'
import { resolveTagsInGroup } from '../../lib/productTags'
import { ClockIcon, StarFilledIcon } from '../icons'
import './ProductCard.css'

/**
 * ProductCard — compact deal tile for the customer catalogue. Built to stay
 * legible at 2-up on mobile and 5-up on desktop: fixed image ratio, single-line
 * title, one compact meta row (rating · distance), and price with the saving
 * highlighted. The countdown timer and rating only render when there's data,
 * so the card never shows placeholder noise like "00:00" or an empty star.
 *
 * Props:
 *   id, image, title, businessName
 *   distanceKm    number — omit until real coordinates exist
 *   rating        number — average stars (omit/0 hides the chip)
 *   originalPrice, price, discountPct
 *   timeLeftMin   number — minutes to expiry (0 hides the timer)
 *   quantityLeft  number — units left; shows a "נשארו X" urgency pill when low
 *   tag           string — category chip
 *   tags          string[] — characteristic slugs; dietary ones show as badges
 *   to            string — link override
 *   asLink        bool   — false when an outer <Link> wraps the card
 */
const LOW_STOCK_THRESHOLD = 5

export default function ProductCard({
  id,
  image,
  title,
  businessName,
  distanceKm,
  rating = 0,
  originalPrice,
  price,
  discountPct,
  timeLeftMin = 0,
  quantityLeft,
  tag,
  tags = [],
  to,
  asLink = true,
}) {
  const showTimer = timeLeftMin > 0
  const urgent = timeLeftMin > 0 && timeLeftMin <= 30
  // Capture the expiry instant once on mount so Date.now() isn't called on
  // every render (satisfies React Compiler's purity rule).
  // expiresAt is intentionally frozen at mount — won't re-derive if timeLeftMin prop changes; acceptable as the timer doesn't tick.
  const [expiresAt] = useState(() => Date.now() + timeLeftMin * 60_000)
  const lowStock = quantityLeft != null && quantityLeft > 0 && quantityLeft <= LOW_STOCK_THRESHOLD
  // Surface dietary + product-state characteristics (vegan / baked-today / …)
  // on the compact card, up to three, so the tile stays legible. Allergens stay
  // on the product page only.
  const dietBadges = [
    ...resolveTagsInGroup(tags, 'diet'),
    ...resolveTagsInGroup(tags, 'state'),
  ].slice(0, 3)

  const href = to ?? `/b2c/product/${id}`
  const Wrapper = asLink ? Link : 'article'
  const wrapperProps = asLink
    ? { to: href, className: 'product-card', 'aria-label': `${title} — ${businessName}` }
    : { className: 'product-card', 'aria-label': `${title} — ${businessName}` }

  return (
    <Wrapper {...wrapperProps}>
      <div className="product-card__media">
        {image ? (
          <img src={image} alt="" className="product-card__img" loading="lazy" decoding="async" />
        ) : (
          <div className="product-card__img product-card__img--placeholder" aria-hidden="true">🥗</div>
        )}

        {discountPct > 0 && (
          <span className="product-card__discount" aria-label={`הנחה ${discountPct}%`}>
            -{discountPct}%
          </span>
        )}

        {lowStock && (
          <span className="product-card__stock" aria-label={`נשארו ${quantityLeft} במלאי`}>
            🔥 נשארו {quantityLeft}
          </span>
        )}

        {showTimer && (
          <span className={`product-card__timer${urgent ? ' product-card__timer--urgent' : ''}`}>
            <ClockIcon /> <Ltr>{formatTimer(expiresAt)}</Ltr>
          </span>
        )}
      </div>

      <div className="product-card__body">
        {tag && <span className="product-card__tag">{tag}</span>}
        <h3 className="product-card__title">{title}</h3>

        {dietBadges.length > 0 && (
          <ul className="product-card__badges" aria-label="מאפיינים תזונתיים">
            {dietBadges.map((t) => (
              <li key={t.slug} className="product-card__badge" title={t.label}>
                <span aria-hidden="true">{t.icon}</span>
                <span className="product-card__badge-label">{t.label}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="product-card__meta">
          <span className="product-card__biz">{businessName}</span>
          {rating > 0 && (
            <span className="product-card__rating" aria-label={`דירוג ${rating.toFixed(1)}`}>
              <StarFilledIcon /> {rating.toFixed(1)}
            </span>
          )}
          {distanceKm != null && (
            <span className="product-card__distance">· {formatDistance(distanceKm)}</span>
          )}
        </p>

        <div className="product-card__pricing">
          <Price value={price} fraction={0} className="product-card__price" />
          {originalPrice > price && (
            <Price value={originalPrice} fraction={0} className="product-card__original" />
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

