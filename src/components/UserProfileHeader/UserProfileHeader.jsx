import { EmailIcon, PhoneIcon, EditIcon } from '../icons'
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
            <EmailIcon /> {email}
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

