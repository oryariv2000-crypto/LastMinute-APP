import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import BottomNavigationB2C from '../components/BottomNavigation/BottomNavigationB2C'
import CategoryFilters from '../components/CategoryFilters/CategoryFilters'
import ProductCard from '../components/ProductCard/ProductCard'
import Loader from '../components/Loader/Loader'
import { getActiveDeals, discountPct } from '../lib/db'
import { useProfile } from '../lib/useProfile'
import './B2CPage.css'

/**
 * B2CHomePage — Customer feed of last-minute deals, filterable by category
 * and searchable through the navbar. Reads live `deals` from Supabase.
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
  const { profile } = useProfile()
  const [category, setCategory] = useState('all')
  const [query, setQuery]       = useState('')

  const [deals, setDeals]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const rows = await getActiveDeals()
        if (active) setDeals(rows)
      } catch (err) {
        if (active) setError(err?.message || 'שגיאה בטעינת המבצעים')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return deals.filter((d) => {
      const shopName = d.businesses?.name ?? ''
      if (category !== 'all' && d.category !== category) return false
      if (q && !`${d.title} ${shopName}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [deals, category, query])

  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0]

  return (
    <div className="b2c-page" dir="rtl">
      <NavbarB2C
        location="תל אביב"
        userName={profile?.full_name || 'לקוח/ה'}
        onSearch={setQuery}
      />

      <main className="b2c-page__main">
        <header className="b2c-page__greeting">
          <h1 className="b2c-page__greeting-title">
            שלום {firstName || 'וברוכים הבאים'} 👋
          </h1>
          <p className="b2c-page__greeting-sub">
            {loading ? 'אוכל טרי במחיר מופחת, ממש לידך' : `${filtered.length} מבצעים פעילים סביבך`}
          </p>
        </header>

        <CategoryFilters
          categories={CATEGORIES}
          value={category}
          onChange={setCategory}
        />

        {error ? (
          <div className="product-grid__empty" role="alert">
            <span aria-hidden="true">⚠️</span>
            <p>{error}</p>
          </div>
        ) : loading ? (
          <Loader label="טוען מבצעים…" />
        ) : filtered.length === 0 ? (
          <div className="product-grid__empty">
            <span aria-hidden="true">🥦</span>
            <p>אין מבצעים תואמים לסינון</p>
          </div>
        ) : (
          <div className="product-grid" role="list">
            {filtered.map((deal) => (
              <Link
                key={deal.id}
                to={`/b2c/product/${deal.id}`}
                className="product-grid__cell"
                role="listitem"
                aria-label={`${deal.title} — ${deal.businesses?.name ?? ''}`}
              >
                <ProductCard
                  asLink={false}
                  id={deal.id}
                  image={deal.image_url}
                  title={deal.title}
                  businessName={deal.businesses?.name ?? ''}
                  originalPrice={deal.original_price}
                  price={deal.discount_price}
                  discountPct={discountPct(deal.original_price, deal.discount_price)}
                  tag={deal.category}
                />
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNavigationB2C orderCount={0} />
    </div>
  )
}
