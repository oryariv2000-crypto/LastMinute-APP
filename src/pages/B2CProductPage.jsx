import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import DealHeroImage from '../components/DealHeroImage/DealHeroImage'
import DealInfoSection from '../components/DealInfoSection/DealInfoSection'
import AddToCartBar from '../components/AddToCartBar/AddToCartBar'
import ProductCard from '../components/ProductCard/ProductCard'
import Loader from '../components/Loader/Loader'
import { getDealById, getBusinessDeals, discountPct, isDealSaved, setDealSaved } from '../lib/db'
import { resolveTags, resolveTagsInGroup } from '../lib/productTags'
import { businessTypeLabel } from '../lib/businessTypes'
import { useProfile } from '../lib/useProfile'
import './B2CPage.css'
import './B2CProductPage.css'

/**
 * B2CProductPage — Single deal screen. Responsive: on mobile the photo is a
 * full-bleed hero with a sticky "add to cart" bar at the bottom; on desktop it
 * becomes a balanced two-column layout — contained photo on one side, info +
 * inline purchase panel on the other. On "add" it carries the deal + chosen
 * quantity to checkout via router state.
 *
 * Route: /b2c/product/:id
 */
export default function B2CProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useProfile()
  const userName = profile?.full_name || 'לקוח/ה'

  const { data: deal, isLoading, isError, error } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => getDealById(id),
    enabled: !!id,
  })

  if (isLoading) return <Shell userName={userName}><Loader label="טוען מבצע…" /></Shell>
  if (isError)   return <Shell userName={userName}><div className="product-grid__empty" role="alert"><span>⚠️</span><p>{error?.message || 'שגיאה בטעינת המבצע'}</p></div></Shell>
  if (!deal)     return <NotFound id={id} userName={userName} />

  return (
    <ProductView
      deal={deal}
      userName={userName}
      onCheckout={(quantity) =>
        navigate('/b2c/checkout', { state: { dealId: deal.id, quantity } })
      }
      onOpenStore={() => deal.business_id && navigate(`/b2c/business/${deal.business_id}`)}
    />
  )
}

/* ── Found-state view ────────────────────────────────────────── */
function ProductView({ deal, userName, onCheckout, onOpenStore }) {
  const [qty, setQty]         = useState(1)
  const [loading, setLoading] = useState(false)

  // Favorite state lives in saved_deals (server). Optimistic toggle for snappiness.
  const queryClient = useQueryClient()
  const savedKey = ['deal-saved', deal.id]
  const { data: saved = false } = useQuery({
    queryKey: savedKey,
    queryFn: () => isDealSaved(deal.id),
  })
  const toggleSave = useMutation({
    mutationFn: () => setDealSaved(deal.id, !saved),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: savedKey })
      const prev = queryClient.getQueryData(savedKey)
      queryClient.setQueryData(savedKey, !prev)
      return { prev }
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(savedKey, ctx?.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: savedKey }),
  })

  // Other active deals from the same shop ("more from this business").
  const related = useQuery({
    queryKey: ['business-deals', deal.business_id],
    queryFn: () => getBusinessDeals(deal.business_id),
    enabled: !!deal.business_id,
  })
  const relatedDeals = (related.data || []).filter((d) => d.id !== deal.id).slice(0, 8)

  const pct = discountPct(deal.original_price, deal.discount_price)
  const shopRating = deal.businesses?.rating > 0 ? deal.businesses.rating : undefined
  const maxQty = deal.quantity_left ?? 99
  const lowStock = deal.quantity_left != null && deal.quantity_left > 0 && deal.quantity_left <= 5

  // Chips beneath the title = the business type + dietary/state tags;
  // allergens are surfaced separately as a "contains" warning block.
  const charTags = resolveTags(deal.tags).filter((t) => t.group !== 'allergen')
  const typeLabel = businessTypeLabel(deal.businesses?.business_type)
  const infoTags = [
    ...(typeLabel ? [typeLabel] : []),
    ...charTags.map((t) => `${t.icon} ${t.label}`),
  ]
  const allergens = resolveTagsInGroup(deal.tags, 'allergen').map((a) => a.label)

  async function handleAdd() {
    setLoading(true)
    try {
      onCheckout(qty)
    } finally {
      setLoading(false)
    }
  }

  const buyProps = {
    price: deal.discount_price,
    quantity: qty,
    maxQuantity: maxQty,
    onQtyChange: setQty,
    onAdd: handleAdd,
    loading,
  }

  return (
    <div className="b2c-page b2c-page--with-bar" dir="rtl">
      <NavbarB2C userName={userName} showSearch={false} />

      <main className="b2c-page__main b2c-page__main--flush">
        <div className="b2c-product__layout">
          <div className="b2c-product__media">
            <DealHeroImage
              image={deal.image_url}
              discountPct={pct}
              saved={saved}
              onToggleSave={() => toggleSave.mutate()}
              onShare={() => { navigator.share?.({ title: deal.title }).catch(() => {}) }}
            />
          </div>

          <div className="b2c-product__info">
            <DealInfoSection
              title={deal.title}
              businessName={deal.businesses?.name}
              rating={shopRating}
              originalPrice={deal.original_price}
              price={deal.discount_price}
              discountPct={pct}
              description={deal.description}
              tags={infoTags}
              allergens={allergens}
              pickupWindow={deal.pickup_start ? new Date(deal.pickup_start).toLocaleString('he-IL') : ''}
              address={deal.businesses?.address}
              onOpenStore={onOpenStore}
            />

            {lowStock && (
              <p className="b2c-product__lowstock" role="status">
                🔥 נשארו רק {deal.quantity_left} — כדאי למהר
              </p>
            )}

            {/* Desktop: inline purchase panel inside the info column */}
            <AddToCartBar {...buyProps} variant="inline" className="b2c-product__buy--desktop" />

            {/* Click & Collect reassurance — sets expectations + fills the column */}
            <ul className="b2c-product__trust" aria-label="איך זה עובד">
              <li><span aria-hidden="true">🏪</span> איסוף עצמי מהסניף — ללא משלוח</li>
              <li><span aria-hidden="true">📱</span> קוד QR להצגה בקופה מופק עם ההזמנה</li>
              <li><span aria-hidden="true">↩️</span> ניתן לבטל עד שחלון האיסוף מתחיל</li>
              <li><span aria-hidden="true">🌿</span> כל הזמנה מצילה מזון טרי מבזבוז</li>
            </ul>
          </div>
        </div>

        {/* More active deals from the same shop */}
        {relatedDeals.length > 0 && (
          <section className="b2c-product__more b2c-page__inset">
            <h2 className="b2c-product__more-title">עוד מ{deal.businesses?.name || 'העסק'}</h2>
            <div className="product-grid" role="list">
              {relatedDeals.map((d) => (
                <Link
                  key={d.id}
                  to={`/b2c/product/${d.id}`}
                  className="product-grid__cell"
                  role="listitem"
                  aria-label={d.title}
                >
                  <ProductCard
                    asLink={false}
                    id={d.id}
                    image={d.image_url}
                    title={d.title}
                    businessName={deal.businesses?.name}
                    originalPrice={d.original_price}
                    price={d.discount_price}
                    discountPct={discountPct(d.original_price, d.discount_price)}
                    quantityLeft={d.quantity_left}
                    tags={d.tags}
                  />
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Mobile: sticky bottom bar (kept as a direct page child for stickiness) */}
      <AddToCartBar {...buyProps} variant="sticky" className="b2c-product__buy--mobile" />
    </div>
  )
}

/* ── Layout shell used for loading / error states ───────────── */
function Shell({ children, userName }) {
  return (
    <div className="b2c-page" dir="rtl">
      <NavbarB2C userName={userName} showSearch={false} />
      <main className="b2c-page__main">{children}</main>
    </div>
  )
}

/* ── Fallback when no deal matches the id in the URL ─────────── */
function NotFound({ id, userName }) {
  return (
    <Shell userName={userName}>
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
