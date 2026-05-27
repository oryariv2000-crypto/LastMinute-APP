import { useState } from 'react'
import './StatsChartsSection.css'

/**
 * StatsChartsSection — Period switch + dummy chart visuals (bars + donut).
 * Real data wiring is intentionally deferred — these are placeholder visuals.
 */
const PERIODS = [
  { id: '7d',  label: '7 ימים' },
  { id: '30d', label: '30 ימים' },
  { id: '90d', label: '90 ימים' },
]

const BARS = [
  { day: 'א',   value: 38 },
  { day: 'ב',   value: 62 },
  { day: 'ג',   value: 55 },
  { day: 'ד',   value: 80 },
  { day: 'ה',   value: 72 },
  { day: 'ו',   value: 95 },
  { day: 'ש',   value: 48 },
]

const CATEGORIES = [
  { id: 'baked',   label: 'מאפים',   value: 42, color: 'var(--color-brand-primary)' },
  { id: 'salads',  label: 'סלטים',   value: 28, color: 'var(--color-mint-green)' },
  { id: 'mains',   label: 'מנות',    value: 18, color: 'var(--color-accent)' },
  { id: 'other',   label: 'אחר',    value: 12, color: 'var(--color-outline-variant)' },
]

export default function StatsChartsSection() {
  const [period, setPeriod] = useState('7d')

  // Build the conic-gradient for the donut with a pure reduce — no variables
  // are mutated during render. Each step carries the running offset forward.
  const conic = CATEGORIES
    .reduce(
      ({ offset, stops }, c) => ({
        offset: offset + c.value,
        stops: [...stops, `${c.color} ${offset}% ${offset + c.value}%`],
      }),
      { offset: 0, stops: [] },
    )
    .stops
    .join(', ')

  return (
    <section className="stats-charts" aria-label="גרפים וביצועים">
      {/* Period switcher */}
      <div className="stats-charts__tabs" role="tablist">
        {PERIODS.map(p => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={period === p.id}
            className={`stats-charts__tab${period === p.id ? ' stats-charts__tab--active' : ''}`}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      <article className="stats-charts__card">
        <header className="stats-charts__card-head">
          <h3 className="stats-charts__card-title">מכירות יומיות</h3>
          <span className="stats-charts__card-sub">{periodLabel(period)}</span>
        </header>
        <div className="stats-charts__bars" aria-hidden="true">
          {BARS.map((b, i) => (
            <div key={i} className="stats-charts__bar-wrap">
              <span className="stats-charts__bar" style={{ height: `${b.value}%` }} />
              <span className="stats-charts__bar-label">{b.day}</span>
            </div>
          ))}
        </div>
      </article>

      {/* Donut + legend */}
      <article className="stats-charts__card">
        <header className="stats-charts__card-head">
          <h3 className="stats-charts__card-title">פילוח קטגוריות</h3>
          <span className="stats-charts__card-sub">% מכלל המכירות</span>
        </header>
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
            {CATEGORIES.map(c => (
              <li key={c.id}>
                <span className="stats-charts__legend-dot" style={{ background: c.color }} />
                <span className="stats-charts__legend-label">{c.label}</span>
                <span className="stats-charts__legend-value">{c.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </section>
  )
}

function periodLabel(id) {
  if (id === '7d')  return '7 ימים אחרונים'
  if (id === '30d') return '30 ימים אחרונים'
  return '90 ימים אחרונים'
}
