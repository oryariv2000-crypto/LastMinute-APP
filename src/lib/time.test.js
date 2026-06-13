import { describe, it, expect } from 'vitest'
import { formatTimer } from './time'

describe('time — formatTimer', () => {
  it('formats a future target as HH:MM:SS', () => {
    const target = new Date(Date.now() + 3661 * 1000) // 1h 1m 1s
    expect(formatTimer(target)).toMatch(/^01:01:0[01]$/)
  })
  it('clamps a past target to 00:00:00', () => {
    expect(formatTimer(new Date(Date.now() - 1000))).toBe('00:00:00')
  })
  it('accepts a ms timestamp', () => {
    const target = Date.now() + 90 * 1000 // 1m 30s
    expect(formatTimer(target)).toMatch(/^00:01:[23]\d$/)
  })
  it('accepts an ISO string', () => {
    const target = new Date(Date.now() + 5 * 1000).toISOString()
    expect(formatTimer(target)).toMatch(/^00:00:0[45]$/)
  })
  it('returns 00:00:00 for Date.now() (zero remaining)', () => {
    expect(formatTimer(Date.now())).toBe('00:00:00')
  })
})
