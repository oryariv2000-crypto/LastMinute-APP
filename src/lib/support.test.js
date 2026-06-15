import { describe, it, expect } from 'vitest'
import {
  isAdmin, ADMIN_ROLE, TOPICS_BY_AUDIENCE, labelOf, TICKET_STATUSES,
} from './support'

describe('support config', () => {
  it('isAdmin is true only for the admin role (string or profile object)', () => {
    expect(isAdmin(ADMIN_ROLE)).toBe(true)
    expect(isAdmin('admin')).toBe(true)
    expect(isAdmin({ role: 'admin' })).toBe(true)
    expect(isAdmin('customer')).toBe(false)
    expect(isAdmin({ role: 'business_owner' })).toBe(false)
    expect(isAdmin({})).toBe(false)
    expect(isAdmin(null)).toBe(false)
    expect(isAdmin(undefined)).toBe(false)
  })

  it('topics differ per audience and both end with "other"', () => {
    expect(TOPICS_BY_AUDIENCE.customer.at(-1).id).toBe('other')
    expect(TOPICS_BY_AUDIENCE.business_owner.at(-1).id).toBe('other')
    expect(TOPICS_BY_AUDIENCE.customer).not.toEqual(TOPICS_BY_AUDIENCE.business_owner)
  })

  it('labelOf resolves an id to its Hebrew label, falling back to the id', () => {
    expect(labelOf(TICKET_STATUSES, 'in_progress')).toBe('בטיפול')
    expect(labelOf(TICKET_STATUSES, 'unknown')).toBe('unknown')
  })
})
