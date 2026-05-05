import './FilterChip.css'

/**
 * FilterChip — Toggleable pill used inside CategoryFilters.
 *
 * Props:
 *   label     string   — visible text
 *   icon      node     — optional emoji or small SVG to lead the label
 *   active    boolean  — selected state
 *   count     number   — optional count badge (e.g. results in this category)
 *   onClick   fn       — handler
 */
export default function FilterChip({
  label,
  icon,
  active = false,
  count,
  onClick,
  ...rest
}) {
  return (
    <button
      type="button"
      className={`filter-chip${active ? ' filter-chip--active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
      {...rest}
    >
      {icon && <span className="filter-chip__icon" aria-hidden="true">{icon}</span>}
      <span className="filter-chip__label">{label}</span>
      {count != null && (
        <span className="filter-chip__count" aria-hidden="true">{count}</span>
      )}
    </button>
  )
}
