import { describe, it, expect } from 'vitest'
import {
  BUSINESS_TYPES,
  businessTypeLabel,
  businessTypeIcon,
  isKnownBusinessType,
} from './businessTypes'

describe('businessTypes', () => {
  it('every type has a slug, label and icon; slugs are unique', () => {
    const slugs = new Set()
    for (const t of BUSINESS_TYPES) {
      expect(t.slug).toBeTruthy()
      expect(t.label).toBeTruthy()
      expect(t.icon).toBeTruthy()
      slugs.add(t.slug)
    }
    expect(slugs.size).toBe(BUSINESS_TYPES.length)
  })

  it('businessTypeLabel resolves a known slug to its Hebrew label', () => {
    expect(businessTypeLabel('bakery')).toBe('מאפייה')
  })

  it('businessTypeLabel passes through custom (Other) free text', () => {
    expect(businessTypeLabel('חומוסייה')).toBe('חומוסייה')
  })

  it('businessTypeLabel returns empty string for empty input', () => {
    expect(businessTypeLabel('')).toBe('')
    expect(businessTypeLabel(null)).toBe('')
  })

  it('isKnownBusinessType distinguishes taxonomy slugs from custom text', () => {
    expect(isKnownBusinessType('cafe')).toBe(true)
    expect(isKnownBusinessType('חומוסייה')).toBe(false)
  })

  it('businessTypeIcon falls back to a neutral storefront icon', () => {
    expect(businessTypeIcon('bakery')).toBe('🥐')
    expect(businessTypeIcon('unknown')).toBe('🏪')
  })
})
