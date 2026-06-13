import { describe, it, expect } from 'vitest'
import { formatTimer } from './time'

describe('time — formatTimer', () => {
  it('formats minutes under an hour as MM:00', () => {
    expect(formatTimer(45)).toBe('45:00')
  })
  it('formats an hour or more as HH:MM:00', () => {
    expect(formatTimer(125)).toBe('02:05:00')
  })
  it('never goes negative', () => {
    expect(formatTimer(-5)).toBe('00:00')
  })
})
