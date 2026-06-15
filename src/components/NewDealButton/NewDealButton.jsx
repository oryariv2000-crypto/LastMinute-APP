import { Link } from 'react-router-dom'
import { ChevronLeftIcon, SparkleIcon } from '../icons'
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
        <ChevronLeftIcon />
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
