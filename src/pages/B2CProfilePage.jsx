import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import BottomNavigationB2C from '../components/BottomNavigation/BottomNavigationB2C'
import UserProfileHeader from '../components/UserProfileHeader/UserProfileHeader'
import EcoImpactStats from '../components/EcoImpactStats/EcoImpactStats'
import SettingsList from '../components/SettingsList/SettingsList'
import ProfileEditModal from '../components/ProfileEditModal/ProfileEditModal'
import { supabase } from '../lib/supabase'
import { updateMyProfile } from '../lib/db'
import { useProfile } from '../lib/useProfile'
import './B2CPage.css'

/**
 * B2CProfilePage — Customer profile + impact + settings. Reads the profile
 * from Supabase and supports editing it + uploading an avatar.
 *
 * Route: /b2c/profile
 */
export default function B2CProfilePage() {
  const navigate = useNavigate()
  const { profile, setProfile } = useProfile()
  const [editing, setEditing] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const [pushNotifs, setPushNotifs]  = useState(true)
  const [emailDeals, setEmailDeals]  = useState(true)
  const [veganOnly,  setVeganOnly]   = useState(false)

  const groups = [
    {
      id: 'preferences',
      title: 'העדפות',
      items: [
        { id: 'language',  icon: <GlobeIcon />,    label: 'שפה',           type: 'value', value: 'עברית', onClick: () => {} },
        { id: 'location',  icon: <PinIcon />,      label: 'מיקום',         type: 'value', value: 'תל אביב', onClick: () => {} },
        { id: 'distance',  icon: <RulerIcon />,    label: 'טווח חיפוש',   type: 'value', value: '5 ק״מ', onClick: () => {} },
        { id: 'vegan',     icon: <LeafIcon />,     label: 'הצג רק טבעוני', type: 'toggle', checked: veganOnly, onChange: setVeganOnly },
      ],
    },
    {
      id: 'notifications',
      title: 'התראות',
      items: [
        { id: 'push',   icon: <BellIcon />, label: 'התראות פוש',     type: 'toggle', checked: pushNotifs, onChange: setPushNotifs },
        { id: 'email',  icon: <MailIcon />, label: 'מבצעים במייל',  type: 'toggle', checked: emailDeals, onChange: setEmailDeals },
      ],
    },
    {
      id: 'account',
      title: 'חשבון',
      items: [
        { id: 'payments', icon: <CardIcon />,    label: 'אמצעי תשלום',   type: 'link', onClick: () => {} },
        { id: 'addresses',icon: <PinIcon />,     label: 'כתובות שמורות', type: 'link', onClick: () => {} },
        { id: 'support',  icon: <HelpIcon />,    label: 'עזרה ותמיכה',  type: 'link', onClick: () => navigate('/support') },
        { id: 'about',    icon: <InfoIcon />,    label: 'אודות',         type: 'value', value: 'גרסה 1.0.0', onClick: () => {} },
        { id: 'logout',   icon: <LogoutIcon />,  label: 'התנתקות',      type: 'link', danger: true, onClick: handleLogout },
      ],
    },
  ]

  return (
    <div className="b2c-page" dir="rtl">
      <NavbarB2C location="תל אביב" userName={profile?.full_name || 'לקוח/ה'} />

      <main className="b2c-page__main">
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
          savedKg={4.2}
          moneySaved={186}
          co2Kg={11.5}
          ordersCount={12}
        />

        <SettingsList groups={groups} />
      </main>

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

      <BottomNavigationB2C orderCount={0} />
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
