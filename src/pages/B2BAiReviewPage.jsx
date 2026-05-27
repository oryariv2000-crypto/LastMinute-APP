import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import NavbarB2B from '../components/NavbarB2B/NavbarB2B'
import ReviewListSection from '../components/ReviewListSection/ReviewListSection'
import PublishActions from '../components/PublishActions/PublishActions'
import { createDeal } from '../lib/db'
import './B2BPage.css'

/**
 * B2BAiReviewPage — Review the AI-suggested deals, then publish them. On
 * publish each reviewed item is inserted into `deals` for the current
 * business (Step 16 create). The deal image uploaded on the previous screen
 * arrives via router state.
 *
 * Route: /b2b/review
 */
export default function B2BAiReviewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const uploadedImage = location.state?.imageUrl ?? null

  const [items, setItems]     = useState(INITIAL_ITEMS)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.suggestedPrice * it.quantity, 0),
    [items],
  )

  function setQty(id, qty) {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, quantity: qty } : it)))
  }

  function remove(id) {
    setItems(prev => prev.filter(it => it.id !== id))
  }

  async function handlePublish() {
    setLoading(true)
    setError('')
    try {
      // Insert every reviewed item as a deal for the current business.
      for (const it of items) {
        await createDeal({
          title: it.title,
          original_price: it.originalPrice,
          discounted_price: it.suggestedPrice,
          quantity: it.quantity,
          image_url: uploadedImage || it.image,
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
      <NavbarB2B businessName="הפינה של מיכל" isOpen notifCount={0} />

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
          onQtyChange={setQty}
          onRemove={remove}
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

/* ── Mock AI suggestions (the AI step itself is out of scope here) ───── */
const INITIAL_ITEMS = [
  {
    id: 'r1',
    title: 'בייגלה שומשום טרי',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    originalPrice: 18,
    suggestedPrice: 9,
    discountPct: 50,
    quantity: 6,
  },
  {
    id: 'r2',
    title: 'סלט קינואה וירקות',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop',
    originalPrice: 42,
    suggestedPrice: 25,
    discountPct: 40,
    quantity: 4,
  },
  {
    id: 'r3',
    title: 'מאפה גבינה בולגרית',
    image: 'https://images.unsplash.com/photo-1565299543923-37dd37887442?w=400&h=400&fit=crop',
    originalPrice: 28,
    suggestedPrice: 18,
    discountPct: 35,
    quantity: 3,
  },
  {
    id: 'r4',
    title: 'קרואסון שוקולד',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop',
    originalPrice: 14,
    suggestedPrice: 7,
    discountPct: 50,
    quantity: 5,
  },
]
