import './StatsChartsSection.css'

/**
 * StatsChartsSection — real, order-based charts for the B2B Stats page.
 * Pure presentational: all data is computed upstream from live orders.
 *
 * Props:
 *   bars       [{ label, value }]   — revenue per time bucket (value in ₪)
 *   categories [{ label, revenue }] — revenue per deal category
 *   barsTitle  string               — e.g. "7 ימים אחרונים"
 */
const DONUT_COLORS = [
  'var(--color-brand-primary)',
  'var(--color-mint-green)',
  'var(--color-accent)',
  'var(--color-dark-forest)',
  'var(--color-outline-variant)',
]

export default function StatsChartsSection({ bars = [], categories = [], barsTitle = '' }) {
  const maxBar = Math.max(0, ...bars.map((b) => b.value))
  const hasSales = maxBar > 0

  const totalCat = categories.reduce((s, c) => s + c.revenue, 0)
  const cats = categories.map((c, i) => ({
    ...c,
    pct: totalCat > 0 ? Math.round((c.revenue / totalCat) * 100) : 0,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }))

  // conic-gradient stops via a pure reduce (no mutation during render).
  const conic = cats
    .reduce(
      ({ offset, stops }, c) => ({
        offset: offset + c.pct,
        stops: [...stops, `${c.color} ${offset}% ${offset + c.pct}%`],
      }),
      { offset: 0, stops: [] },
    )
    .stops
    .join(', ')

  return (
    <section className="stats-charts" aria-label="גרפים וביצועים">
      {/* Bar chart — revenue per bucket */}
      <article className="stats-charts__card">
        <header className="stats-charts__card-head">
          <h3 className="stats-charts__card-title">מכירות</h3>
          <span className="stats-charts__card-sub">{barsTitle}</span>
        </header>

        {hasSales ? (
          <div className="stats-charts__bars" role="img" aria-label={`גרף מכירות, שיא ₪${maxBar.toLocaleString('he-IL')}`}>
            {bars.map((b, i) => (
              <div key={i} className="stats-charts__bar-wrap" title={`${b.label}: ₪${b.value.toLocaleString('he-IL')}`}>
                <span
                  className="stats-charts__bar"
                  style={{ height: `${maxBar ? Math.round((b.value / maxBar) * 100) : 0}%` }}
                />
                <span className="stats-charts__bar-label">{b.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="stats-charts__empty">אין מכירות בתקופה זו עדיין</p>
        )}
      </article>

      {/* Donut — revenue by category */}
      <article className="stats-charts__card">
        <header className="stats-charts__card-head">
          <h3 className="stats-charts__card-title">פילוח קטגוריות</h3>
          <span className="stats-charts__card-sub">% מההכנסות</span>
        </header>

        {totalCat > 0 ? (
          <div className="stats-charts__donut-wrap">
            <div
              className="stats-charts__donut"
              style={{ background: `conic-gradient(${conic})` }}
              aria-hidden="true"
            >
              <div className="stats-charts__donut-hole">
                <span className="stats-charts__donut-value">100%</span>
                <span className="stats-charts__donut-cap">סה״כ</span>
              </div>
            </div>
            <ul className="stats-charts__legend">
              {cats.map((c, i) => (
                <li key={i}>
                  <span className="stats-charts__legend-dot" style={{ background: c.color }} />
                  <span className="stats-charts__legend-label">{c.category}</span>
                  <span className="stats-charts__legend-value">{c.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="stats-charts__empty">אין נתוני קטגוריות בתקופה זו</p>
        )}
      </article>
    </section>
  )
}
