import { useRef, useState } from 'react'
import './SwipeToConfirm.css'

/**
 * SwipeToConfirm — "slide to confirm" control. The customer drags the thumb to
 * the end to perform an intentional, hard-to-misfire action (used for "I picked
 * up my order" at the counter). Pointer-based (works for touch + mouse), with a
 * keyboard fallback (focus the thumb, press Enter/Space).
 *
 * Mechanics run LTR (thumb left → right) regardless of page direction, which is
 * the universally understood "slide to confirm" gesture; the label is localized.
 *
 * Props:
 *   label          string — idle label
 *   confirmedLabel string — label after a successful confirm
 *   onConfirm      fn     — fired once when the slide passes the threshold
 *   loading        bool   — shows "מעדכן…" and locks the control
 *   disabled       bool
 */
const THRESHOLD = 0.92

export default function SwipeToConfirm({
  label = 'החלק לאישור',
  confirmedLabel = 'אושר ✓',
  onConfirm,
  loading = false,
  disabled = false,
}) {
  const trackRef = useRef(null)
  const thumbRef = useRef(null)
  const draggingRef = useRef(false)
  const progressRef = useRef(0)
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const locked = disabled || loading || confirmed

  function span() {
    const track = trackRef.current
    const thumb = thumbRef.current
    if (!track || !thumb) return 1
    return Math.max(1, track.clientWidth - thumb.offsetWidth - 8)
  }

  function apply(p) {
    const clamped = Math.min(1, Math.max(0, p))
    progressRef.current = clamped
    setProgress(clamped)
  }

  function fire() {
    setConfirmed(true)
    apply(1)
    onConfirm?.()
  }

  function setFromClientX(clientX) {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const half = (thumbRef.current?.offsetWidth ?? 52) / 2
    apply((clientX - rect.left - half) / span())
  }

  function onPointerDown(e) {
    if (locked) return
    draggingRef.current = true
    setDragging(true)
    thumbRef.current?.setPointerCapture?.(e.pointerId)
  }
  function onPointerMove(e) {
    if (!draggingRef.current) return
    setFromClientX(e.clientX)
  }
  function onPointerUp() {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    if (progressRef.current >= THRESHOLD) fire()
    else apply(0)
  }
  function onKeyDown(e) {
    if (locked) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fire()
    }
  }

  return (
    <div
      ref={trackRef}
      className={`swipe-confirm${locked ? ' swipe-confirm--locked' : ''}${confirmed ? ' swipe-confirm--done' : ''}${dragging ? ' swipe-confirm--dragging' : ''}`}
      dir="ltr"
    >
      <div className="swipe-confirm__fill" style={{ width: `${progress * 100}%` }} />
      <span className="swipe-confirm__label">
        {loading ? 'מעדכן…' : confirmed ? confirmedLabel : label}
      </span>
      <button
        type="button"
        ref={thumbRef}
        className="swipe-confirm__thumb"
        // Positioned purely from `progress` (no ref reads during render); the
        // 60px = thumb width (52) + 8px of track padding. span() mirrors this
        // for the drag math in the pointer handlers.
        style={{ insetInlineStart: `calc(4px + ${progress} * (100% - 60px))` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        disabled={locked && !loading}
        aria-label={label}
      >
        {confirmed ? '✓' : '›'}
      </button>
    </div>
  )
}
