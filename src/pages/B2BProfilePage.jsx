import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavbarB2B from '../components/NavbarB2B/NavbarB2B'
import BottomNavigationB2B from '../components/BottomNavigation/BottomNavigationB2B'
import BusinessProfileHeader from '../components/BusinessProfileHeader/BusinessProfileHeader'
import BusinessSettingsList from '../components/BusinessSettingsList/BusinessSettingsList'
import './B2BPage.css'

/**
 * B2BProfilePage — Business profile + settings.
 *
 * Route: /b2b/profile
 */
export default function B2BProfilePage() {
  const navigate = useNavigate()

  const [isOpen, setIsOpen]               = useState(true)
  const [autoPublish, setAutoPublish]     = useState(false)
  const [pushNotifs, setPushNotifs]       = useState(true)
  const [emailNotifs, setEmailNotifs]     = useState(false)

  const groups = [
    {
      id: 'business',
      title: 'העסק',
      items: [
        { id: 'hours', icon: <ClockIcon />, label: 'שעות פעילות', type: 'value', value: 'א׳-ה׳ 08:00-19:00', onClick: () => {} },
        { id: 'address', icon: <PinIcon />, label: 'כתובת', type: 'value', value: 'דיזנגוף 50', onClick: () => {} },
        { id: 'category', icon: <StoreIcon />, label: 'קטגוריה', type: 'value', value: 'בית קפה', onClick: () => {} },
        { id: 'photos', icon: <ImageIcon />, label: 'תמונות וגלריה', type: 'link', onClick: () => {} },
      ],
    },
    {
      id: 'preferences',
      title: 'העדפות',
      items: [
        { id: 'auto-publish', icon: <SparkleIcon />, label: 'פרסום אוטומטי של מבצעים', type: 'toggle', checked: autoPublish, onChange: setAutoPublish },
        { id: 'push', icon: <BellIcon />, label: 'התראות פוש', type: 'toggle', checked: pushNotifs, onChange: setPushNotifs },
        { id: 'email', icon: <MailIcon />, label: 'התראות מייל', type: 'toggle', checked: emailNotifs, onChange: setEmailNotifs },
      ],
    },
    {
      id: 'account',
      title: 'חשבון',
      items: [
        { id: 'payments', icon: <CardIcon />, label: 'אמצעי תשלום', type: 'link', onClick: () => {} },
        { id: 'team', icon: <UsersIcon />, label: 'צוות והרשאות', type: 'link', onClick: () => {} },
        { id: 'support', icon: <HelpIcon />, label: 'עזרה ותמיכה', type: 'link', onClick: () => {} },
        { id: 'logout', icon: <LogoutIcon />, label: 'התנתקות', type: 'link', danger: true, onClick: () => navigate('/login') },
      ],
    },
  ]

  return (
    <div className="b2b-page" dir="rtl">
      <NavbarB2B businessName="הפינה של מיכל" isOpen={isOpen} notifCount={3} />

      <main className="b2b-page__main">
        <BusinessProfileHeader
          businessName="הפינה של מיכל"
          ownerName="מיכל כהן"
          address="דיזנגוף 50, תל אביב"
          isOpen={isOpen}
          rating={4.8}
          reviewCount={147}
          onEdit={() => {}}
          onToggleOpen={() => setIsOpen(o => !o)}
        />

        <BusinessSettingsList groups={groups} />
      </main>

      <BottomNavigationB2B notifCount={2} />
    </div>
  )
}

/* ── Icons (kept inline to avoid an icon-library dep) ─────────── */
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  )
}
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
  )
}
function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1-6h16l1 6"/><path d="M3 9a2 2 0 1 0 4 0 2 2 0 1 0 4 0 2 2 0 1 0 4 0 2 2 0 1 0 4 0"/><path d="M5 9v12h14V9"/></svg>
  )
}
function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  )
}
function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.4L19 10l-5.1 1.6L12 17l-1.9-5.4L5 10l5.1-1.6z"/></svg>
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
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  )
}
function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  )
}
function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  )
}
