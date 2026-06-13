import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import BottomNavigationB2C from '../components/BottomNavigation/BottomNavigationB2C'
import ProductCard from '../components/ProductCard/ProductCard'
import Loader from '../components/Loader/Loader'
import {
  getBusinessById,
  getBusinessDeals,
  getBusinessReviews,
  upsertMyReview,
  summarizeReviews,
  hasOrderedFromBusiness,
  discountPct,
} from '../lib/db'
import { businessOpenState, todayKey } from '../lib/businessHours'
import { businessTypeLabel } from '../lib/businessTypes'
import { useProfile } from '../lib/useProfile'
import './B2CPage.css'
import './B2CBusinessPage.css'

/**
 * B2CBusinessPage — the customer-facing storefront for one business. Renders
 * the same data the owner edits in /b2b/profile (cover, logo, gallery, hours,
 * description) plus the shop's active deals and customer reviews. Open/closed
 * is derived live from opening_hours + closed_until (no stored flag) and ticks
 * every minute so it stays accurate while the screen is open.
 *
 * Route: /b2c/business/:id
 */
const DAYS = [
  { key: 'sun', label: 'ראשון' },
  { key: 'mon', label: 'שני' },
  { key: 'tue', label: 'שלישי' },
  { key: 'wed', label: 'רביעי' },
  { key: 'thu', label: 'חמישי' },
  { key: 'fri', label: 'שישי' },
  { key: 'sat', label: 'שבת' },
]

export default function B2CBusinessPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useProfile()

  const business = useQuery({
    queryKey: ['business', id],
    queryFn: () => getBusinessById(id),
    enabled: !!id,
  })
  const deals = useQuery({
    queryKey: ['business-deals', id],
    queryFn: () => getBusinessDeals(id),
    enabled: !!id,
  })
  const reviews = useQuery({
    queryKey: ['business-reviews', id],
    queryFn: () => getBusinessReviews(id),
    enabled: !!id,
  })
  // A customer may review only after a real order from this business.
  const canReview = useQuery({
    queryKey: ['can-review', id],
    queryFn: () => hasOrderedFromBusiness(id),
    enabled: !!id,
  })

  // Live clock for the open/closed banner — recompute every minute.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Gallery lightbox — holds the index of the open photo, or null when closed.
  const [lightbox, setLightbox] = useState(null)

  if (business.isLoading) return <Shell userName={profile?.full_name}><Loader label="טוען עסק…" /></Shell>
  if (business.isError || !business.data) {
    return (
      <Shell userName={profile?.full_name}>
        <div className="product-grid__empty" role="alert" style={{ marginTop: 'var(--space-6)' }}>
          <span aria-hidden="true">🔎</span>
          <p>לא מצאנו את העסק הזה.</p>
          <Link to="/b2c/explore" className="btn btn-primary" style={{ marginTop: 'var(--space-3)' }}>
            חזרה לגילוי עסקים
          </Link>
        </div>
      </Shell>
    )
  }

  const biz = business.data
  const status = businessOpenState(biz, now)
  const gallery = Array.isArray(biz.gallery) ? biz.gallery : []
  const { avg, count } = summarizeReviews(reviews.data || [])

  function openDirections() {
    if (!biz.address) return
    const q = encodeURIComponent(biz.address)
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, '_blank', 'noopener')
  }

  return (
    <div className="b2c-page" dir="rtl">
      <NavbarB2C userName={profile?.full_name || 'לקוח/ה'} showSearch={false} />

      <main className="b2c-page__main b2c-page__main--flush">
        {/* Hero: cover + logo + name + live status */}
        <header className="bizp-hero">
          <button type="button" className="bizp-hero__back" onClick={() => navigate(-1)} aria-label="חזרה">
            <ChevronIcon />
          </button>
          <div
            className="bizp-hero__cover"
            style={biz.cover_url ? { backgroundImage: `url(${biz.cover_url})` } : undefined}
            aria-hidden="true"
          />
          <div className="bizp-hero__body">
            <div className="bizp-hero__logo">
              {biz.logo_url ? <img src={biz.logo_url} alt="" /> : <span>{initials(biz.name)}</span>}
            </div>
            <div className="bizp-hero__text">
              <h1 className="bizp-hero__name">{biz.name}</h1>
              {biz.business_type && <span className="bizp-hero__chip">{businessTypeLabel(biz.business_type)}</span>}
              {biz.address && (
                <p className="bizp-hero__address"><PinIcon /> {biz.address}</p>
              )}
              <div className="bizp-hero__meta">
                <span className={`bizp-status${status.open ? '' : ' bizp-status--off'}`}>
                  <span className="bizp-status__dot" /> {status.label}
                </span>
                {status.hint && <span className="bizp-status__hint">{status.hint}</span>}
                {count > 0 && (
                  <span className="bizp-rating" aria-label={`דירוג ${avg.toFixed(1)} מתוך 5`}>
                    <StarIcon /> {avg.toFixed(1)} <span className="bizp-rating__count">· {count} ביקורות</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="b2c-page__inset bizp-sections">
          {/* Active deals — the storefront's products; each tile opens the
              product page where the customer can buy. Leads the page. */}
          <section className="bizp-section bizp-section--deals">
            <div className="bizp-section__head">
              <h2 className="bizp-section__title">מבצעים פעילים</h2>
              {!deals.isLoading && (deals.data || []).length > 0 && (
                <span className="bizp-section__count">{deals.data.length} מבצעים</span>
              )}
            </div>
            {deals.isLoading ? (
              <Loader label="טוען מבצעים…" />
            ) : (deals.data || []).length === 0 ? (
              <p className="bizp-section__text bizp-empty">אין מבצעים פעילים כרגע. כדאי לחזור מאוחר יותר 🌙</p>
            ) : (
              <div className="product-grid" role="list">
                {deals.data.map((d) => (
                  <Link
                    key={d.id}
                    to={`/b2c/product/${d.id}`}
                    className="product-grid__cell"
                    role="listitem"
                    aria-label={`${d.title} — ${biz.name}`}
                  >
                    <ProductCard
                      asLink={false}
                      id={d.id}
                      image={d.image_url}
                      title={d.title}
                      businessName={biz.name}
                      rating={avg}
                      originalPrice={d.original_price}
                      price={d.discount_price}
                      discountPct={discountPct(d.original_price, d.discount_price)}
                      quantityLeft={d.quantity_left}
                      tags={d.tags}
                    />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Gallery — tap a photo to open it full-screen */}
          {gallery.length > 0 && (
            <section className="bizp-section bizp-section--gallery">
              <h2 className="bizp-section__title">תמונות</h2>
              <div className="bizp-gallery" role="list">
                {gallery.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    className="bizp-gallery__item"
                    role="listitem"
                    onClick={() => setLightbox(i)}
                    aria-label={`הגדלת תמונה ${i + 1} מתוך ${gallery.length}`}
                  >
                    <img src={url} alt="" loading="lazy" />
                    <span className="bizp-gallery__zoom" aria-hidden="true"><ZoomIcon /></span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* About */}
          {biz.description && (
            <section className="bizp-section bizp-section--about">
              <h2 className="bizp-section__title">אודות</h2>
              <p className="bizp-section__text">{biz.description}</p>
            </section>
          )}

          {/* Weekly hours */}
          <section className="bizp-section bizp-section--hours">
            <h2 className="bizp-section__title">שעות פעילות</h2>
            <ul className="bizp-hours">
              {DAYS.map((d) => {
                const day = biz.opening_hours?.[d.key]
                const isToday = d.key === todayKey(now)
                return (
                  <li key={d.key} className={`bizp-hours__row${isToday ? ' bizp-hours__row--today' : ''}`}>
                    <span className="bizp-hours__day">
                      {d.label}{isToday && <span className="bizp-hours__today">היום</span>}
                    </span>
                    <span className="bizp-hours__time">
                      {!day || day.closed ? 'סגור' : `${day.open}–${day.close}`}
                    </span>
                  </li>
                )
              })}
            </ul>
            {biz.address && (
              <button type="button" className="btn btn-secondary bizp-directions" onClick={openDirections}>
                <PinIcon /> נווט לעסק
              </button>
            )}
          </section>

          {/* Reviews */}
          <ReviewsSection
            businessId={id}
            reviews={reviews.data || []}
            loading={reviews.isLoading}
            myUserId={profile?.id}
            canReview={!!canReview.data}
          />
        </div>
      </main>

      {lightbox !== null && gallery.length > 0 && (
        <Lightbox
          images={gallery}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onChange={setLightbox}
        />
      )}

      <BottomNavigationB2C />
    </div>
  )
}

/* ── Reviews block (list + write/edit own review) ─────────────── */
function ReviewsSection({ businessId, reviews, loading, myUserId, canReview }) {
  const qc = useQueryClient()
  const mine = reviews.find((r) => r.user_id === myUserId)
  const [rating, setRating] = useState(mine?.rating || 0)
  const [comment, setComment] = useState(mine?.comment || '')
  const [open, setOpen] = useState(false)
  // Show the write/edit CTA only to customers who ordered (or already reviewed).
  const mayReview = canReview || !!mine

  const mutation = useMutation({
    mutationFn: () => upsertMyReview({ business_id: businessId, rating, comment: comment.trim() || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-reviews', businessId] })
      setOpen(false)
    },
  })

  return (
    <section className="bizp-section bizp-section--reviews">
      <div className="bizp-reviews__head">
        <h2 className="bizp-section__title">ביקורות</h2>
        {mayReview && (
          <button type="button" className="bizp-reviews__cta" onClick={() => setOpen((v) => !v)}>
            {mine ? 'ערוך ביקורת' : 'כתוב ביקורת'}
          </button>
        )}
      </div>
      {!mayReview && (
        <p className="bizp-section__text bizp-empty">ניתן לכתוב ביקורת רק לאחר הזמנה מהעסק</p>
      )}

      {open && (
        <form
          className="bizp-review-form"
          onSubmit={(e) => { e.preventDefault(); if (rating) mutation.mutate() }}
        >
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            className="bizp-review-form__text"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="איך הייתה החוויה? (לא חובה)"
          />
          {mutation.isError && (
            <p className="bizp-review-form__error" role="alert">
              {mutation.error?.message || 'שמירת הביקורת נכשלה'}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={!rating || mutation.isPending}>
            {mutation.isPending ? 'שומר…' : 'פרסם'}
          </button>
        </form>
      )}

      {loading ? (
        <Loader label="טוען ביקורות…" />
      ) : reviews.length === 0 ? (
        <p className="bizp-section__text bizp-empty">עדיין אין ביקורות — היה הראשון לדרג 🌟</p>
      ) : (
        <ul className="bizp-reviews">
          {reviews.map((r) => (
            <li key={r.id} className="bizp-review">
              <div className="bizp-review__head">
                <span className="bizp-review__avatar">
                  {r.users?.avatar_url
                    ? <img src={r.users.avatar_url} alt="" />
                    : <span>{initials(r.users?.full_name || 'אורח')}</span>}
                </span>
                <div>
                  <p className="bizp-review__name">{r.users?.full_name || 'לקוח/ה'}</p>
                  <Stars value={r.rating} />
                </div>
                <time className="bizp-review__date">
                  {new Date(r.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                </time>
              </div>
              {r.comment && <p className="bizp-review__comment">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ── Gallery lightbox — full-screen viewer with prev/next ─────── */
function Lightbox({ images, index, onClose, onChange }) {
  const count = images.length
  const go = (delta) => onChange((index + delta + count) % count)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') go(1)   // RTL: left arrow advances
      else if (e.key === 'ArrowRight') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="bizp-lightbox" role="dialog" aria-modal="true" aria-label="גלריית תמונות" onClick={onClose}>
      <button type="button" className="bizp-lightbox__close" onClick={onClose} aria-label="סגירה">
        <CloseIcon />
      </button>

      <figure className="bizp-lightbox__stage" onClick={(e) => e.stopPropagation()}>
        <img className="bizp-lightbox__img" src={images[index]} alt={`תמונה ${index + 1} מתוך ${count}`} />
        {count > 1 && (
          <figcaption className="bizp-lightbox__count">{index + 1} / {count}</figcaption>
        )}
      </figure>

      {count > 1 && (
        <>
          <button
            type="button"
            className="bizp-lightbox__nav bizp-lightbox__nav--prev"
            onClick={(e) => { e.stopPropagation(); go(-1) }}
            aria-label="הקודם"
          >
            <ChevronIcon />
          </button>
          <button
            type="button"
            className="bizp-lightbox__nav bizp-lightbox__nav--next"
            onClick={(e) => { e.stopPropagation(); go(1) }}
            aria-label="הבא"
          >
            <ChevronIcon flip />
          </button>
        </>
      )}
    </div>
  )
}

/* ── Small presentational helpers ─────────────────────────────── */
function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function Stars({ value = 0 }) {
  return (
    <span className="bizp-stars" aria-label={`${value} מתוך 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= value} />
      ))}
    </span>
  )
}

function StarPicker({ value, onChange }) {
  return (
    <div className="bizp-star-picker" role="radiogroup" aria-label="דירוג">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="bizp-star-picker__btn"
          aria-label={`${n} כוכבים`}
          aria-checked={value === n}
          role="radio"
          onClick={() => onChange(n)}
        >
          <StarIcon filled={n <= value} />
        </button>
      ))}
    </div>
  )
}

function StarIcon({ filled = true }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="2" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  )
}
function ChevronIcon({ flip = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
function ZoomIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function Shell({ children, userName }) {
  return (
    <div className="b2c-page" dir="rtl">
      <NavbarB2C userName={userName || 'לקוח/ה'} showSearch={false} />
      <main className="b2c-page__main">{children}</main>
    </div>
  )
}
