import { useNavigate } from 'react-router-dom'
import { ChevronRightIcon, ClockIcon, ShareIcon, HeartIcon } from '../icons'
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
  const showTimer = timeLeftMin > 0
  const urgent = timeLeftMin > 0 && timeLeftMin <= 30
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
          <ChevronRightIcon />
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
        {showTimer && (
          <span className={`deal-hero__timer${urgent ? ' deal-hero__timer--urgent' : ''}`}>
            <ClockIcon /> נותרו {timeText}
          </span>
        )}
      </div>
    </section>
  )
}
