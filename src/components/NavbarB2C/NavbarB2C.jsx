import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { getBusinessesForMap } from '../../lib/db'
import BrandLogo from '../BrandLogo/BrandLogo'
import './NavbarB2C.css'

/**
 * NavbarB2C — Sticky top navigation for end customers. Aligns to the page
 * content width (--shell-max) at every breakpoint: on mobile it's brand+avatar
 * with the search below; on desktop it's a single row brand | search | avatar.
 *
 * Props:
 *   userName      string   — name shown in avatar initials
 *   onSearch      fn       — callback(query: string) when user types
 *   showSearch    boolean  — render the search bar (default true)
 */
export default function NavbarB2C({
  userName = 'לקוח/ה',
  onSearch,
  showSearch = true,
}) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const navigate = useNavigate()

  // Business list for the search autocomplete (shared, cached). Only fetched
  // when the search bar is actually rendered.
  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses-map'],
    queryFn: getBusinessesForMap,
    enabled: showSearch,
  })

  const q = query.trim().toLowerCase()
  const suggestions = q
    ? businesses.filter((b) => (b.name || '').toLowerCase().includes(q)).slice(0, 6)
    : []
  const showSuggestions = focused && suggestions.length > 0

  function pickBusiness(biz) {
    setQuery('')
    setFocused(false)
    onSearch?.('')
    // Jump to the map and fly to the chosen business.
    navigate('/b2c/explore', { state: { focusBusinessId: biz.id } })
  }

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
      <div className={`navbar-b2c__inner${showSearch ? '' : ' navbar-b2c__inner--no-search'}`}>

        {/* Brand */}
        <Link to="/b2c/home" className="navbar-b2c__brand" aria-label="Last Minute — דף הבית">
          <BrandLogo tone="dark" size="sm" />
        </Link>

        {/* Actions: avatar + logout */}
        <div className="navbar-b2c__actions">
          <Link
            to="/b2c/profile"
            className="navbar-b2c__avatar"
            aria-label={`פרופיל — ${userName}`}
            id="b2c-nav-avatar"
          >
            {initials}
          </Link>
          <button
            className="navbar-b2c__logout"
            onClick={handleLogout}
            aria-label="התנתקות"
            id="b2c-nav-logout"
          >
            <LogoutIcon />
          </button>
        </div>

        {/* ── Search ────────────────────────────────────── */}
        {showSearch && (
          <div className="navbar-b2c__search-wrap">
            <span className="navbar-b2c__search-icon" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              id="b2c-nav-search"
              className="navbar-b2c__search-input"
              type="search"
              placeholder="חפש עסקים — מאפיות, בתי קפה, מסעדות..."
              value={query}
              onChange={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              aria-label="חיפוש עסקים"
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

            {showSuggestions && (
              <ul className="navbar-b2c__suggestions" role="listbox" aria-label="עסקים תואמים">
                {suggestions.map((b) => (
                  <li key={b.id} role="option" aria-selected="false">
                    <button
                      type="button"
                      className="navbar-b2c__suggestion"
                      onMouseDown={(e) => e.preventDefault()} /* keep input from blurring first */
                      onClick={() => pickBusiness(b)}
                    >
                      <span className="navbar-b2c__suggestion-icon" aria-hidden="true">🏪</span>
                      <span className="navbar-b2c__suggestion-text">
                        <span className="navbar-b2c__suggestion-name">{b.name}</span>
                        {b.address && <span className="navbar-b2c__suggestion-addr">{b.address}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

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
