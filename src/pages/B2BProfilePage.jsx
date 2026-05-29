import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavbarB2B from '../components/NavbarB2B/NavbarB2B'
import BottomNavigationB2B from '../components/BottomNavigation/BottomNavigationB2B'
import BusinessProfileHeader from '../components/BusinessProfileHeader/BusinessProfileHeader'
import BusinessSettingsList from '../components/BusinessSettingsList/BusinessSettingsList'
import StorefrontEditModal from '../components/StorefrontEditModal/StorefrontEditModal'
import Loader from '../components/Loader/Loader'
import { supabase } from '../lib/supabase'
import { updateMyProfile, updateMyBusiness, uploadDealImage } from '../lib/db'
import { useProfile } from '../lib/useProfile'
import { businessOpenState, manualCloseUntil, todayKey } from '../lib/businessHours'
import './B2BPage.css'
import './B2BProfilePage.css'

/**
 * B2BProfilePage — the owner's editable storefront. Every field is real and
 * persisted to Supabase: logo/cover, description, category, weekly hours,
 * gallery, open/closed status, and notification preferences. The same data is
 * what customers see, so editing here updates the customer-facing storefront.
 *
 * Route: /b2b/profile
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

export default function B2BProfilePage() {
  const navigate = useNavigate()
  const { profile, business, loading, setProfile, setBusiness } = useProfile({ withBusiness: true })
  const [editing, setEditing] = useState(false)
  const [galleryBusy, setGalleryBusy] = useState(false)
  const galleryUrls = Array.isArray(business?.gallery) ? business.gallery : []

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  /* Optimistically persist a partial business update; revert on failure. */
  async function patchBusiness(patch) {
    const prev = business
    setBusiness((b) => ({ ...b, ...patch }))
    try {
      const updated = await updateMyBusiness(patch)
      setBusiness(updated)
    } catch (err) {
      setBusiness(prev)
      alert(err?.message || 'העדכון נכשל')
    }
  }

  async function handleAddGalleryImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setGalleryBusy(true)
    try {
      const url = await uploadDealImage(file)
      await patchBusiness({ gallery: [...galleryUrls, url] })
    } catch (err) {
      alert(err?.message || 'העלאת התמונה נכשלה')
    } finally {
      setGalleryBusy(false)
    }
  }

  function handleRemoveGalleryImage(url) {
    patchBusiness({ gallery: galleryUrls.filter((u) => u !== url) })
  }

  if (loading) {
    return (
      <div className="b2b-page" dir="rtl">
        <NavbarB2B businessName={business?.name || 'העסק שלי'} avatarUrl={business?.logo_url} notifCount={0} />
        <main className="b2b-page__main"><Loader label="טוען פרופיל…" /></main>
        <BottomNavigationB2B notifCount={0} />
      </div>
    )
  }

  const status = businessOpenState(business)
  const isOpen = status.open

  /* Manual override: close now lasts until the end of today's window (then the
   * shop reopens automatically); reopen clears the override. Outside opening
   * hours there is no toggle — the schedule governs the status. */
  let toggleLabel = null
  let onToggleOpen
  if (status.status === 'open' || status.status === 'no_schedule_open') {
    toggleLabel = 'סגור עכשיו'
    onToggleOpen = () => patchBusiness({ closed_until: manualCloseUntil(business).toISOString() })
  } else if (status.status === 'manual_closed') {
    toggleLabel = 'פתח עכשיו'
    onToggleOpen = () => patchBusiness({ closed_until: null })
  }

  const prefGroup = {
    id: 'preferences',
    title: 'העדפות',
    items: [
      { id: 'push', icon: <BellIcon />, label: 'התראות פוש', type: 'toggle',
        checked: business?.notify_push ?? true, onChange: (v) => patchBusiness({ notify_push: v }) },
      { id: 'email', icon: <MailIcon />, label: 'התראות מייל', type: 'toggle',
        checked: business?.notify_email ?? false, onChange: (v) => patchBusiness({ notify_email: v }) },
    ],
  }

  const accountGroup = {
    id: 'account',
    title: 'חשבון',
    items: [
      { id: 'payments', icon: <CardIcon />, label: 'אמצעי תשלום', type: 'value', value: 'בקרוב', onClick: () => {} },
      { id: 'team', icon: <UsersIcon />, label: 'צוות והרשאות', type: 'value', value: 'בקרוב', onClick: () => {} },
      { id: 'support', icon: <HelpIcon />, label: 'עזרה ותמיכה', type: 'link',
        onClick: () => navigate('/support') },
      { id: 'logout', icon: <LogoutIcon />, label: 'התנתקות', type: 'link', danger: true, onClick: handleLogout },
    ],
  }

  return (
    <div className="b2b-page" dir="rtl">
      <NavbarB2B businessName={business?.name || 'העסק שלי'} avatarUrl={business?.logo_url} isOpen={isOpen} notifCount={0} />

      <main className="b2b-page__main">
        <BusinessProfileHeader
          businessName={business?.name || ''}
          ownerName={profile?.full_name || ''}
          address={business?.address || ''}
          coverUrl={business?.cover_url}
          logoUrl={business?.logo_url}
          isOpen={isOpen}
          statusLabel={status.label}
          statusHint={status.hint}
          toggleLabel={toggleLabel}
          rating={0}
          reviewCount={0}
          onEdit={() => setEditing(true)}
          onToggleOpen={onToggleOpen}
        />

        {/* About */}
        <section className="biz-section">
          <h3 className="biz-section__title">אודות</h3>
          {business?.description
            ? <p className="biz-section__text">{business.description}</p>
            : <button type="button" className="biz-section__empty" onClick={() => setEditing(true)}>
                ＋ הוסיפו תיאור קצר שיוצג ללקוחות
              </button>}
          {business?.business_type && (
            <span className="biz-section__chip">{business.business_type}</span>
          )}
        </section>

        {/* Weekly hours */}
        <section className="biz-section">
          <h3 className="biz-section__title">שעות פעילות</h3>
          <ul className="biz-hours">
            {DAYS.map((d) => {
              const day = business?.opening_hours?.[d.key]
              const isToday = d.key === todayKey()
              return (
                <li key={d.key} className={`biz-hours__row${isToday ? ' biz-hours__row--today' : ''}`}>
                  <span className="biz-hours__day">
                    {d.label}{isToday && <span className="biz-hours__today-tag">היום</span>}
                  </span>
                  <span className="biz-hours__time">
                    {!day || day.closed ? 'סגור' : `${day.open}–${day.close}`}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Gallery */}
        <section className="biz-section">
          <h3 className="biz-section__title">גלריית תמונות</h3>
          <div className="biz-gallery">
            {galleryUrls.map((url) => (
              <div key={url} className="biz-gallery__item">
                <img src={url} alt="" />
                <button
                  type="button"
                  className="biz-gallery__remove"
                  aria-label="הסר תמונה"
                  onClick={() => handleRemoveGalleryImage(url)}
                >×</button>
              </div>
            ))}
            <label className="biz-gallery__add">
              {galleryBusy ? '…' : '＋'}
              <input type="file" accept="image/*" hidden disabled={galleryBusy} onChange={handleAddGalleryImage} />
            </label>
          </div>
        </section>

        <BusinessSettingsList groups={[prefGroup, accountGroup]} />
      </main>

      {editing && (
        <StorefrontEditModal
          initial={{
            name: business?.name,
            full_name: profile?.full_name,
            address: business?.address,
            phone: business?.phone,
            business_type: business?.business_type,
            description: business?.description,
            logo_url: business?.logo_url,
            cover_url: business?.cover_url,
            opening_hours: business?.opening_hours,
          }}
          onSave={async ({ full_name, ...bizFields }) => {
            const [updatedProfile, updatedBiz] = await Promise.all([
              updateMyProfile({ full_name }),
              updateMyBusiness(bizFields),
            ])
            setProfile(updatedProfile)
            setBusiness(updatedBiz)
            setEditing(false)
          }}
          onClose={() => setEditing(false)}
        />
      )}

      <BottomNavigationB2B notifCount={0} />
    </div>
  )
}

/* ── Icons ────────────────────────────────────────────────────── */
function BellIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>)
}
function MailIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2 4 12 13 22 4"/></svg>)
}
function CardIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>)
}
function UsersIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>)
}
function HelpIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>)
}
function LogoutIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>)
}
