import './UserProfileHeader.css'

/**
 * UserProfileHeader — Customer profile hero with avatar, name, contact, edit.
 *
 * Props:
 *   name        string
 *   email       string
 *   phone       string
 *   avatarUrl   string  — optional photo URL
 *   memberSince string  — optional formatted date / "ינואר 2026"
 *   onEdit      fn
 */
export default function UserProfileHeader({
  name,
  email,
  phone,
  avatarUrl,
  memberSince,
  onEdit,
}) {
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <section className="user-profile-header" aria-label="פרופיל משתמש">
      <div className="user-profile-header__avatar">
        {avatarUrl
          ? <img src={avatarUrl} alt="" />
          : <span aria-hidden="true">{initials}</span>}
      </div>

      <div className="user-profile-header__text">
        <h1 className="user-profile-header__name">{name}</h1>
        {email && (
          <p className="user-profile-header__line">
            <MailIcon /> {email}
          </p>
        )}
        {phone && (
          <p className="user-profile-header__line">
            <PhoneIcon /> {phone}
          </p>
        )}
        {memberSince && (
          <p className="user-profile-header__since">חבר/ה מאז {memberSince}</p>
        )}
      </div>

      <button
        type="button"
        className="user-profile-header__edit"
        onClick={onEdit}
        aria-label="ערוך פרופיל"
      >
        <EditIcon /> ערוך
      </button>
    </section>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2 4 12 13 22 4" />
    </svg>
  )
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.84 12 19.79 19.79 0 0 1 1.77 3.35 2 2 0 0 1 3.74 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.65a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}
function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
