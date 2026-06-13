import { useState } from 'react'
import '../DealEditModal/DealEditModal.css'
import '../PickerModal/PickerModal.css'
import './LocationPickerModal.css'
import { REGIONS, nearestRegion, nearestCity } from '../../lib/regions'
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '../icons'

/**
 * LocationPickerModal — two-step location chooser: pick a region, then a city
 * within it. "אתר אותי" uses the device location and resolves the nearest
 * region + city locally (from regions.js centroids — no external geocoder).
 *
 * Props:
 *   value     string             — current city name (highlights it)
 *   onSelect  fn(city, region)    — chosen city name + region label
 *   onClose   fn
 */
export default function LocationPickerModal({ value, onSelect, onClose }) {
  const [region, setRegion]   = useState(null)   // selected region object, or null at step 1
  const [locating, setLocating] = useState(false)
  const [error, setError]     = useState('')

  function choose(cityName, regionLabel) {
    onSelect?.(cityName, regionLabel)
    onClose?.()
  }

  function detect() {
    if (!navigator.geolocation) { setError('המכשיר לא תומך באיתור מיקום — בחר/י ידנית'); return }
    setLocating(true); setError('')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here = [p.coords.latitude, p.coords.longitude]
        const r = nearestRegion(here)
        const c = nearestCity(r, here)
        setLocating(false)
        choose(c.name, r.label)
      },
      () => { setLocating(false); setError('לא הצלחנו לאתר מיקום — בחר/י ידנית') },
      { enableHighAccuracy: true, timeout: 6000 },
    )
  }

  return (
    <div className="deal-edit__backdrop" role="dialog" aria-modal="true" aria-label="בחירת מיקום" onClick={onClose}>
      <div className="deal-edit__panel card picker" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <h2 className="deal-edit__title">מיקום</h2>

        <button type="button" className="locpick__detect" onClick={detect} disabled={locating}>
          {locating ? <span className="locpick__spinner" aria-hidden="true" /> : <CrosshairIcon />}
          {locating ? 'מאתר…' : 'אתר את מיקומי אוטומטית'}
        </button>
        {error && <p className="locpick__error" role="alert">{error}</p>}

        {!region ? (
          <>
            <p className="locpick__step-label">בחר/י אזור</p>
            <ul className="picker__list" role="list">
              {REGIONS.map((r) => (
                <li key={r.id}>
                  <button type="button" className="picker__option" onClick={() => setRegion(r)}>
                    <span className="picker__option-text">
                      <span className="picker__option-label">{r.label}</span>
                      <span className="picker__option-hint">{r.cities.length} ערים ויישובים</span>
                    </span>
                    <ChevronLeftIcon className="picker__check" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <button type="button" className="locpick__back" onClick={() => setRegion(null)}>
              <ChevronRightIcon /> כל האזורים
            </button>
            <p className="locpick__step-label">{region.label}</p>
            <ul className="picker__list" role="radiogroup" aria-label={region.label}>
              {region.cities.map((c) => {
                const active = c.name === value
                return (
                  <li key={c.name}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`picker__option${active ? ' picker__option--active' : ''}`}
                      onClick={() => choose(c.name, region.label)}
                    >
                      <span className="picker__option-label">{c.name}</span>
                      {active && <CheckIcon className="picker__check" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        <div className="deal-edit__actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>סגור</button>
        </div>
      </div>
    </div>
  )
}

function CrosshairIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" /><line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" /><line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" /><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  )
}
