/**
 * Tiny RTL-safe formatters.
 *
 * In an RTL document, mixing the ₪ symbol with Latin digits or "HH:MM" timers
 * causes the bidi algorithm to flip the components ("₪25" rendering as "25₪",
 * "00:45" rendering as "45:00"). Wrapping the value in an inline-block element
 * forced to `dir="ltr"` makes it a single LTR atom inside the RTL flow, which
 * fixes both cases without changing surrounding alignment.
 */

const isolate = { display: 'inline-block', unicodeBidi: 'isolate' }

/**
 * Format a numeric price with the shekel sign in Hebrew reading order.
 * Renders as: "<amount> ₪", with the whole expression isolated as LTR
 * so the digits and symbol never swap.
 *
 *   <Price value={25} />          → "25.00 ₪"
 *   <Price value={25} fraction={0} /> → "25 ₪"
 */
export function Price({ value, fraction = 2, currency = '₪', className }) {
  const amount = Number(value).toLocaleString('en-US', {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  })
  return (
    <span dir="ltr" style={isolate} className={className}>
      {amount} {currency}
    </span>
  )
}

/**
 * Wrap an arbitrary value in an LTR-isolated inline-block. Use for things like
 * "00:45:00" timers or order codes that must read left-to-right inside RTL text.
 */
export function Ltr({ children, className }) {
  return (
    <span dir="ltr" style={isolate} className={className}>
      {children}
    </span>
  )
}

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
