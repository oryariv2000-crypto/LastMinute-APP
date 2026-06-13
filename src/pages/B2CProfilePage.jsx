import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import BottomNavigationB2C from '../components/BottomNavigation/BottomNavigationB2C'
import UserProfileHeader from '../components/UserProfileHeader/UserProfileHeader'
import EcoImpactStats from '../components/EcoImpactStats/EcoImpactStats'
import SettingsList from '../components/SettingsList/SettingsList'
import ProfileEditModal from '../components/ProfileEditModal/ProfileEditModal'
import PickerModal from '../components/PickerModal/PickerModal'
import LocationPickerModal from '../components/LocationPickerModal/LocationPickerModal'
import AddressBookModal from '../components/AddressBookModal/AddressBookModal'
import DevelopmentNotice from '../components/DevelopmentNotice/DevelopmentNotice'
import { supabase } from '../lib/supabase'
import { updateMyProfile, getMyImpactStats } from '../lib/db'
import { useProfile } from '../lib/useProfile'
import { usePreferences } from '../lib/usePreferences'
import './B2CPage.css'
import './B2CProfilePage.css'

/**
 * B2CProfilePage — Customer profile, impact, and settings. Name/phone/avatar
 * are read from + saved to Supabase. The preference rows (language, location,
 * search radius, notifications, saved addresses) are frontend-only for now,
 * persisted via usePreferences (localStorage) — the backend wiring comes later.
 *
 * Route: /b2c/profile
 */
const LANGUAGES = [
  { value: 'he', label: 'עברית' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
]
const RADII = [1, 3, 5, 10, 20].map((k) => ({ value: k, label: `עד ${k} ק״מ`, hint: 'מציג מבצעים במרחק הזה ממך' }))

export default function B2CProfilePage() {
  const navigate = useNavigate()
  const { profile, setProfile } = useProfile()
  const { prefs, setPref, setPrefs } = usePreferences()
  const [editing, setEditing] = useState(false)
  const [sheet, setSheet]     = useState(null)   // 'language' | 'city' | 'radius' | 'addresses'
  const [notice, setNotice]   = useState('')

  // Real impact totals (orders + money exact; kg/CO₂ estimated). See db.js.
  const { data: impact } = useQuery({ queryKey: ['my-impact'], queryFn: getMyImpactStats })

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  function flash(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(''), 2600)
  }

  const languageLabel = LANGUAGES.find((l) => l.value === prefs.language)?.label ?? 'עברית'

  const groups = [
    {
      id: 'preferences',
      title: 'העדפות',
      items: [
        { id: 'language', icon: <GlobeIcon />, label: 'שפה',           type: 'value', value: languageLabel,           onClick: () => setSheet('language') },
        { id: 'location', icon: <PinIcon />,   label: 'מיקום',         type: 'value', value: prefs.city,              onClick: () => setSheet('city') },
        { id: 'distance', icon: <RulerIcon />, label: 'טווח חיפוש',   type: 'value', value: `עד ${prefs.radiusKm} ק״מ`, onClick: () => setSheet('radius') },
        { id: 'vegan',    icon: <LeafIcon />,  label: 'הצג רק טבעוני', type: 'toggle', checked: prefs.veganOnly, onChange: (v) => setPref('veganOnly', v) },
      ],
    },
    {
      id: 'notifications',
      title: 'התראות',
      items: [
        { id: 'push',  icon: <BellIcon />, label: 'התראות פוש',    type: 'toggle', checked: prefs.pushNotifs, onChange: (v) => setPref('pushNotifs', v) },
        { id: 'email', icon: <MailIcon />, label: 'מבצעים במייל', type: 'toggle', checked: prefs.emailDeals, onChange: (v) => setPref('emailDeals', v) },
      ],
    },
    {
      id: 'account',
      title: 'חשבון',
      items: [
        { id: 'orders',   icon: <BagIcon />,    label: 'ההזמנות שלי',   type: 'link',  onClick: () => navigate('/b2c/orders') },
        { id: 'addresses',icon: <PinIcon />,    label: 'כתובות שמורות', type: 'value', value: prefs.addresses.length ? `${prefs.addresses.length}` : 'הוסף/י', onClick: () => setSheet('addresses') },
        { id: 'payments', icon: <CardIcon />,   label: 'אמצעי תשלום',   type: 'value', value: <DevelopmentNotice variant="badge" label="בקרוב" />, onClick: () => flash('אמצעי תשלום יתווספו בקרוב 💳') },
        { id: 'support',  icon: <HelpIcon />,   label: 'עזרה ותמיכה',  type: 'link',  onClick: () => navigate('/support') },
        { id: 'about',    icon: <InfoIcon />,   label: 'אודות',         type: 'value', value: 'גרסה 1.0.0', onClick: () => flash('רגע אחרון — גרסה 1.0.0 🌿') },
        { id: 'logout',   icon: <LogoutIcon />, label: 'התנתקות',      type: 'link',  danger: true, onClick: handleLogout },
      ],
    },
  ]

  return (
    <div className="b2c-page" dir="rtl">
      <NavbarB2C userName={profile?.full_name || 'לקוח/ה'} showSearch={false} />

      <main className="b2c-page__main b2c-profile">
        {notice && <div className="b2c-profile__notice" role="status">{notice}</div>}

        <UserProfileHeader
          name={profile?.full_name || ''}
          email={profile?.email || ''}
          phone={profile?.phone || ''}
          avatarUrl={profile?.avatar_url}
          memberSince={profile?.created_at
            ? new Date(profile.created_at).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
            : ''}
          onEdit={() => setEditing(true)}
        />

        <EcoImpactStats
          savedKg={impact?.savedKg ?? 0}
          moneySaved={impact?.moneySaved ?? 0}
          co2Kg={impact?.co2Kg ?? 0}
          ordersCount={impact?.ordersCount ?? 0}
        />

        <SettingsList groups={groups} />
      </main>

      {/* ── Preference sheets ─────────────────────────────────── */}
      {sheet === 'language' && (
        <PickerModal
          title="שפת ממשק"
          options={LANGUAGES}
          value={prefs.language}
          onSelect={(v) => setPref('language', v)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'city' && (
        <LocationPickerModal
          value={prefs.city}
          onSelect={(city, region) => setPrefs((p) => ({ ...p, city, region }))}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'radius' && (
        <PickerModal
          title="טווח חיפוש"
          options={RADII}
          value={prefs.radiusKm}
          onSelect={(v) => setPref('radiusKm', v)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'addresses' && (
        <AddressBookModal
          addresses={prefs.addresses}
          onSave={(list) => setPrefs((p) => ({ ...p, addresses: list }))}
          onClose={() => setSheet(null)}
        />
      )}

      {editing && (
        <ProfileEditModal
          title="עריכת פרופיל"
          fields={[
            { name: 'full_name', label: 'שם מלא' },
            { name: 'phone', label: 'טלפון', type: 'tel' },
          ]}
          initial={{ full_name: profile?.full_name, phone: profile?.phone }}
          avatarUrl={profile?.avatar_url}
          onAvatarChange={(url) => setProfile((p) => ({ ...p, avatar_url: url }))}
          onSave={async (values) => {
            const updated = await updateMyProfile(values)
            setProfile(updated)
            setEditing(false)
          }}
          onClose={() => setEditing(false)}
        />
      )}

      <BottomNavigationB2C />
    </div>
  )
}

/* ── Inline icons ─────────────────────────────────────────────── */
function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  )
}
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
  )
}
function RulerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="9" width="20" height="6" rx="1"/><line x1="6" y1="9" x2="6" y2="13"/><line x1="10" y1="9" x2="10" y2="13"/><line x1="14" y1="9" x2="14" y2="13"/><line x1="18" y1="9" x2="18" y2="13"/></svg>
  )
}
function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 4 13c0-7 7-12 16-12 0 9-5 16-12 16z"/><line x1="4" y1="22" x2="14" y2="12"/></svg>
  )
}
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  )
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2 4 12 13 22 4"/></svg>
  )
}
function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
  )
}
function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
  )
}
function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  )
}
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
  )
}
function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  )
}
