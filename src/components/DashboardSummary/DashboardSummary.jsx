import './DashboardSummary.css'

/**
 * DashboardSummary — Grid of high-level stat cards for the B2B home.
 *
 * Props:
 *   stats: [{ id, label, value, delta, icon, accent }]
 *     icon   — node (SVG)
 *     accent — 'primary' | 'accent' | 'success' | 'error'
 *     delta  — optional string like "+12%"
 */
export default function DashboardSummary({ stats }) {
  return (
    <section className="dashboard-summary" aria-label="סיכום היום">
      <div className="dashboard-summary__grid">
        {stats.map((s) => (
          <article
            key={s.id}
            className={`dashboard-summary__card dashboard-summary__card--${s.accent || 'primary'}`}
          >
            <span className="dashboard-summary__icon" aria-hidden="true">{s.icon}</span>
            <span className="dashboard-summary__label">{s.label}</span>
            <span className="dashboard-summary__value">{s.value}</span>
            {s.delta && (
              <span className="dashboard-summary__delta">{s.delta}</span>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
