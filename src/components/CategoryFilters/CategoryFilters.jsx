import FilterChip from '../FilterChip/FilterChip'
import './CategoryFilters.css'

/**
 * CategoryFilters — Horizontally scrollable strip of FilterChips.
 *
 * Multi-select: `value` is an array of active ids. The parent decides the
 * semantics (e.g. an empty selection means "all").
 *
 * Props:
 *   categories  array — [{ id, label, icon, count }]
 *   value       string[] — active ids (array). A bare string is also accepted.
 *   onChange    fn(id) — toggles the clicked chip
 */
export default function CategoryFilters({ categories = [], value = [], onChange }) {
  const active = Array.isArray(value) ? value : [value]
  return (
    <nav className="category-filters" aria-label="סינון לפי קטגוריה">
      <div className="category-filters__scroll">
        {categories.map((c) => (
          <FilterChip
            key={c.id}
            label={c.label}
            icon={c.icon}
            count={c.count}
            active={active.includes(c.id)}
            onClick={() => onChange?.(c.id)}
          />
        ))}
      </div>
    </nav>
  )
}
