/**
 * Time helpers. Kept out of formatters.jsx (which exports React components) so
 * the react-refresh "only-export-components" rule stays satisfied.
 */

/** Render minutes-left as a fixed "HH:MM:SS" or "MM:SS" timer string. */
export function formatTimer(minutes) {
  const safe = Math.max(0, Math.floor(minutes || 0))
  const h = Math.floor(safe / 60)
  const m = safe % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
  }
  return `${String(m).padStart(2, '0')}:00`
}
