import ActivityListItem from '../ActivityListItem/ActivityListItem'
import './RecentActivitySection.css'

/**
 * RecentActivitySection — Recent sales / pickups / reviews list.
 *
 * Props:
 *   items   array — { id, type, title, subtitle, timeAgo, amount }
 */
export default function RecentActivitySection({ items = [] }) {
  return (
    <section className="recent-activity" aria-label="פעילות אחרונה">
      <header className="recent-activity__header">
        <h2 className="recent-activity__title">פעילות אחרונה</h2>
      </header>

      <div className="recent-activity__card">
        {items.length === 0 ? (
          <p className="recent-activity__empty">אין פעילות חדשה</p>
        ) : (
          <ul className="recent-activity__list">
            {items.map((it) => (
              <ActivityListItem key={it.id} {...it} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
