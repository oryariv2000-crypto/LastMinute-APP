import { useNavigate } from 'react-router-dom'
import './DealHeroImage.css'

/**
 * DealHeroImage — Hero block at the top of the deal info page.
 *
 * Renders the product image (or gallery preview), back/share/save buttons,
 * and the discount + timer overlays.
 *
 * Props:
 *   image        string  — image URL
 *   discountPct  number
 *   timeLeftMin  number
 *   onBack       fn      — overrides default navigate(-1)
 *   onShare      fn
 *   saved        boolean
 *   onToggleSave fn
 */
export default function DealHeroImage({
  image,
  discountPct,
  timeLeftMin = 0,
  onBack,
  onShare,
  saved = false,
  onToggleSave,
}) {
  const navigate = useNavigate()
  const urgent = timeLeftMin <= 30
  const hours = Math.floor(timeLeftMin / 60)
  const mins  = timeLeftMin % 60
  const timeText = hours > 0
    ? `${hours}ש' ${String(mins).padStart(2, '0')}ד'`
    : `${mins}ד'`

  return (
    <section className="deal-hero" aria-label="תצוגת מבצע">
      {image ? (
        <img src={image} alt="" className="deal-hero__img" />
      ) : (
        <div className="deal-hero__img deal-hero__img--placeholder" aria-hidden="true">🥗</div>
      )}

      {/* Top-edge controls */}
      <div className="deal-hero__top">
        <button
          type="button"
          className="deal-hero__round-btn"
          onClick={onBack || (() => navigate(-1))}
          aria-label="חזרה"
        >
          {/* Chevron points to inline-end (right edge in RTL, ← in LTR). Flip in LTR via CSS. */}
          <ChevronStartIcon />
        </button>

        <div className="deal-hero__top-actions">
          <button
            type="button"
            className="deal-hero__round-btn"
            onClick={onShare}
            aria-label="שתף"
          >
            <ShareIcon />
          </button>
          <button
            type="button"
            className={`deal-hero__round-btn${saved ? ' deal-hero__round-btn--active' : ''}`}
            onClick={onToggleSave}
            aria-label={saved ? 'הסר משמורים' : 'שמור'}
            aria-pressed={saved}
          >
            <HeartIcon filled={saved} />
          </button>
        </div>
      </div>

      {/* Bottom-edge overlays */}
      <div className="deal-hero__overlay">
        {discountPct > 0 && (
          <span className="deal-hero__discount">
            -{discountPct}%
          </span>
        )}
        <span className={`deal-hero__timer${urgent ? ' deal-hero__timer--urgent' : ''}`}>
          <ClockIcon /> נותרו {timeText}
        </span>
      </div>
    </section>
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
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}
function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
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
