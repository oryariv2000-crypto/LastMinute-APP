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
              <PinIcon /> {address}
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
                <StarIcon /> {rating.toFixed(1)}
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

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
