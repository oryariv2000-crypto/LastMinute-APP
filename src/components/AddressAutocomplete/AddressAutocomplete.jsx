import { useEffect, useRef, useState } from 'react'
import InputField from '../InputField/InputField'
import { MapPinIcon } from '../icons'
import { searchAddresses } from '../../lib/geocode'
import './AddressAutocomplete.css'

/**
 * AddressAutocomplete — an address text field with a live suggestions dropdown
 * backed by OpenStreetMap Nominatim (no API key, same provider as the map).
 *
 * As the user types, queries are debounced (default 300ms) and stale requests
 * are aborted. Picking a suggestion fills the input AND hands the caller the
 * exact { lat, lng } so the form can persist real coordinates — no extra
 * geocoding round-trip on save.
 *
 * Props:
 *   id          string  — input id (also label htmlFor + listbox aria-controls)
 *   label       string  — visible label
 *   value       string  — controlled address text
 *   onChange    fn(text)            — free typing (caller should clear coords)
 *   onSelect    fn({ address, lat, lng }) — a suggestion was chosen
 *   placeholder string
 *   error       string
 *   required    boolean
 *   icon        node    — leading icon (defaults to a map pin)
 *   debounceMs  number  — keystroke debounce (default 300)
 *   minChars    number  — min length before searching (default 3)
 */
export default function AddressAutocomplete({
  id,
  label = 'כתובת',
  value = '',
  onChange,
  onSelect,
  placeholder,
  error,
  required = false,
  icon = <MapPinIcon />,
  debounceMs = 300,
  minChars = 3,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const justSelected = useRef(false)
  const boxRef = useRef(null)

  // Debounced + abortable search. Skips the request that immediately follows a
  // selection (value just became the full chosen address). All state updates are
  // deferred into the timer so nothing runs synchronously in the effect body.
  useEffect(() => {
    const q = (value || '').trim()
    if (justSelected.current) { justSelected.current = false; return }

    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      if (q.length < minChars) {
        setSuggestions([]); setOpen(false); setLoading(false); return
      }
      setLoading(true)
      try {
        const results = await searchAddresses(q, { signal: ctrl.signal })
        setSuggestions(results)
        setOpen(results.length > 0)
        setActive(-1)
      } catch {
        /* aborted or network error — keep the field usable */
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => { clearTimeout(timer); ctrl.abort() }
  }, [value, debounceMs, minChars])

  // Close the dropdown when clicking outside the component.
  useEffect(() => {
    function onDocMouseDown(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  function choose(s) {
    justSelected.current = true
    onSelect?.({ address: s.label, lat: s.lat, lng: s.lng })
    setSuggestions([])
    setOpen(false)
    setActive(-1)
  }

  function onKeyDown(e) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setActive((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault(); choose(suggestions[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const listId = `${id}-listbox`

  return (
    <div className="address-ac" ref={boxRef}>
      <InputField
        id={id}
        label={label}
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        error={error}
        required={required}
        icon={icon}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onKeyDown={onKeyDown}
        onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
      />

      {loading && (
        <span className="address-ac__status" role="status">מחפש כתובות…</span>
      )}

      {open && suggestions.length > 0 && (
        <ul className="address-ac__list" id={listId} role="listbox" aria-label="הצעות כתובת">
          {suggestions.map((s, i) => (
            <li
              key={`${s.lat},${s.lng},${i}`}
              id={`${id}-option-${i}`}
              role="option"
              aria-selected={i === active}
              className={`address-ac__item${i === active ? ' address-ac__item--active' : ''}`}
              // mousedown (not click) so it fires before the input's blur.
              onMouseDown={(e) => { e.preventDefault(); choose(s) }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="address-ac__item-icon" aria-hidden="true"><MapPinIcon /></span>
              <span className="address-ac__item-text">{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
