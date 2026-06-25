import { useNavigate } from 'react-router-dom'
import { useAppMode } from '../../lib/useAppMode'
import { ShoppingBagIcon, BriefcaseIcon } from '../icons'
import './ModeToggle.css'

/**
 * ModeToggle — switches between the B2C (shopping) and B2B (business) shells.
 *
 * Rendered as a full-width row directly under the top bar (inside the sticky
 * <header>), so it stays visible while scrolling and is impossible to miss —
 * unlike the old small pill that hid in the crowded action row.
 *
 * Props:
 *   isBusiness  boolean  — whether the current user has business capability
 *   current     'shopping' | 'business'  — the shell this toggle is mounted in
 *
 * Only users who actually have BOTH roles see this switch. Customers without a
 * business render nothing here — their entry into the business world lives in
 * the profile page ("Open a Business Account"), so we don't nag every page.
 */
export default function ModeToggle({ isBusiness, current }) {
  const { setMode } = useAppMode()
  const navigate = useNavigate()

  if (!isBusiness) return null

  function select(targetMode) {
    if (targetMode === current) return // already here — no-op (don't yank them home)
    setMode(targetMode)
    navigate(targetMode === 'business' ? '/b2b/dashboard' : '/b2c/home')
  }

  return (
    <div className="mode-switch" role="group" aria-label="מצב תצוגה">
      <div className="mode-switch__track" data-active={current}>
        <span className="mode-switch__thumb" aria-hidden="true" />
        <button
          type="button"
          className={`mode-switch__seg${current === 'shopping' ? ' mode-switch__seg--active' : ''}`}
          aria-pressed={current === 'shopping'}
          onClick={() => select('shopping')}
        >
          <ShoppingBagIcon size={18} aria-hidden="true" />
          קנייה
        </button>
        <button
          type="button"
          className={`mode-switch__seg${current === 'business' ? ' mode-switch__seg--active' : ''}`}
          aria-pressed={current === 'business'}
          onClick={() => select('business')}
        >
          <BriefcaseIcon size={18} aria-hidden="true" />
          עסק
        </button>
      </div>
    </div>
  )
}
