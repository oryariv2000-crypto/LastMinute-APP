import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import NavbarB2B from '../components/NavbarB2B/NavbarB2B'
import ReviewListSection from '../components/ReviewListSection/ReviewListSection'
import PublishActions from '../components/PublishActions/PublishActions'
import { createDeal, uploadDealImage } from '../lib/db'
import { useProfile } from '../lib/useProfile'
import { isBusinessOpen } from '../lib/businessHours'
import './B2BPage.css'

/**
 * B2BAiReviewPage — Review the AI Vision results, then publish them. The
 * scanned items arrive via router state as `scannedItems` (the schema produced
 * by aiVision.js / the text parser). Each row is editable; on publish every
 * item is inserted into `deals` for the current business via createDeal.
 *
 * Note: the master plan named a `products` table, but this project stores
 * deals in `deals` (createDeal resolves the owner's business_id) — so that's
 * the table we insert into here.
 *
 * Route: /b2b/review
 */
export default function B2BAiReviewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { business } = useProfile({ withBusiness: true })
  const uploadedImage = location.state?.imageUrl ?? null

  // Items detected by AI Vision (or the text parser); fall back to the mock
  // suggestions when the review screen is opened directly.
  const scanned = location.state?.scannedItems
  const [items, setItems]     = useState(
    scanned && scanned.length ? scanned.map(fromScanned) : INITIAL_ITEMS,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.suggestedPrice * it.quantity, 0),
    [items],
  )

  function setTitle(id, title) {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, title } : it)))
  }

  function setQty(id, qty) {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, quantity: qty } : it)))
  }

  function setPrice(id, field, value) {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, [field]: value } : it)))
  }

  function setImage(id, { url, file }) {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, image: url, imageFile: file } : it)))
  }

  function remove(id) {
    setItems(prev => prev.filter(it => it.id !== id))
  }

  function addItem() {
    const id = globalThis.crypto?.randomUUID?.() ?? `tmp-${Math.random().toString(36).slice(2)}`
    setItems(prev => [
      ...prev,
      { id, title: '', category: '', originalPrice: 0, suggestedPrice: 0, quantity: 1, image: null, imageFile: null },
    ])
  }

  function validate() {
    if (items.length === 0) return 'אין מוצרים לפרסום'
    for (const it of items) {
      if (!it.title || !it.title.trim())
        return 'לכל מוצר חייב להיות שם'
      if (!it.quantity || it.quantity < 1)
        return `יש להזין כמות של לפחות 1 עבור "${it.title}"`
      if (!it.suggestedPrice || it.suggestedPrice <= 0)
        return `יש להזין מחיר מבצע עבור "${it.title}"`
      if (it.originalPrice > 0 && it.originalPrice < it.suggestedPrice)
        return `מחיר המבצע של "${it.title}" גבוה מהמחיר הרגיל`
    }
    return null
  }

  async function handlePublish() {
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setLoading(true)
    setError('')
    try {
      // Insert every reviewed item as a deal for the current business. Each
      // deal keeps its own photo when the owner picked one on this screen.
      for (const it of items) {
        let imageUrl = it.image || uploadedImage
        if (it.imageFile) imageUrl = await uploadDealImage(it.imageFile)
        await createDeal({
          title: it.title.trim(),
          category: it.category || null,
          // With no separate regular price, treat the sale price as the
          // baseline so the deal stores a consistent (0%-discount) pair.
          original_price: it.originalPrice > 0 ? it.originalPrice : it.suggestedPrice,
          discount_price: it.suggestedPrice,
          quantity: it.quantity,
          image_url: imageUrl,
          status: 'active',
        })
      }
      navigate('/b2b/dashboard')
    } catch (err) {
      setError(err?.message || 'פרסום המבצעים נכשל')
      setLoading(false)
    }
  }

  return (
    <div className="b2b-page b2b-page--with-bar" dir="rtl">
      <NavbarB2B businessName={business?.name || 'העסק שלי'} avatarUrl={business?.logo_url} isOpen={isBusinessOpen(business)} notifCount={0} />

      <main className="b2b-page__main">
        <header className="b2b-page__greeting">
          <button
            type="button"
            className="b2b-page__back"
            onClick={() => navigate('/b2b/dashboard')}
            aria-label="חזרה לדף הבית"
          >
            <ChevronRightIcon /> חזרה
          </button>
          <h1 className="b2b-page__greeting-title">סקירת הצעות AI</h1>
          <p className="b2b-page__greeting-sub">
            וודא שהפרטים נכונים לפני פרסום הציבורי
          </p>
        </header>

        {error && (
          <p className="b2b-page__helper" role="alert" style={{ color: 'var(--color-error)' }}>
            {error}
          </p>
        )}

        <ReviewListSection
          items={items}
          onTitleChange={setTitle}
          onQtyChange={setQty}
          onPriceChange={setPrice}
          onImageChange={setImage}
          onRemove={remove}
          onAdd={addItem}
          suggestedTotal={total}
        />
      </main>

      <PublishActions
        itemCount={items.length}
        total={total}
        loading={loading}
        onCancel={() => navigate('/b2b/dashboard')}
        onPublish={handlePublish}
      />
    </div>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

/** Map an AI Vision / parser item (snake_case schema) to the internal shape. */
function fromScanned(it) {
  return {
    id: it.id || (globalThis.crypto?.randomUUID?.() ?? `tmp-${Math.random().toString(36).slice(2)}`),
    title: it.title || '',
    category: it.category || '',
    originalPrice: Number(it.original_price) || 0,
    suggestedPrice: Number(it.discount_price) || 0,
    quantity: Number(it.quantity) || 0,
    image: null,
    imageFile: null,
  }
}

/* ── Mock suggestions shown when the review screen is opened directly ──── */
const INITIAL_ITEMS = [
  {
    id: 'r1',
    title: 'בייגלה שומשום טרי',
    category: 'מאפים',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    originalPrice: 18,
    suggestedPrice: 9,
    discountPct: 50,
    quantity: 6,
  },
  {
    id: 'r2',
    title: 'סלט קינואה וירקות',
    category: 'סלטים',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop',
    originalPrice: 42,
    suggestedPrice: 25,
    discountPct: 40,
    quantity: 4,
  },
  {
    id: 'r3',
    title: 'מאפה גבינה בולגרית',
    category: 'מאפים',
    image: 'https://images.unsplash.com/photo-1565299543923-37dd37887442?w=400&h=400&fit=crop',
    originalPrice: 28,
    suggestedPrice: 18,
    discountPct: 35,
    quantity: 3,
  },
  {
    id: 'r4',
    title: 'קרואסון שוקולד',
    category: 'מאפים',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop',
    originalPrice: 14,
    suggestedPrice: 7,
    discountPct: 50,
    quantity: 5,
  },
]
