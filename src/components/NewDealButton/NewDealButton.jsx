import { Link } from 'react-router-dom'
import './NewDealButton.css'

/**
 * NewDealButton — Hero CTA on the dashboard launching the AI publish flow.
 *
 * Props:
 *   to        string  — destination route (default: /b2b/new-deal)
 *   onClick   fn      — optional handler (overrides Link)
 */
export default function NewDealButton({ to = '/b2b/new-deal', onClick }) {
  const inner = (
    <>
      <span className="new-deal-btn__icon" aria-hidden="true">
        <SparkleIcon />
      </span>
      <span className="new-deal-btn__text">
        <span className="new-deal-btn__title">פרסם מבצע חדש</span>
        <span className="new-deal-btn__subtitle">המערכת תזהה מוצרים שעומדים להיגמר</span>
      </span>
      <span className="new-deal-btn__arrow" aria-hidden="true">
        <ArrowIcon />
      </span>
    </>
  )

  if (onClick) {
    return (
      <button type="button" className="new-deal-btn" onClick={onClick} id="new-deal-cta">
        {inner}
      </button>
    )
  }
  return (
    <Link to={to} className="new-deal-btn" id="new-deal-cta">
      {inner}
    </Link>
  )
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.4L19 10l-5.1 1.6L12 17l-1.9-5.4L5 10l5.1-1.6z" />
      <path d="M19 17l.9 2L22 19.9 19.9 21 19 23l-.9-2L16 19.9 18.1 19z" />
    </svg>
  )
}
function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
