import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavbarB2B from '../components/NavbarB2B/NavbarB2B'
import BottomNavigationB2B from '../components/BottomNavigation/BottomNavigationB2B'
import VoiceRecordSection from '../components/VoiceRecordSection/VoiceRecordSection'
import CameraCaptureSection from '../components/CameraCaptureSection/CameraCaptureSection'
import SubmitButton from '../components/SubmitButton/SubmitButton'
import './B2BPage.css'

/**
 * B2BNewDealPage — Capture leftovers via voice + photos and hand off to AI.
 *
 * Route: /b2b/new-deal
 */
export default function B2BNewDealPage() {
  const navigate = useNavigate()
  const [voiceDuration, setVoiceDuration] = useState(null)
  const [photos, setPhotos]               = useState([])
  const [analyzing, setAnalyzing]         = useState(false)

  const canContinue = voiceDuration != null || photos.length > 0

  async function handleAnalyze() {
    setAnalyzing(true)
    try {
      await new Promise(r => setTimeout(r, 1300))
      navigate('/b2b/review')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="b2b-page" dir="rtl">
      <NavbarB2B businessName="הפינה של מיכל" isOpen notifCount={3} />

      <main className="b2b-page__main">
        <header className="b2b-page__greeting">
          <button
            type="button"
            className="b2b-page__back"
            onClick={() => navigate('/b2b/dashboard')}
            aria-label="חזרה"
          >
            <ChevronRightIcon /> חזרה
          </button>
          <h1 className="b2b-page__greeting-title">מבצע חדש</h1>
          <p className="b2b-page__greeting-sub">
            תאר/י מה נשאר ב-2 דרכים — קול ותמונות
          </p>
        </header>

        <VoiceRecordSection onRecordingComplete={setVoiceDuration} />

        <CameraCaptureSection onChange={setPhotos} />

        <SubmitButton
          loading={analyzing}
          disabled={!canContinue}
          variant="action"
          onClick={handleAnalyze}
          id="new-deal-analyze-btn"
        >
          {analyzing ? 'המערכת מנתחת...' : '✨ נתח עם AI'}
        </SubmitButton>

        {!canContinue && (
          <p className="b2b-page__helper">
            הוסף הקלטה או לפחות תמונה אחת כדי להמשיך
          </p>
        )}
      </main>

      <BottomNavigationB2B notifCount={2} />
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
