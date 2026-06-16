import { useEffect, useRef, useState } from 'react'
import { XIcon } from '../icons'
import './OrderQrScanner.css'

/**
 * OrderQrScanner — lightweight camera QR reader for order pickup.
 *
 * `html5-qrcode` is heavy (camera + decoder) and only needed when the owner
 * actually opens the scanner, so it's dynamically imported on mount — it never
 * lands in the initial bundle, and a missing/blocked camera degrades to an
 * inline error (the page's code-input fallback stays usable either way).
 *
 * On a successful decode it stops the camera and reports the decoded text once
 * via onScan (the order_code encoded in the customer's pickup QR).
 *
 * Props:
 *   onScan(text)  fn — called with the decoded payload (once)
 *   onError(err)  fn — called if the camera can't start
 *   onClose()     fn — close button handler
 */
const READER_ID = 'order-qr-reader'

export default function OrderQrScanner({ onScan, onError, onClose }) {
  const [status, setStatus] = useState('starting') // starting | scanning | error
  // Keep callbacks in refs so the start/stop effect runs exactly once and the
  // live camera isn't torn down and rebuilt on every parent re-render.
  const onScanRef = useRef(onScan)
  const onErrorRef = useRef(onError)
  useEffect(() => { onScanRef.current = onScan; onErrorRef.current = onError })

  useEffect(() => {
    let scanner = null
    let cancelled = false
    let done = false // guard: report a decode only once

    ;(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled) return
        scanner = new Html5Qrcode(READER_ID)
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (done) return
            done = true
            onScanRef.current?.(decodedText)
            scanner?.stop().catch(() => {})
          },
          () => {}, // per-frame decode misses are normal — ignore
        )
        if (!cancelled) setStatus('scanning')
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        onErrorRef.current?.(err)
      }
    })()

    return () => {
      cancelled = true
      if (scanner) {
        scanner.stop().then(() => scanner.clear()).catch(() => {})
      }
    }
  }, [])

  return (
    <div className="order-scanner" role="dialog" aria-label="סריקת קוד QR של הזמנה">
      <div className="order-scanner__head">
        <span className="order-scanner__title">סריקת QR לאיסוף</span>
        <button type="button" className="order-scanner__close" onClick={onClose} aria-label="סגור סורק">
          <XIcon />
        </button>
      </div>

      <div id={READER_ID} className="order-scanner__view" />

      {status === 'error' && (
        <p className="order-scanner__error" role="alert">
          לא ניתן לפתוח את המצלמה. השתמש/י בהזנת קוד ההזמנה ידנית.
        </p>
      )}
      {status === 'starting' && (
        <p className="order-scanner__hint">מפעיל מצלמה…</p>
      )}
      {status === 'scanning' && (
        <p className="order-scanner__hint">כוון/י את המצלמה אל קוד ה‑QR של הלקוח</p>
      )}
    </div>
  )
}
