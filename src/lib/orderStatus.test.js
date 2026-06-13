import { describe, it, expect } from 'vitest'
import { ACTIVE_STATUSES, isActiveStatus } from './orderStatus'

describe('orderStatus', () => {
  it('treats only open statuses as active', () => {
    expect(ACTIVE_STATUSES).toEqual(['pending', 'confirmed', 'ready'])
    expect(isActiveStatus('pending')).toBe(true)
    expect(isActiveStatus('confirmed')).toBe(true)
    expect(isActiveStatus('ready')).toBe(true)
  })
  it('treats closed statuses as not active', () => {
    expect(isActiveStatus('completed')).toBe(false)
    expect(isActiveStatus('cancelled')).toBe(false)
    expect(isActiveStatus('active')).toBe(false) // legacy literal must not match
  })
})
