import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import NavbarB2B from '../components/NavbarB2B/NavbarB2B'
import BottomNavigationB2B from '../components/BottomNavigation/BottomNavigationB2B'
import CameraCaptureSection from '../components/CameraCaptureSection/CameraCaptureSection'
import SubmitButton from '../components/SubmitButton/SubmitButton'
import Loader from '../components/Loader/Loader'
import { uploadDealImage } from '../lib/db'
import { parseDealsFromText } from '../lib/parseDeals'
import { analyzeShowcaseImage } from '../lib/aiVision'
import { useProfile } from '../lib/useProfile'
import { isBusinessOpen } from '../lib/businessHours'
import { useSpeechDictation } from '../lib/useSpeechDictation'
import { ChevronRightIcon, MicIcon, StopIcon } from '../components/icons'
import './B2BPage.css'

/**
 * B2BNewDealPage — Capture leftovers as a showcase photo (AI Vision) or via a
 * typed/dictated description, then hand a structured list of suggested deals
 * to the AI review screen (which performs the actual insert on publish).
 *
 * Route: /b2b/new-deal
 */
export default function B2BNewDealPage() {
  const navigate = useNavigate()
  const { business } = useProfile({ withBusiness: true })
  const [photos, setPhotos]           = useState([])
  const [description, setDescription] = useState('')
  const [analyzing, setAnalyzing]     = useState(false)
  const [error, setError]             = useState('')

  const canContinue = description.trim() !== '' || photos.length > 0

  // ── Live dictation straight into the text box ───────────────────
  // Final phrases are committed to `description`; the in-progress `interim`
  // phrase is shown live (read-only) so the owner sees words as they speak.
  const heardRef = useRef(false)
  const { supported, listening, interim, level, error: micError, start, stop } =
    useSpeechDictation({
      onResult: (text) => {
        heardRef.current = true
        setDescription((d) => (d.trim() ? `${d.trimEnd()} ${text}` : text))
      },
    })

  const liveValue =
    listening && interim
      ? `${description}${description && !description.endsWith(' ') ? ' ' : ''}${interim}`
      : description

  // Auto-grow the textarea to fit its content (responsive to text length).
  const textareaRef = useRef(null)
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [liveValue])

  // Diagnostics: the Web Speech engine may "listen" but return nothing (common
  // in Edge/Brave — Hebrew recognition works reliably only in Chrome). If a few
  // seconds pass with no transcript, tell the owner what's going on.
  const [noSpeech, setNoSpeech] = useState(false)
  useEffect(() => { if (interim) heardRef.current = true }, [interim])
  useEffect(() => {
    if (!listening) return undefined
    heardRef.current = false
    const t = setTimeout(() => { if (!heardRef.current) setNoSpeech(true) }, 4000)
    return () => clearTimeout(t)
  }, [listening])

  // Toggle dictation; clear any stale "no speech" note when (re)starting.
  function toggleMic() {
    if (listening) { stop() } else { setNoSpeech(false); start() }
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    setError('')
    try {
      let scannedItems = []
      let imageUrl = null

      if (photos[0]) {
        // AI Vision: analyze the showcase photo into structured deal items.
        scannedItems = await analyzeShowcaseImage(photos[0])
        if (!scannedItems.length) {
          setError('ה-AI לא זיהה מוצרים בתמונה — נסה/י תמונה ברורה יותר')
          setAnalyzing(false)
          return
        }
        // Best-effort: keep the showcase photo as a shared fallback image.
        try { imageUrl = await uploadDealImage(photos[0]) } catch { /* non-fatal */ }
      } else {
        // No photo — fall back to the typed/dictated description, mapped to
        // the same shape the review screen consumes.
        scannedItems = parseDealsFromText(description).map((it) => ({
          id: it.id,
          title: it.title,
          category: '',
          quantity: it.quantity,
          original_price: it.originalPrice,
          discount_price: it.suggestedPrice,
        }))
        if (!scannedItems.length) {
          setError('לא זוהו מוצרים מהטקסט — הוסף/י תמונה או פרט/י מה נשאר')
          setAnalyzing(false)
          return
        }
      }

      navigate('/b2b/review', { state: { scannedItems, imageUrl } })
    } catch (err) {
      setError(err?.message || 'ניתוח התמונה נכשל')
      setAnalyzing(false)
    }
  }

  return (
    <div className="b2b-page" dir="rtl">
      {analyzing && <Loader fullscreen label="ה-AI מנתח את חלון הראווה…" />}

      <NavbarB2B businessName={business?.name || 'העסק שלי'} avatarUrl={business?.logo_url} isOpen={isBusinessOpen(business)} notifCount={0} />

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
            צלם/י את חלון הראווה — ה-AI יזהה מוצרים, כמויות ומחירים (או כתוב/י מה נשאר)
          </p>
        </header>

        <section className="new-deal-text" aria-label="תיאור המוצרים">
          <label htmlFor="new-deal-desc" className="new-deal-text__label">
            מה נשאר היום?
          </label>

          <div className="new-deal-text__box">
            <textarea
              id="new-deal-desc"
              ref={textareaRef}
              className="new-deal-text__input"
              rows={3}
              value={liveValue}
              readOnly={listening}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="לדוגמה: 5 קרואסונים, 3 סלטים, 10 בורקס ב-8 ש״ח"
              dir="rtl"
            />
            {supported && (
              <button
                type="button"
                className={`new-deal-text__mic${listening ? ' new-deal-text__mic--live' : ''}`}
                onClick={toggleMic}
                aria-label={listening ? 'עצור הקלטה' : 'דבר/י — הטקסט יוקלד אוטומטית'}
                aria-pressed={listening}
                style={listening ? { transform: `scale(${1 + level * 0.25})` } : undefined}
              >
                {listening ? <StopIcon /> : <MicIcon />}
              </button>
            )}
          </div>

          {listening ? (
            <p className="new-deal-text__hint new-deal-text__hint--live" aria-live="polite">
              🎙️ מקשיב… דבר/י עכשיו, והטקסט יופיע למעלה
            </p>
          ) : (
            <p className="new-deal-text__hint">
              {supported
                ? 'לחצ/י על המיקרופון ודבר/י, או הקלידו ידנית. ציין/י כמות לפני כל מוצר (למשל: 3 בורקס 5 לחם).'
                : 'הכתבה קולית אינה נתמכת בדפדפן זה — הקלד/י ידנית. ציין/י כמות לפני כל מוצר.'}
            </p>
          )}

          {/* No transcript came back though the mic is live → browser limitation. */}
          {listening && noSpeech && !micError && (
            <p className="new-deal-text__note" role="status">
              {level > 0.05
                ? 'המיקרופון קולט קול, אבל הדפדפן לא מזהה דיבור. זיהוי דיבור בעברית עובד באופן יציב רק ב-Google Chrome — נסה/י לפתוח את האתר ב-Chrome, או הקלד/י ידנית.'
                : 'לא נקלט קול מהמיקרופון. אם את/ה על אוזניות Bluetooth (כמו AirPods) — זה מקור נפוץ לתקלה; עבר/י למיקרופון המובנה של המחשב: לחצ/י על אייקון המיקרופון בשורת הכתובת ובחר/י מכשיר אחר, או החליפ/י את מכשיר הקלט בהגדרות Windows ורענן/י. אפשר גם להקליד ידנית.'}
            </p>
          )}
          {micError && (
            <p className="new-deal-text__note" role="alert">{micError}</p>
          )}
        </section>

        <CameraCaptureSection onChange={setPhotos} />

        {error && (
          <p className="b2b-page__helper" role="alert" style={{ color: 'var(--color-error)' }}>
            {error}
          </p>
        )}

        <SubmitButton
          loading={analyzing}
          disabled={!canContinue}
          variant="action"
          onClick={handleAnalyze}
          id="new-deal-analyze-btn"
        >
          {analyzing
            ? 'מנתח…'
            : photos.length
              ? '🔍 נתח את חלון הראווה'
              : '✨ נתח עם AI'}
        </SubmitButton>

        <p className="b2b-page__helper">
          {canContinue
            ? '⚠️ ה-AI יכול לטעות בזיהוי מוצרים, כמויות ומחירים — בדקו וערכו את ההצעות במסך הבא לפני הפרסום.'
            : 'כתוב/י מה נשאר (או הוסף/י הקלטה/תמונה) כדי להמשיך'}
        </p>
      </main>

      <BottomNavigationB2B notifCount={0} />
    </div>
  )
}
