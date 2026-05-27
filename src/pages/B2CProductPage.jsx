import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import DealHeroImage from '../components/DealHeroImage/DealHeroImage'
import DealInfoSection from '../components/DealInfoSection/DealInfoSection'
import AddToCartBar from '../components/AddToCartBar/AddToCartBar'
import Loader from '../components/Loader/Loader'
import { getDealById, discountPct } from '../lib/db'
import './B2CPage.css'

/**
 * B2CProductPage — Single deal info screen. Fetches the deal from Supabase by
 * :id and, on "add to cart", carries the deal + chosen quantity to checkout
 * via router state.
 *
 * Route: /b2c/product/:id
 */
export default function B2CProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [deal, setDeal]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const row = await getDealById(id)
        if (active) setDeal(row)
      } catch (err) {
        if (active) setError(err?.message || 'שגיאה בטעינת המבצע')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [id])

  if (loading) return <Shell><Loader label="טוען מבצע…" /></Shell>
  if (error)   return <Shell><div className="product-grid__empty" role="alert"><span>⚠️</span><p>{error}</p></div></Shell>
  if (!deal)   return <NotFound id={id} />

  return (
    <ProductView
      deal={deal}
      onCheckout={(quantity) =>
        navigate('/b2c/checkout', { state: { dealId: deal.id, quantity } })
      }
    />
  )
}

/* ── Found-state view ────────────────────────────────────────── */
function ProductView({ deal, onCheckout }) {
  const [qty, setQty]         = useState(1)
  const [saved, setSaved]     = useState(false)
  const [loading, setLoading] = useState(false)

  const pct = discountPct(deal.original_price, deal.discounted_price)

  async function handleAdd() {
    setLoading(true)
    try {
      onCheckout(qty)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="b2c-page b2c-page--with-bar" dir="rtl">
      <NavbarB2C location="תל אביב" userName="דנה כהן" />

      <main className="b2c-page__main b2c-page__main--flush">
        <DealHeroImage
          image={deal.image_url}
          discountPct={pct}
          saved={saved}
          onToggleSave={() => setSaved((s) => !s)}
          onShare={() => { navigator.share?.({ title: deal.title }).catch(() => {}) }}
        />

        <div className="b2c-page__inset">
          <DealInfoSection
            title={deal.title}
            businessName={deal.businesses?.name}
            rating={0}
            reviewCount={0}
            originalPrice={deal.original_price}
            price={deal.discounted_price}
            discountPct={pct}
            description={deal.description}
            tags={deal.category ? [deal.category] : []}
            pickupWindow={deal.pickup_start ? new Date(deal.pickup_start).toLocaleString('he-IL') : ''}
            address={deal.businesses?.address}
          />
        </div>
      </main>

      <AddToCartBar
        price={deal.discounted_price}
        quantity={qty}
        maxQuantity={deal.quantity_left ?? 99}
        onQtyChange={setQty}
        onAdd={handleAdd}
        loading={loading}
      />
    </div>
  )
}

/* ── Layout shell used for loading / error states ───────────── */
function Shell({ children }) {
  return (
    <div className="b2c-page" dir="rtl">
      <NavbarB2C location="תל אביב" userName="דנה כהן" />
      <main className="b2c-page__main">{children}</main>
    </div>
  )
}

/* ── Fallback when no deal matches the id in the URL ─────────── */
function NotFound({ id }) {
  return (
    <Shell>
      <div className="product-grid__empty" style={{ marginTop: 'var(--space-6)' }}>
        <span aria-hidden="true">🔎</span>
        <p>לא מצאנו מבצע עם המזהה <strong>{id}</strong>.</p>
        <Link to="/b2c/home" className="btn btn-primary" style={{ marginTop: 'var(--space-3)' }}>
          חזרה לפיד המבצעים
        </Link>
      </div>
    </Shell>
  )
}
