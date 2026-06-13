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
 * Format a numeric price with the shekel sign on the LEFT (₪ before the
 * amount), isolated as an LTR atom so the digits and symbol never swap.
 *
 *   <Price value={25} />              → "₪25.00"
 *   <Price value={25} fraction={0} /> → "₪25"
 */
export function Price({ value, fraction = 2, currency = '₪', className }) {
  const amount = Number(value).toLocaleString('en-US', {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  })
  return (
    <span dir="ltr" style={isolate} className={className}>
      {currency}{amount}
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
