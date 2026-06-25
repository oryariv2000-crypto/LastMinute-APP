import { Link } from 'react-router-dom'
import { BriefcaseIcon, ChevronLeftIcon } from '../icons'
import './OpenBusinessCard.css'

/**
 * OpenBusinessCard — Prominent profile entry into the B2B onboarding flow.
 *
 * Shown to customers who don't have a business yet. Owners already have the
 * header ModeToggle to switch shells, so for them this renders nothing.
 *
 * Props:
 *   isBusiness  boolean — current user's capability flag (users.is_business)
 */
export default function OpenBusinessCard({ isBusiness }) {
  if (isBusiness) return null

  return (
    <section className="open-business-card" aria-labelledby="obc-title">
      <span className="open-business-card__icon" aria-hidden="true">
        <BriefcaseIcon />
      </span>
      <div className="open-business-card__text">
        <h3 id="obc-title" className="open-business-card__title">יש לך עסק?</h3>
        <p className="open-business-card__subtitle">
          פתחו חשבון עסקי והתחילו למכור עודפים במחיר מוזל במקום לזרוק אותם.
        </p>
      </div>
      <Link
        to="/b2c/open-business"
        className="open-business-card__cta"
        id="open-business-cta"
      >
        פתיחת חשבון עסקי
        <ChevronLeftIcon size={18} aria-hidden="true" />
      </Link>
    </section>
  )
}
