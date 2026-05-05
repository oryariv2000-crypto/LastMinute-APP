import './BusinessSettingsList.css'

/**
 * BusinessSettingsList — Grouped list of profile settings rows.
 *
 * Props:
 *   groups: [
 *     {
 *       id, title,
 *       items: [
 *         { id, icon, label, value, type: 'link'|'toggle'|'value', checked, onClick, onChange, danger }
 *       ]
 *     }
 *   ]
 */
export default function BusinessSettingsList({ groups = [] }) {
  return (
    <div className="biz-settings">
      {groups.map(group => (
        <section key={group.id} className="biz-settings__group" aria-label={group.title}>
          {group.title && <h3 className="biz-settings__group-title">{group.title}</h3>}
          <ul className="biz-settings__list">
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
    <span className="biz-settings__row-left">
      <span className={`biz-settings__row-icon${danger ? ' biz-settings__row-icon--danger' : ''}`}>
        {icon}
      </span>
      <span className={`biz-settings__row-label${danger ? ' biz-settings__row-label--danger' : ''}`}>
        {label}
      </span>
    </span>
  )

  if (type === 'toggle') {
    return (
      <label className="biz-settings__row biz-settings__row--toggle">
        {innerLeft}
        <span className="biz-settings__switch">
          <input
            type="checkbox"
            checked={!!checked}
            onChange={(e) => onChange?.(e.target.checked)}
            aria-label={label}
          />
          <span className="biz-settings__switch-track">
            <span className="biz-settings__switch-thumb" />
          </span>
        </span>
      </label>
    )
  }

  if (type === 'value') {
    return (
      <button type="button" className="biz-settings__row" onClick={onClick}>
        {innerLeft}
        <span className="biz-settings__row-right">
          <span className="biz-settings__row-value">{value}</span>
          <ChevronIcon />
        </span>
      </button>
    )
  }

  return (
    <button type="button" className="biz-settings__row" onClick={onClick}>
      {innerLeft}
      <span className="biz-settings__row-right">
        <ChevronIcon />
      </span>
    </button>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className="biz-settings__chevron">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
