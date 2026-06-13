import './DevelopmentNotice.css'

/**
 * DevelopmentNotice — the single, standard way to mark a feature that isn't
 * real/finished yet. Use this instead of ad-hoc "בקרוב" strings or inline
 * "demo only" hints so every placeholder reads consistently.
 *
 * Props:
 *   variant   'badge' | 'banner'   (default 'badge')
 *   label     badge text           (badge only, default 'בפיתוח')
 *   title     banner heading       (banner only)
 *   children  banner body text     (banner only)
 *
 * Examples:
 *   <DevelopmentNotice variant="badge" label="בקרוב" />
 *   <DevelopmentNotice variant="banner" title="תכונה בפיתוח">
 *     זהו מציין מקום לאינטגרציית תשלום אמיתית — לא יבוצע חיוב.
 *   </DevelopmentNotice>
 */
export default function DevelopmentNotice({ variant = 'badge', label = 'בפיתוח', title, children }) {
  if (variant === 'banner') {
    return (
      <div className="dev-notice dev-notice--banner" role="note">
        <span className="dev-notice__icon" aria-hidden="true">🚧</span>
        <span className="dev-notice__content">
          {title && <strong className="dev-notice__title">{title}</strong>}
          {children && <span className="dev-notice__body">{children}</span>}
        </span>
      </div>
    )
  }

  return <span className="dev-notice dev-notice--badge">{label}</span>
}
