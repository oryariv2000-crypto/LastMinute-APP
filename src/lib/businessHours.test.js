import { describe, it, expect } from 'vitest'
import { businessOpenState, isBusinessOpen, manualCloseUntil } from './businessHours'

// A Wednesday at the given local HH:MM. 2026-05-27 is a Wednesday.
function wedAt(h, m = 0) {
  return new Date(2026, 4, 27, h, m, 0, 0)
}
const HOURS = {
  wed: { open: '08:00', close: '17:00', closed: false },
  thu: { open: '08:00', close: '17:00', closed: false },
  sat: { closed: true },
}

describe('businessOpenState', () => {
  it('open within today\'s window', () => {
    const s = businessOpenState({ opening_hours: HOURS }, wedAt(10))
    expect(s.open).toBe(true)
    expect(s.status).toBe('open')
  })

  it('closed before opening and after closing', () => {
    expect(isBusinessOpen({ opening_hours: HOURS }, wedAt(7, 30))).toBe(false)
    expect(isBusinessOpen({ opening_hours: HOURS }, wedAt(17, 1))).toBe(false)
    expect(businessOpenState({ opening_hours: HOURS }, wedAt(7, 30)).status).toBe('scheduled_closed')
  })

  it('closed on a day marked closed', () => {
    // Saturday 2026-05-30
    const sat = new Date(2026, 4, 30, 12, 0)
    expect(isBusinessOpen({ opening_hours: HOURS }, sat)).toBe(false)
  })

  it('manual override closes during open hours', () => {
    const closedUntil = wedAt(17).toISOString()
    const s = businessOpenState({ opening_hours: HOURS, closed_until: closedUntil }, wedAt(10))
    expect(s.open).toBe(false)
    expect(s.status).toBe('manual_closed')
  })

  it('override expires at next window — open again the following day', () => {
    const closedUntil = wedAt(17).toISOString()
    // Thursday 09:00 — within Thursday's window, override timestamp is in the past
    const thu = new Date(2026, 4, 28, 9, 0)
    expect(isBusinessOpen({ opening_hours: HOURS, closed_until: closedUntil }, thu)).toBe(true)
  })

  it('no schedule falls back to open, but honours a live override', () => {
    expect(isBusinessOpen({ opening_hours: {} }, wedAt(3))).toBe(true)
    const future = wedAt(23).toISOString()
    expect(isBusinessOpen({ opening_hours: {}, closed_until: future }, wedAt(10))).toBe(false)
  })
})

describe('manualCloseUntil', () => {
  it('returns the end of today\'s window', () => {
    const d = manualCloseUntil({ opening_hours: HOURS }, wedAt(10))
    expect(d.getHours()).toBe(17)
    expect(d.getMinutes()).toBe(0)
  })

  it('falls back to end of day with no schedule', () => {
    const d = manualCloseUntil({ opening_hours: {} }, wedAt(10))
    expect(d.getHours()).toBe(23)
  })
})
