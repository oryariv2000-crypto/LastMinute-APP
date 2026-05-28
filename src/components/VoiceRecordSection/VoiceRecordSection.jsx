import { useEffect, useRef, useState } from 'react'
import { useSpeechDictation } from '../../lib/useSpeechDictation'
import './VoiceRecordSection.css'

/* Arch-shaped profile so the level meter reads like a real waveform. */
const BAR_COUNT = 18
const BAR_FACTORS = Array.from({ length: BAR_COUNT }, (_, i) =>
  0.3 + 0.7 * Math.abs(Math.sin((i / (BAR_COUNT - 1)) * Math.PI)),
)

/**
 * VoiceRecordSection — Mic-first dictation for the new-deal flow.
 *
 * Transcribes speech to text (Web Speech API) and feeds each finalized phrase
 * up via `onTranscript`. The waveform reacts to the real microphone level, so
 * the owner can see the mic is live even when recognition itself is quiet.
 *
 * Props:
 *   onTranscript  fn(text) — called with each finalized phrase of speech
 */
export default function VoiceRecordSection({ onTranscript }) {
  const [showNoSpeech, setShowNoSpeech] = useState(false)
  const heardRef = useRef(false)

  const { supported, listening, interim, level, error, start, stop } = useSpeechDictation({
    onResult: (text) => {
      heardRef.current = true
      onTranscript?.(text)
    },
  })

  // Interim text also counts as "speech heard".
  useEffect(() => {
    if (interim) heardRef.current = true
  }, [interim])

  // While listening, if no transcript arrives within a few seconds, warn that
  // the browser likely can't recognise speech (mic level may still be moving).
  useEffect(() => {
    if (!listening) return undefined
    heardRef.current = false
    const t = setTimeout(() => { if (!heardRef.current) setShowNoSpeech(true) }, 5000)
    return () => { clearTimeout(t); setShowNoSpeech(false) }
  }, [listening])

  return (
    <section className="voice-record" aria-label="הכתבה קולית">
      <div className="voice-record__header">
        <h2 className="voice-record__title">ספר/י לנו מה נשאר</h2>
        <p className="voice-record__subtitle">
          {supported
            ? 'לחץ/י על המיקרופון ודבר/י — הטקסט יתווסף אוטומטית'
            : 'הכתבה קולית אינה נתמכת בדפדפן זה — הקלד/י ידנית למעלה'}
        </p>
      </div>

      <div className="voice-record__visual" aria-hidden="true">
        <div
          className={`voice-record__ring${listening ? ' voice-record__ring--active' : ''}`}
          style={listening ? { transform: `scale(${1 + level * 0.18})` } : undefined}
        >
          <button
            type="button"
            className={`voice-record__mic${listening ? ' voice-record__mic--recording' : ''}`}
            onClick={listening ? stop : start}
            disabled={!supported}
            aria-label={listening ? 'עצור הכתבה' : 'התחל הכתבה'}
            aria-pressed={listening}
          >
            {listening ? <StopIcon /> : <MicIcon />}
          </button>
        </div>

        {/* Live level meter — bar heights track the real mic input. */}
        <div className={`voice-record__wave${listening ? ' voice-record__wave--live' : ''}`}>
          {BAR_FACTORS.map((factor, i) => (
            <span
              key={i}
              style={
                listening
                  ? { height: `${4 + level * 34 * factor}px` }
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {listening && (
        <p className="voice-record__status" aria-live="polite">
          🎙️ מקשיב…{interim && <span className="voice-record__interim"> “{interim}”</span>}
        </p>
      )}

      {listening && showNoSpeech && !error && (
        <p className="voice-record__note" role="status">
          {level > 0.05
            ? 'המיקרופון תקין אך לא זוהה דיבור — ייתכן שהדפדפן אינו תומך בזיהוי עברית. נסה/י Chrome/Edge, או הקלד/י ידנית למעלה.'
            : 'לא נקלט קול מהמיקרופון — בדוק/י שהמיקרופון הנכון נבחר, או הקלד/י ידנית למעלה.'}
        </p>
      )}

      {error && (
        <p className="voice-record__note" role="alert">{error}</p>
      )}
    </section>
  )
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}
function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}
