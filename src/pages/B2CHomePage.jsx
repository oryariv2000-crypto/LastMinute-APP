import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import BottomNavigationB2C from '../components/BottomNavigation/BottomNavigationB2C'
import CategoryFilters from '../components/CategoryFilters/CategoryFilters'
import ProductCard from '../components/ProductCard/ProductCard'
import './B2CPage.css'
import { dummyProducts, discountPct } from '../data/dummyProducts'

/**
 * B2CHomePage — Customer feed of last-minute deals, filterable by category
 * and searchable through the navbar.
 *
 * Route: /b2c/home
 */
const CATEGORIES = [
  { id: 'all',       label: 'הכל',     icon: '🌿' },
  { id: 'pastries',  label: 'מאפים',  icon: '🥐' },
  { id: 'salads',    label: 'סלטים',  icon: '🥗' },
  { id: 'mains',     label: 'מנות',   icon: '🍱' },
  { id: 'vegan',     label: 'טבעוני',  icon: '🌱' },
  { id: 'sweets',    label: 'מתוקים',  icon: '🍰' },
]

export default function B2CHomePage() {
  const [category, setCategory] = useState('all')
  const [query, setQuery]       = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return dummyProducts.filter((p) => {
      if (category !== 'all' && !(p.categories || []).includes(category)) return false
      if (q && !`${p.name} ${p.bakeryName}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [category, query])

  return (
    <div className="b2c-page" dir="rtl">
      <NavbarB2C location="תל אביב" userName="דנה כהן" onSearch={setQuery} />

      <main className="b2c-page__main">
        <header className="b2c-page__greeting">
          <h1 className="b2c-page__greeting-title">שלום דנה 👋</h1>
          <p className="b2c-page__greeting-sub">
            {filtered.length} מבצעים פעילים סביבך
          </p>
        </header>

        <CategoryFilters
          categories={CATEGORIES}
          value={category}
          onChange={setCategory}
        />

        {filtered.length === 0 ? (
          <div className="product-grid__empty">
            <span aria-hidden="true">🥦</span>
            <p>אין מבצעים תואמים לסינון</p>
          </div>
        ) : (
          <div className="product-grid" role="list">
            {filtered.map((product) => (
              <Link
                key={product.id}
                to={`/b2c/product/${product.id}`}
                className="product-grid__cell"
                role="listitem"
                aria-label={`${product.name} — ${product.bakeryName}`}
              >
                <ProductCard
                  asLink={false}
                  id={product.id}
                  image={product.image}
                  title={product.name}
                  businessName={product.bakeryName}
                  distanceKm={product.distance}
                  originalPrice={product.originalPrice}
                  price={product.discountPrice}
                  discountPct={discountPct(product)}
                  timeLeftMin={product.timeLeft}
                  tag={product.tags?.[0]}
                />
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNavigationB2C orderCount={2} />
    </div>
  )
}
