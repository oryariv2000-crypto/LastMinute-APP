/**
 * Tiny RTL-safe formatters.
 *
 * In an RTL document, mixing the ₪ symbol with Latin digits or "HH:MM" timers
 * causes the bidi algorithm to flip the components ("₪25" rendering as "25₪",
 * "00:45" rendering as "45:00"). Wrapping the value in an inline-block element
 * forced to `dir="ltr"` makes it a single LTR atom inside the RTL flow, which
 * fixes both cases without changing surrounding alignment.
 *
 * The shekel sign is rendered in its own `.price__symbol` span so it can be
 * styled independently of the digits: the body font (Heebo) draws a wide,
 * heavy ₪ that reads inconsistently next to numerals, so the symbol gets a
 * clean UI-font stack and a hair of inline spacing from the amount. Styling
 * lives in formatters.css and applies everywhere <Price> is used.
 */
import './formatters.css'

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
  const cls = ['price', className].filter(Boolean).join(' ')
  return (
    <span dir="ltr" style={isolate} className={cls}>
      <span className="price__symbol">{currency}</span>{amount}
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
