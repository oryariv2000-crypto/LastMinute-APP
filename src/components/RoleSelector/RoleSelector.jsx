import './RoleSelector.css'

/**
 * RoleSelector — Choose between B2C (customer) or B2B (business) registration.
 *
 * Props:
 *   value      string   — 'b2c' | 'b2b' | ''
 *   onChange   fn(role) — called with the selected role string
 */
export default function RoleSelector({ value, onChange }) {
  return (
    <div className="role-selector" role="group" aria-label="בחירת סוג חשבון">
      <RoleCard
        id="role-b2c"
        selected={value === 'b2c'}
        onSelect={() => onChange('b2c')}
        icon={<CustomerIcon />}
        title="לקוח"
        description="אני מחפש/ת מוצרים במחירי הנחה לפני סגירה"
      />
      <RoleCard
        id="role-b2b"
        selected={value === 'b2b'}
        onSelect={() => onChange('b2b')}
        icon={<BusinessIcon />}
        title="עסק"
        description="אני בעל/ת עסק ורוצה למכור מוצרים עודפים"
      />
    </div>
  )
}

function RoleCard({ id, selected, onSelect, icon, title, description }) {
  return (
    <button
      id={id}
      type="button"
      className={`role-card${selected ? ' role-card--selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="role-card__icon">{icon}</span>
      <span className="role-card__title">{title}</span>
      <span className="role-card__description">{description}</span>
      {selected && <span className="role-card__check" aria-hidden="true"><CheckIcon /></span>}
    </button>
  )
}

/* ── Inline SVG icons ─────────────────────────────────────────── */
function CustomerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function BusinessIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
