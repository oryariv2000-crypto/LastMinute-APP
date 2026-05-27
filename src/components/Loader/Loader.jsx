import './Loader.css'

/**
 * Loader — LastMinute-branded loading indicator: a brand-green ring spinning
 * around a gently pulsing leaf. Use inline (default) for data loads, or
 * `fullscreen` for between-page transitions (e.g. ProtectedRoute).
 *
 * Props:
 *   label       string   — text under the spinner (default "טוען…")
 *   fullscreen  boolean   — fill the viewport and center
 */
export default function Loader({ label = 'טוען…', fullscreen = false }) {
  return (
    <div
      className={`lm-loader${fullscreen ? ' lm-loader--full' : ''}`}
      role="status"
      aria-live="polite"
      dir="rtl"
    >
      <div className="lm-loader__spinner">
        <span className="lm-loader__leaf" aria-hidden="true">🌿</span>
      </div>
      {label && <p className="lm-loader__label">{label}</p>}
    </div>
  )
}
