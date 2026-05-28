import { Link } from 'react-router-dom'
import ActiveDealCard from '../ActiveDealCard/ActiveDealCard'
import './ActiveDealsSection.css'

/**
 * ActiveDealsSection — List of running deals with a section header and
 * "view all" link.
 *
 * Props:
 *   deals          array  — deal objects passed as ActiveDealCard props
 *   onEdit         fn(id) — edit handler
 *   onToggleStatus fn(id) — pause / resume handler
 *   onDelete       fn(id) — permanent delete handler
 *   viewAllTo      string — destination for the view-all link (omit to hide it)
 */
export default function ActiveDealsSection({
  deals = [],
  onEdit,
  onToggleStatus,
  onDelete,
  viewAllTo = null,
}) {
  // Count only active deals (paused ones are shown dimmed but aren't "active"),
  // so this matches the dashboard summary card.
  const activeCount = deals.filter((d) => d.status !== 'paused').length

  return (
    <section className="active-deals-section" aria-label="מבצעים פעילים">
      <header className="active-deals-section__header">
        <h2 className="active-deals-section__title">
          מבצעים פעילים
          <span className="active-deals-section__count">{activeCount}</span>
        </h2>
        {viewAllTo && (
          <Link to={viewAllTo} className="active-deals-section__view-all">
            צפה בכולם
          </Link>
        )}
      </header>

      {deals.length === 0 ? (
        <div className="active-deals-section__empty">
          <span aria-hidden="true">📦</span>
          <p>אין מבצעים פעילים כרגע</p>
        </div>
      ) : (
        <div className="active-deals-section__list">
          {deals.map((d) => (
            <ActiveDealCard
              key={d.id}
              {...d}
              onEdit={() => onEdit?.(d.id)}
              onToggleStatus={() => onToggleStatus?.(d.id)}
              onDelete={() => onDelete?.(d.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
