import { useEffect, useRef, useState } from 'react'
import './VoiceRecordSection.css'

/**
 * VoiceRecordSection — Mic-first capture UI for the new-deal flow.
 *
 * Records a short voice note describing what's left over; the AI flow
 * later turns it into deal suggestions.
 *
 * Props:
 *   onRecordingComplete  fn(durationSec) — called when user stops recording
 *   maxSeconds           number          — auto-stop limit (default 60)
 */
export default function VoiceRecordSection({ onRecordingComplete, maxSeconds = 60 }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds]     = useState(0)
  const [doneSec, setDoneSec]     = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => () => clearInterval(intervalRef.current), [])

  function start() {
    setSeconds(0)
    setDoneSec(null)
    setRecording(true)
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s + 1 >= maxSeconds) {
          stop(s + 1)
          return s + 1
        }
        return s + 1
      })
    }, 1000)
  }

  function stop(finalSec = seconds) {
    clearInterval(intervalRef.current)
    setRecording(false)
    setDoneSec(finalSec)
    onRecordingComplete?.(finalSec)
  }

  function reset() {
    setSeconds(0)
    setDoneSec(null)
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <section className="voice-record" aria-label="הקלטת קול">
      <div className="voice-record__header">
        <h2 className="voice-record__title">ספר/י לנו מה נשאר</h2>
        <p className="voice-record__subtitle">
          הקלט/י תיאור קצר — המערכת תזהה את המוצרים אוטומטית
        </p>
      </div>

      <div className="voice-record__visual" aria-hidden="true">
        <div className={`voice-record__ring${recording ? ' voice-record__ring--active' : ''}`}>
          <button
            type="button"
            className={`voice-record__mic${recording ? ' voice-record__mic--recording' : ''}`}
            onClick={recording ? () => stop() : start}
            aria-label={recording ? 'עצור הקלטה' : 'התחל הקלטה'}
            aria-pressed={recording}
          >
            {recording ? <StopIcon /> : <MicIcon />}
          </button>
        </div>

        {/* dummy waveform */}
        <div className={`voice-record__wave${recording ? ' voice-record__wave--active' : ''}`}>
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </div>

      <div className="voice-record__timer" aria-live="polite">
        <span className="voice-record__time">{mm}:{ss}</span>
        <span className="voice-record__time-max">/ 00:{String(maxSeconds).padStart(2, '0')}</span>
      </div>

      {doneSec != null && (
        <div className="voice-record__done">
          <span className="voice-record__done-icon" aria-hidden="true"><CheckIcon /></span>
          <span>הקלטה נשמרה ({doneSec} שנ׳)</span>
          <button type="button" className="voice-record__redo" onClick={reset}>
            הקלט שוב
          </button>
        </div>
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
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
