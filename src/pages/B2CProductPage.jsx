import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import DealHeroImage from '../components/DealHeroImage/DealHeroImage'
import DealInfoSection from '../components/DealInfoSection/DealInfoSection'
import AddToCartBar from '../components/AddToCartBar/AddToCartBar'
import { findProductById, discountPct } from '../data/dummyProducts'
import './B2CPage.css'

/**
 * B2CProductPage — Single deal info screen with hero, details, sticky CTA.
 *
 * Route: /b2c/product/:id
 *
 * Reads `:id` via useParams(), looks the product up in the shared
 * dummyProducts catalogue, and renders DealHeroImage + DealInfoSection
 * with that product's data. If the id is unknown, a friendly fallback is
 * shown with a link back to the feed.
 */
export default function B2CProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = findProductById(id)

  if (!product) {
    return <NotFound id={id} />
  }

  return <ProductView product={product} onCheckout={() => navigate('/b2c/checkout')} />
}

/* ── Found-state view ────────────────────────────────────────── */
function ProductView({ product, onCheckout }) {
  const [qty, setQty]         = useState(1)
  const [saved, setSaved]     = useState(false)
  const [loading, setLoading] = useState(false)

  const pct = discountPct(product)

  async function handleAdd() {
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 800))
      onCheckout()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="b2c-page b2c-page--with-bar" dir="rtl">
      <NavbarB2C location="תל אביב" userName="דנה כהן" />

      <main className="b2c-page__main b2c-page__main--flush">
        <DealHeroImage
          image={product.image}
          discountPct={pct}
          timeLeftMin={product.timeLeft}
          saved={saved}
          onToggleSave={() => setSaved((s) => !s)}
          onShare={() => {
            navigator.share?.({ title: product.name }).catch(() => {})
          }}
        />

        <div className="b2c-page__inset">
          <DealInfoSection
            title={product.name}
            businessName={product.bakeryName}
            distanceKm={product.distance}
            rating={product.rating}
            reviewCount={product.reviewCount}
            originalPrice={product.originalPrice}
            price={product.discountPrice}
            discountPct={pct}
            description={product.description}
            tags={product.tags}
            pickupWindow={product.pickupWindow}
            address={product.address}
          />
        </div>
      </main>

      <AddToCartBar
        price={product.discountPrice}
        quantity={qty}
        maxQuantity={product.stock ?? 99}
        onQtyChange={setQty}
        onAdd={handleAdd}
        loading={loading}
      />
    </div>
  )
}

/* ── Fallback when no product matches the id in the URL ─────── */
function NotFound({ id }) {
  return (
    <div className="b2c-page" dir="rtl">
      <NavbarB2C location="תל אביב" userName="דנה כהן" />

      <main className="b2c-page__main">
        <div className="product-grid__empty" style={{ marginTop: 'var(--space-6)' }}>
          <span aria-hidden="true">🔎</span>
          <p>
            לא מצאנו מוצר עם המזהה <strong>{id}</strong>.
          </p>
          <Link
            to="/b2c/home"
            className="btn btn-primary"
            style={{ marginTop: 'var(--space-3)' }}
          >
            חזרה לפיד המבצעים
          </Link>
        </div>
      </main>
    </div>
  )
}
