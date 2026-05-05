import { Link } from 'react-router-dom'
import ActiveDealCard from '../ActiveDealCard/ActiveDealCard'
import './ActiveDealsSection.css'

/**
 * ActiveDealsSection — List of running deals with a section header and
 * "view all" link.
 *
 * Props:
 *   deals      array  — deal objects passed as ActiveDealCard props
 *   onEdit     fn(id) — edit handler
 *   onPause    fn(id) — pause handler
 *   viewAllTo  string — destination for the view-all link
 */
export default function ActiveDealsSection({
  deals = [],
  onEdit,
  onPause,
  viewAllTo = '/b2b/deals',
}) {
  return (
    <section className="active-deals-section" aria-label="מבצעים פעילים">
      <header className="active-deals-section__header">
        <h2 className="active-deals-section__title">
          מבצעים פעילים
          <span className="active-deals-section__count">{deals.length}</span>
        </h2>
        <Link to={viewAllTo} className="active-deals-section__view-all">
          צפה בכולם
        </Link>
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
              onPause={() => onPause?.(d.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
