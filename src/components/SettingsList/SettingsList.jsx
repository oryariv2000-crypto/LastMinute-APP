import './SettingsList.css'

/**
 * SettingsList — Generic grouped settings list (B2C profile).
 *
 * Props:
 *   groups: [
 *     {
 *       id, title,
 *       items: [
 *         { id, icon, label, value, type: 'link'|'toggle'|'value',
 *           checked, onClick, onChange, danger }
 *       ]
 *     }
 *   ]
 */
export default function SettingsList({ groups = [] }) {
  return (
    <div className="settings-list">
      {groups.map(group => (
        <section key={group.id} className="settings-list__group" aria-label={group.title}>
          {group.title && <h3 className="settings-list__group-title">{group.title}</h3>}
          <ul className="settings-list__list">
            {group.items.map(item => (
              <li key={item.id}>
                <SettingsRow item={item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function SettingsRow({ item }) {
  const { icon, label, value, type = 'link', checked, onClick, onChange, danger } = item

  const innerLeft = (
    <span className="settings-list__row-left">
      <span className={`settings-list__row-icon${danger ? ' settings-list__row-icon--danger' : ''}`}>
        {icon}
      </span>
      <span className={`settings-list__row-label${danger ? ' settings-list__row-label--danger' : ''}`}>
        {label}
      </span>
    </span>
  )

  if (type === 'toggle') {
    return (
      <label className="settings-list__row settings-list__row--toggle">
        {innerLeft}
        <span className="settings-list__switch">
          <input
            type="checkbox"
            checked={!!checked}
            onChange={(e) => onChange?.(e.target.checked)}
            aria-label={label}
          />
          <span className="settings-list__switch-track">
            <span className="settings-list__switch-thumb" />
          </span>
        </span>
      </label>
    )
  }

  if (type === 'value') {
    return (
      <button type="button" className="settings-list__row" onClick={onClick}>
        {innerLeft}
        <span className="settings-list__row-right">
          <span className="settings-list__row-value">{value}</span>
          <ChevronIcon />
        </span>
      </button>
    )
  }

  return (
    <button type="button" className="settings-list__row" onClick={onClick}>
      {innerLeft}
      <span className="settings-list__row-right">
        <ChevronIcon />
      </span>
    </button>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className="settings-list__chevron">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
