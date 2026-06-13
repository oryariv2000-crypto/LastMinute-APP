import { MapPinIcon, StarFilledIcon, EditIcon } from '../icons'
import './BusinessProfileHeader.css'

/**
 * BusinessProfileHeader — Hero block for the business profile screen.
 *
 * Props:
 *   businessName  string
 *   ownerName     string
 *   address       string
 *   coverUrl      string  — optional cover image
 *   logoUrl       string  — optional logo
 *   isOpen        bool    — live open/closed state (drives the status dot)
 *   statusLabel   string  — 'פתוח עכשיו' / 'סגור'
 *   statusHint    string  — secondary line, e.g. 'פתוח עד 17:00' / 'ייפתח מחר ב-09:00'
 *   toggleLabel   string  — text for the open/close button; null/'' hides it
 *   rating        number  — average star rating
 *   reviewCount   number
 *   onEdit        fn      — open edit-profile flow
 *   onToggleOpen  fn      — apply the manual open/close override
 */
export default function BusinessProfileHeader({
  businessName,
  ownerName,
  address,
  coverUrl,
  logoUrl,
  isOpen = true,
  statusLabel,
  statusHint,
  toggleLabel,
  rating = 0,
  reviewCount = 0,
  onEdit,
  onToggleOpen,
}) {
  const initials = businessName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <section className="biz-profile-header" aria-label="פרופיל עסקי">
      <div
        className="biz-profile-header__cover"
        style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
        aria-hidden="true"
      />

      <div className="biz-profile-header__content">
        <div className="biz-profile-header__avatar">
          {logoUrl
            ? <img src={logoUrl} alt="" />
            : <span aria-hidden="true">{initials}</span>}
        </div>

        <div className="biz-profile-header__text">
          <h1 className="biz-profile-header__name">{businessName}</h1>
          {ownerName && (
            <p className="biz-profile-header__owner">{ownerName}</p>
          )}
          {address && (
            <p className="biz-profile-header__address">
              <MapPinIcon /> {address}
            </p>
          )}

          <div className="biz-profile-header__meta">
            <span className={`biz-profile-header__status${isOpen ? '' : ' biz-profile-header__status--off'}`}>
              <span className="biz-profile-header__status-dot" /> {statusLabel ?? (isOpen ? 'פתוח עכשיו' : 'סגור')}
            </span>
            {statusHint && (
              <span className="biz-profile-header__status-hint">{statusHint}</span>
            )}
            {reviewCount > 0 && (
              <span className="biz-profile-header__rating" aria-label={`דירוג ${rating}`}>
                <StarFilledIcon /> {rating.toFixed(1)}
                <span className="biz-profile-header__reviews"> · {reviewCount} ביקורות</span>
              </span>
            )}
          </div>

          <div className="biz-profile-header__actions">
            <button type="button" className="biz-profile-header__btn biz-profile-header__btn--primary" onClick={onEdit}>
              <EditIcon /> ערוך פרופיל
            </button>
            {toggleLabel && (
              <button type="button" className="biz-profile-header__btn biz-profile-header__btn--secondary" onClick={onToggleOpen}>
                {toggleLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

