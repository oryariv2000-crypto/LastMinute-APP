import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react'

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

/**
 * Turnstile — Cloudflare anti-bot widget wrapper.
 *
 * Graceful degradation: when VITE_TURNSTILE_SITE_KEY is missing/empty
 * (local dev, CI, tests) the component renders nothing and does NOT block the
 * form. Auth calls then proceed with captchaToken === undefined, exactly as
 * before. The widget only renders (and a token is produced) when a site key
 * is configured.
 *
 * Props:
 *   onToken  fn(token|null) — called with the captcha token (or null when it
 *                             expires / resets).
 * Ref API:
 *   reset()  — resets the widget and clears the token.
 */
function ensureScript() {
  if (typeof document === 'undefined') return
  if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return
  const s = document.createElement('script')
  s.src = SCRIPT_SRC
  s.async = true
  s.defer = true
  document.head.appendChild(s)
}

const Turnstile = forwardRef(function Turnstile({ onToken }, ref) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)

  useImperativeHandle(ref, () => ({
    reset() {
      try {
        if (window.turnstile && widgetIdRef.current != null) {
          window.turnstile.reset(widgetIdRef.current)
        }
      } catch {
        /* never throw from a reset */
      }
      onToken?.(null)
    },
  }), [onToken])

  useEffect(() => {
    // No site key → no-op. Nothing rendered, nothing injected.
    if (!siteKey) return
    ensureScript()

    let cancelled = false
    let pollId = null

    function renderWidget() {
      if (cancelled || !containerRef.current) return
      if (!window.turnstile || typeof window.turnstile.render !== 'function') return false
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onToken?.(token),
          'expired-callback': () => onToken?.(null),
        })
      } catch {
        /* defensive: never throw on render */
      }
      return true
    }

    // window.turnstile may not be ready immediately after script injection.
    if (!renderWidget()) {
      pollId = setInterval(() => {
        if (renderWidget() || cancelled) clearInterval(pollId)
      }, 200)
    }

    return () => {
      cancelled = true
      if (pollId) clearInterval(pollId)
      try {
        if (window.turnstile && widgetIdRef.current != null) {
          window.turnstile.remove?.(widgetIdRef.current)
        }
      } catch {
        /* ignore cleanup errors */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey])

  if (!siteKey) return null

  return <div ref={containerRef} className="turnstile-widget" />
})

export default Turnstile
