import ProductCard from '../ProductCard/ProductCard'
import './ProductGrid.css'

/**
 * ProductGrid — Responsive grid of ProductCards.
 *
 * Layout:
 *   ≤ 599px (mobile)   → 1 column (stacked)
 *   600px–899px        → 2 columns
 *   ≥ 900px            → 3 columns
 *   ≥ 1200px           → 4 columns
 *
 * Props:
 *   products  array  — ProductCard prop objects, each with a unique `id`
 *   empty     node   — optional empty-state element
 */
export default function ProductGrid({ products = [], empty }) {
  if (products.length === 0) {
    return (
      <div className="product-grid__empty">
        {empty || (
          <>
            <span aria-hidden="true">🥦</span>
            <p>אין מבצעים תואמים לסינון</p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="product-grid" role="list">
      {products.map((p) => (
        <div key={p.id} role="listitem">
          <ProductCard {...p} />
        </div>
      ))}
    </div>
  )
}
