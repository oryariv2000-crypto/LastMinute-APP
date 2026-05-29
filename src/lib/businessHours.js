/**
 * businessHours — single source of truth for whether a business is open *now*.
 *
 * The status is derived live from two fields, so every client computes it from
 * the current clock instead of relying on a stale stored flag:
 *   - opening_hours: per-day schedule
 *       {"sun":{"open":"08:00","close":"17:00","closed":false}, ...}
 *   - closed_until:  optional timestamp for a manual "close now" override. The
 *       override is temporary — it expires at the end of the current window, so
 *       the shop reopens automatically at the next scheduled window.
 *
 * Windows are same-day only (close must be after open); overnight schedules are
 * not modelled. Times use the viewer's local clock (Israel for this app).
 */

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DAY_LABELS = {
  sun: 'ראשון', mon: 'שני', tue: 'שלישי', wed: 'רביעי',
  thu: 'חמישי', fri: 'שישי', sat: 'שבת',
}

export function todayKey(now = new Date()) {
  return DAY_KEYS[now.getDay()]
}

function toMin(hm) {
  if (typeof hm !== 'string') return null
  const [h, m] = hm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

/** True if at least one day has a usable open window. */
function hasSchedule(openingHours) {
  if (!openingHours || typeof openingHours !== 'object') return false
  return DAY_KEYS.some((k) => {
    const d = openingHours[k]
    return d && !d.closed && toMin(d.open) != null && toMin(d.close) != null
  })
}

/** Today's window as minutes + raw strings, or null when closed/invalid. */
function dayWindow(openingHours, dayIdx) {
  const d = openingHours?.[DAY_KEYS[dayIdx]]
  if (!d || d.closed) return null
  const open = toMin(d.open)
  const close = toMin(d.close)
  if (open == null || close == null || close <= open) return null
  return { open, close, openStr: d.open, closeStr: d.close }
}

/** Human hint for the next time the shop opens, or null. */
function nextOpenHint(openingHours, now) {
  if (!hasSchedule(openingHours)) return null
  const nowMin = now.getHours() * 60 + now.getMinutes()
  for (let i = 0; i <= 7; i++) {
    const idx = (now.getDay() + i) % 7
    const d = openingHours[DAY_KEYS[idx]]
    if (!d || d.closed) continue
    const open = toMin(d.open)
    if (open == null) continue
    if (i === 0 && nowMin >= open) continue // today's window already started/passed
    if (i === 0) return `ייפתח היום ב-${d.open}`
    if (i === 1) return `ייפתח מחר ב-${d.open}`
    return `ייפתח ב${DAY_LABELS[DAY_KEYS[idx]]} ב-${d.open}`
  }
  return null
}

/**
 * Live open/closed state for a business.
 * Returns: { open, status, label, hint }
 *   status: 'open' | 'no_schedule_open' | 'scheduled_closed' | 'manual_closed'
 */
export function businessOpenState(business, now = new Date()) {
  const openingHours = business?.opening_hours
  const closedUntil = business?.closed_until ? new Date(business.closed_until) : null
  const overrideActive = closedUntil && !Number.isNaN(closedUntil.getTime()) && now < closedUntil

  // Legacy/empty schedule: treat as always-on, but still honour a manual close.
  if (!hasSchedule(openingHours)) {
    if (overrideActive) {
      return { open: false, status: 'manual_closed', label: 'סגור', hint: nextOpenHint(openingHours, now) }
    }
    return { open: true, status: 'no_schedule_open', label: 'פתוח עכשיו', hint: null }
  }

  const win = dayWindow(openingHours, now.getDay())
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const withinHours = !!win && nowMin >= win.open && nowMin < win.close

  if (!withinHours) {
    return { open: false, status: 'scheduled_closed', label: 'סגור', hint: nextOpenHint(openingHours, now) }
  }
  if (overrideActive) {
    return { open: false, status: 'manual_closed', label: 'סגור', hint: nextOpenHint(openingHours, now) }
  }
  return { open: true, status: 'open', label: 'פתוח עכשיו', hint: `פתוח עד ${win.closeStr}` }
}

/** Convenience boolean for filtering. */
export function isBusinessOpen(business, now = new Date()) {
  return businessOpenState(business, now).open
}

/**
 * The datetime a manual "close now" should last until: the end of today's
 * window (so the shop reopens at the next scheduled window). When there is no
 * schedule, fall back to end of today.
 */
export function manualCloseUntil(business, now = new Date()) {
  const win = dayWindow(business?.opening_hours, now.getDay())
  const d = new Date(now)
  if (win) d.setHours(Math.floor(win.close / 60), win.close % 60, 0, 0)
  else d.setHours(23, 59, 0, 0)
  return d
}
