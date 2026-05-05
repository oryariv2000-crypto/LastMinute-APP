import { useMemo, useState } from 'react'
import OrderHistoryCard from '../OrderHistoryCard/OrderHistoryCard'
import './OrderHistoryList.css'

/**
 * OrderHistoryList — Filterable list of orders grouped by status.
 *
 * Props:
 *   orders        array  — OrderHistoryCard prop objects
 *   defaultTab    string — 'active' | 'completed' | 'all' (default: 'all')
 *   onReorder     fn(id) — bubbled to each card
 */
const TABS = [
  { id: 'all',       label: 'הכל' },
  { id: 'active',    label: 'פעילות' },
  { id: 'completed', label: 'הושלמו' },
]

export default function OrderHistoryList({ orders = [], defaultTab = 'all', onReorder }) {
  const [tab, setTab] = useState(defaultTab)

  const counts = useMemo(() => ({
    all:       orders.length,
    active:    orders.filter(o => o.status === 'active' || o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
  }), [orders])

  const filtered = useMemo(() => {
    if (tab === 'all')       return orders
    if (tab === 'active')    return orders.filter(o => o.status === 'active' || o.status === 'ready')
    if (tab === 'completed') return orders.filter(o => o.status === 'completed')
    return orders
  }, [orders, tab])

  return (
    <section className="order-history-list" aria-label="היסטוריית הזמנות">
      <nav className="order-history-list__tabs" role="tablist">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            className={`order-history-list__tab${tab === t.id ? ' order-history-list__tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {counts[t.id] > 0 && (
              <span className="order-history-list__tab-count">{counts[t.id]}</span>
            )}
          </button>
        ))}
      </nav>

      {filtered.length === 0 ? (
        <div className="order-history-list__empty">
          <span aria-hidden="true">📦</span>
          <p>אין הזמנות בקטגוריה הזו</p>
        </div>
      ) : (
        <div className="order-history-list__items">
          {filtered.map(o => (
            <OrderHistoryCard
              key={o.id}
              {...o}
              onReorder={() => onReorder?.(o.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
