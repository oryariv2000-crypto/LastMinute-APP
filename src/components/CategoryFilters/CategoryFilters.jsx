import FilterChip from '../FilterChip/FilterChip'
import './CategoryFilters.css'

/**
 * CategoryFilters — Horizontally scrollable strip of FilterChips.
 *
 * Props:
 *   categories  array — [{ id, label, icon, count }]
 *   value       string|null — currently active id ('all' for none)
 *   onChange    fn(id)
 */
export default function CategoryFilters({ categories = [], value = 'all', onChange }) {
  return (
    <nav className="category-filters" aria-label="סינון לפי קטגוריה">
      <div className="category-filters__scroll">
        {categories.map((c) => (
          <FilterChip
            key={c.id}
            label={c.label}
            icon={c.icon}
            count={c.count}
            active={c.id === value}
            onClick={() => onChange?.(c.id)}
          />
        ))}
      </div>
    </nav>
  )
}
