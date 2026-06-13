import { Price } from '../../lib/formatters'
import { PlusIcon, MinusIcon, ShoppingBagIcon } from '../icons'
import './AddToCartBar.css'

/**
 * AddToCartBar — Sticky bottom action bar on the deal info page.
 *
 * Props:
 *   price        number   — unit price
 *   quantity     number   — controlled quantity
 *   maxQuantity  number   — units left in stock
 *   onQtyChange  fn(next)
 *   onAdd        fn       — primary CTA handler
 *   loading      boolean  — disables and spins the CTA
 *   variant      'sticky' | 'inline' — sticky bottom bar (mobile) or in-flow
 *                block inside a column (desktop). Default 'sticky'.
 *   className    string   — extra classes (used to toggle visibility per
 *                breakpoint when both variants are rendered)
 */
export default function AddToCartBar({
  price,
  quantity = 1,
  maxQuantity = 99,
  onQtyChange,
  onAdd,
  loading = false,
  variant = 'sticky',
  className = '',
}) {
  const total = price * quantity
  const soldOut = maxQuantity < 1
  const disabled = loading || quantity < 1 || soldOut

  const dec = () => onQtyChange?.(Math.max(1, quantity - 1))
  const inc = () => onQtyChange?.(Math.min(maxQuantity, quantity + 1))

  return (
    <div
      className={`add-to-cart-bar add-to-cart-bar--${variant}${className ? ` ${className}` : ''}`}
      role="toolbar"
      aria-label="הוספה לעגלה"
    >
      <div className="add-to-cart-bar__qty" role="group" aria-label="כמות">
        <button
          type="button"
          className="add-to-cart-bar__qty-btn"
          onClick={dec}
          disabled={quantity <= 1}
          aria-label="הפחת כמות"
        >
          <MinusIcon />
        </button>
        <span className="add-to-cart-bar__qty-value" aria-live="polite">{quantity}</span>
        <button
          type="button"
          className="add-to-cart-bar__qty-btn"
          onClick={inc}
          disabled={quantity >= maxQuantity}
          aria-label="הוסף כמות"
        >
          <PlusIcon />
        </button>
      </div>

      <button
        type="button"
        className="add-to-cart-bar__cta"
        onClick={onAdd}
        disabled={disabled}
        aria-busy={loading}
      >
        {loading ? (
          <span className="add-to-cart-bar__spinner" aria-label="מוסיף..." />
        ) : soldOut ? (
          <span className="add-to-cart-bar__cta-label">אזל מהמלאי</span>
        ) : (
          <>
            <ShoppingBagIcon />
            <span className="add-to-cart-bar__cta-label">הוסף לסל</span>
            <Price value={total} fraction={0} className="add-to-cart-bar__cta-total" />
          </>
        )}
      </button>
    </div>
  )
}

