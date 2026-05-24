import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './NavbarB2C.css'

/**
 * NavbarB2C — Sticky two-row top navigation for end customers.
 *
 * Row 1: brand logo  |  location pill  |  avatar
 * Row 2: full-width search bar
 *
 * Props:
 *   location      string   — current city / neighbourhood (default placeholder)
 *   userName      string   — first name shown in avatar initials
 *   onSearch      fn       — callback(query: string) when user types
 */
export default function NavbarB2C({
  location = 'תל אביב',
  userName = 'דנה כהן',
  onSearch,
}) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const initials = userName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    onSearch?.(val)
  }

  function clearSearch() {
    setQuery('')
    onSearch?.('')
  }

  return (
    <header className="navbar-b2c" role="banner">
      <div className="navbar-b2c__inner">

        {/* ── Top row ───────────────────────────────────── */}
        <div className="navbar-b2c__top">
          {/* Brand */}
          <Link to="/b2c/home" className="navbar-b2c__brand" aria-label="Last Minute — דף הבית">
            <span className="navbar-b2c__logo-mark" aria-hidden="true">🌿</span>
            <span className="navbar-b2c__brand-name">Last Minute</span>
          </Link>

          {/* Location picker */}
          <button
            className="navbar-b2c__location"
            aria-label={`מיקום נוכחי: ${location}. לחץ לשינוי`}
            id="b2c-nav-location"
          >
            <LocationPinIcon />
            <span className="navbar-b2c__location-text">{location}</span>
            <ChevronDownIcon className="navbar-b2c__location-chevron" />
          </button>

          {/* Avatar / Profile */}
          <Link
            to="/b2c/profile"
            className="navbar-b2c__avatar"
            aria-label={`פרופיל — ${userName}`}
            id="b2c-nav-avatar"
          >
            {initials}
          </Link>

          {/* Logout */}
          <button
            className="navbar-b2c__logout"
            onClick={handleLogout}
            aria-label="התנתקות"
            id="b2c-nav-logout"
          >
            <LogoutIcon />
          </button>
        </div>

        {/* ── Search row ────────────────────────────────── */}
        <div className="navbar-b2c__search-wrap">
          <span className="navbar-b2c__search-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            id="b2c-nav-search"
            className="navbar-b2c__search-input"
            type="search"
            placeholder="חפש מסעדות, מאפיות, קופה..."
            value={query}
            onChange={handleChange}
            aria-label="חיפוש עסקים ומבצעים"
            autoComplete="off"
          />
          {query && (
            <button
              className="navbar-b2c__search-clear"
              onClick={clearSearch}
              aria-label="נקה חיפוש"
            >
              <XIcon />
            </button>
          )}
        </div>

      </div>
    </header>
  )
}

/* ── Inline SVG Icons ─────────────────────────────────────── */
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function LocationPinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function ChevronDownIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 12, height: 12 }} aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
