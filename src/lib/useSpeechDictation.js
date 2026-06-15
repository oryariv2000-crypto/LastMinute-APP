import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useSpeechDictation — browser speech-to-text + a real microphone level meter.
 *
 * Two independent signals:
 *   • SpeechRecognition (Web Speech API) → text, via `onResult` + `interim`.
 *   • An AudioContext analyser on the mic stream → `level` (0..1), so the UI
 *     can prove the mic is actually picking up sound even if recognition (a
 *     Google-backed service, missing on some Chromium builds) returns nothing.
 *
 * Recognition auto-restarts after silence so a single press keeps listening.
 * Everything runs in the browser — no backend.
 *
 * @param {{ lang?: string, onResult?: (text: string) => void }} opts
 */
export function getSpeechRecognition() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function useSpeechDictation({ lang = 'he-IL', onResult } = {}) {
  const [supported] = useState(() => !!getSpeechRecognition())
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [level, setLevel] = useState(0)
  const [error, setError] = useState('')

  const recRef = useRef(null)
  const wantRef = useRef(false) // does the user still intend to listen?
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  // ── Mic level metering (Web Audio) ──────────────────────────────
  const streamRef = useRef(null)
  const ctxRef = useRef(null)
  const rafRef = useRef(0)

  const stopMeter = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      ctxRef.current.close().catch(() => {})
    }
    ctxRef.current = null
    setLevel(0)
  }, [])

  const startMeter = useCallback(async () => {
    // The meter needs its OWN getUserMedia stream. On touch devices (esp.
    // Android) the mic is EXCLUSIVE: that second stream starves the
    // SpeechRecognition engine, which then returns no transcript even though
    // audio is captured (the button still pulses). Desktop allows concurrent
    // capture, so we only run the meter there. Recognition is the priority.
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(pointer: coarse)')?.matches
    ) {
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const Ctx = window.AudioContext || window.webkitAudioContext
      const ctx = new Ctx()
      ctxRef.current = ctx
      // Chrome may create the context "suspended"; resume so the analyser
      // actually receives samples (otherwise the level meter stays at 0).
      if (ctx.state === 'suspended') { try { await ctx.resume() } catch { /* noop */ } }
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      ctx.createMediaStreamSource(stream).connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / data.length)
        setLevel(Math.min(1, rms * 3.2)) // amplify for a livelier display
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      // Metering is best-effort; recognition can still work without it.
    }
  }, [])

  // ── Public controls ─────────────────────────────────────────────
  const stop = useCallback(() => {
    wantRef.current = false
    try { recRef.current?.stop() } catch { /* already stopped */ }
    stopMeter()
    setListening(false)
  }, [stopMeter])

  const start = useCallback(() => {
    const SR = getSpeechRecognition()
    if (!SR) {
      setError('הדפדפן לא תומך בהכתבה קולית — נסה/י Chrome או הקלד/י ידנית')
      return
    }
    setError('')
    wantRef.current = true

    const rec = new SR()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e) => {
      let finalText = ''
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += transcript
        else interimText += transcript
      }
      if (finalText.trim()) onResultRef.current?.(finalText.trim())
      setInterim(interimText)
    }
    rec.onerror = (e) => {
      // "no-speech" / "aborted" are normal during pauses — keep going.
      if (e.error === 'no-speech' || e.error === 'aborted') return
      wantRef.current = false
      setError(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'אין הרשאת מיקרופון'
          : `שגיאת הכתבה: ${e.error}`,
      )
    }
    rec.onend = () => {
      setInterim('')
      // Chrome stops after a silence; restart while the user still wants to talk.
      if (wantRef.current) {
        try { rec.start() } catch { /* race on restart — ignore */ }
      } else {
        setListening(false)
      }
    }

    recRef.current = rec
    try {
      rec.start()
      setListening(true)
      startMeter()
    } catch {
      // start() throws if invoked while already running — ignore.
    }
  }, [lang, startMeter])

  // Release everything on unmount.
  useEffect(() => () => {
    wantRef.current = false
    try { recRef.current?.abort?.() } catch { /* noop */ }
    stopMeter()
  }, [stopMeter])

  return { supported, listening, interim, level, error, start, stop }
}
