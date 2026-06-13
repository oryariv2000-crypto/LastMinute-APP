/**
 * Time helpers. Kept out of formatters.jsx (which exports React components) so
 * the react-refresh "only-export-components" rule stays satisfied.
 */

/**
 * Render the remaining time until `target` as a zero-padded "HH:MM:SS" string.
 *
 * @param {Date|number|string} target - The expiry point (Date, ms timestamp, or
 *   ISO string). If the target is in the past the result is clamped to
 *   "00:00:00".
 * @returns {string} e.g. "01:23:45"
 */
export function formatTimer(target) {
  const targetMs = target instanceof Date ? target.getTime() : Number(new Date(target))
  const remainMs = Math.max(0, targetMs - Date.now())
  const totalSec = Math.floor(remainMs / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}
