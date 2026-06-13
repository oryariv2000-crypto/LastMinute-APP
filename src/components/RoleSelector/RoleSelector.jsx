import { UserIcon, HomeIcon, CheckIcon } from '../icons'
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
        icon={<UserIcon />}
        title="לקוח"
        description="אני מחפש/ת מוצרים במחירי הנחה לפני סגירה"
      />
      <RoleCard
        id="role-b2b"
        selected={value === 'b2b'}
        onSelect={() => onChange('b2b')}
        icon={<HomeIcon />}
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

