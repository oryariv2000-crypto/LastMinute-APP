import { describe, it, expect } from 'vitest'
import {
  isAdminEmail, ADMIN_EMAILS, TOPICS_BY_AUDIENCE, labelOf, TICKET_STATUSES,
} from './support'

describe('support config', () => {
  it('isAdminEmail matches the allowlist case-insensitively', () => {
    expect(isAdminEmail(ADMIN_EMAILS[0])).toBe(true)
    expect(isAdminEmail(ADMIN_EMAILS[0].toUpperCase())).toBe(true)
    expect(isAdminEmail('someone@else.com')).toBe(false)
    expect(isAdminEmail('')).toBe(false)
    expect(isAdminEmail(null)).toBe(false)
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
