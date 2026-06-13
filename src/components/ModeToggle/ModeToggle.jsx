import { Link, useNavigate } from 'react-router-dom'
import { useAppMode } from '../../lib/useAppMode'
import './ModeToggle.css'

/**
 * ModeToggle — switches between the B2C (shopping) and B2B (business) shells.
 *
 * Props:
 *   isBusiness  boolean  — whether the current user has business capability
 *   current     'shopping' | 'business'  — the shell this toggle is mounted in
 *
 * If isBusiness is true: shows a button to jump to the other shell.
 * If isBusiness is false: shows a CTA link to the open-business onboarding page.
 */
export default function ModeToggle({ isBusiness, current }) {
  const { setMode } = useAppMode()
  const navigate = useNavigate()

  if (!isBusiness) {
    return (
      <Link to="/b2c/open-business" className="mode-toggle mode-toggle--cta">
        פתיחת עסק
      </Link>
    )
  }

  const isShopping = current === 'shopping'
  const label = isShopping ? 'עבור למצב עסק' : 'עבור למצב קנייה'
  const targetMode = isShopping ? 'business' : 'shopping'
  const targetPath = isShopping ? '/b2b/dashboard' : '/b2c/home'

  function handleClick() {
    setMode(targetMode)
    navigate(targetPath)
  }

  return (
    <button
      type="button"
      className="mode-toggle mode-toggle--switch"
      onClick={handleClick}
    >
      {label}
    </button>
  )
}
