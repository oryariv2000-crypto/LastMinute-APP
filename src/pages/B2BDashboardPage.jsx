import { useEffect, useState } from 'react'
import NavbarB2B from '../components/NavbarB2B/NavbarB2B'
import BottomNavigationB2B from '../components/BottomNavigation/BottomNavigationB2B'
import DashboardSummary from '../components/DashboardSummary/DashboardSummary'
import NewDealButton from '../components/NewDealButton/NewDealButton'
import ActiveDealsSection from '../components/ActiveDealsSection/ActiveDealsSection'
import DealEditModal from '../components/DealEditModal/DealEditModal'
import Loader from '../components/Loader/Loader'
import { getMyDeals, updateDeal, deleteDeal, setDealStatus, discountPct } from '../lib/db'
import { useProfile } from '../lib/useProfile'
import { isBusinessOpen } from '../lib/businessHours'
import './B2BPage.css'

/**
 * B2BDashboardPage — Business owner home screen. Reads the signed-in
 * business's own deals from Supabase and supports edit / delete.
 *
 * Route: /b2b/dashboard
 */
export default function B2BDashboardPage() {
  const { profile, business } = useProfile({ withBusiness: true })

  const [deals, setDeals]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [editing, setEditing] = useState(null) // deal row being edited, or null

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const rows = await getMyDeals()
        if (active) setDeals(rows)
      } catch (err) {
        if (active) setError(err?.message || 'שגיאה בטעינת המבצעים')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  async function handleDelete(id) {
    if (!window.confirm('למחוק את המבצע לצמיתות? לא ניתן לשחזר.')) return
    try {
      await deleteDeal(id)
      setDeals((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      alert(err?.message || 'מחיקת המבצע נכשלה')
    }
  }

  async function handleToggleStatus(id) {
    const deal = deals.find((d) => d.id === id)
    if (!deal) return
    const next = deal.status === 'paused' ? 'active' : 'paused'
    try {
      const updated = await setDealStatus(id, next)
      setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    } catch (err) {
      alert(err?.message || 'עדכון סטטוס המבצע נכשל')
    }
  }

  async function handleSaveEdit(fields) {
    const updated = await updateDeal(editing.id, fields)
    setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    setEditing(null)
  }

  // Map DB rows → the props ActiveDealCard expects.
  const cards = deals.map((d) => ({
    id: d.id,
    title: d.title,
    image: d.image_url,
    originalPrice: d.original_price,
    price: d.discount_price,
    discountPct: discountPct(d.original_price, d.discount_price),
    quantity: d.quantity_left,
    timeLeftMin: 0,
    status: d.status,
  }))

  const businessName = business?.name || profile?.full_name || 'העסק שלי'
  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0]

  return (
    <div className="b2b-page" dir="rtl">
      <NavbarB2B businessName={businessName} avatarUrl={business?.logo_url} isOpen={isBusinessOpen(business)} notifCount={0} />

      <main className="b2b-page__main">
        <header className="b2b-page__greeting">
          <h1 className="b2b-page__greeting-title">
            שלום {firstName || ''} 👋
          </h1>
          <p className="b2b-page__greeting-sub">הנה המבצעים הפעילים שלך</p>
        </header>

        <DashboardSummary stats={buildStats(cards)} />

        <NewDealButton />

        {error ? (
          <div className="active-deals-section__empty" role="alert">
            <span aria-hidden="true">⚠️</span>
            <p>{error}</p>
          </div>
        ) : loading ? (
          <Loader label="טוען מבצעים…" />
        ) : (
          <ActiveDealsSection
            deals={cards}
            onEdit={(id) => setEditing(deals.find((d) => d.id === id))}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
          />
        )}
      </main>

      {editing && (
        <DealEditModal
          deal={editing}
          onSave={handleSaveEdit}
          onClose={() => setEditing(null)}
        />
      )}

      <BottomNavigationB2B notifCount={0} />
    </div>
  )
}

/* Derive the summary cards from live deals (no fake numbers).
   Paused deals aren't offered to customers, so they don't count toward the
   "active deals" / inventory / potential-revenue figures. */
function buildStats(cards) {
  const live = cards.filter((c) => c.status !== 'paused')
  const activeCount = live.length
  const unitsLeft = live.reduce((s, c) => s + (c.quantity || 0), 0)
  const potential = live.reduce((s, c) => s + (c.price || 0) * (c.quantity || 0), 0)
  return [
    { id: 'active', label: 'מבצעים פעילים', value: String(activeCount), accent: 'primary',
      icon: <Svg d="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /> },
    { id: 'units', label: 'יחידות במלאי', value: String(unitsLeft), accent: 'accent',
      icon: <Svg d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /> },
    { id: 'potential', label: 'הכנסה פוטנציאלית', value: `₪${potential.toLocaleString('he-IL')}`, accent: 'success',
      icon: <Svg d="M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /> },
  ]
}

function Svg({ d }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      {d.split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : `M${seg}`} />
      ))}
    </svg>
  )
}
