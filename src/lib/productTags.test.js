import { describe, it, expect } from 'vitest'
import {
  PRODUCT_TAGS,
  TAG_GROUPS,
  TAG_BY_SLUG,
  tagsInGroup,
  resolveTags,
  resolveTagsInGroup,
  FILTERABLE_GROUP_IDS,
} from './productTags'

describe('productTags taxonomy', () => {
  it('every tag has a slug, label, icon and a known group', () => {
    const groupIds = new Set(TAG_GROUPS.map((g) => g.id))
    for (const t of PRODUCT_TAGS) {
      expect(t.slug).toBeTruthy()
      expect(t.label).toBeTruthy()
      expect(t.icon).toBeTruthy()
      expect(groupIds.has(t.group)).toBe(true)
    }
  })

  it('slugs are unique', () => {
    expect(TAG_BY_SLUG.size).toBe(PRODUCT_TAGS.length)
  })

  it('tagsInGroup returns only that group', () => {
    const diet = tagsInGroup('diet')
    expect(diet.length).toBeGreaterThan(0)
    expect(diet.every((t) => t.group === 'diet')).toBe(true)
  })

  it('resolveTags drops unknown slugs and keeps order', () => {
    const resolved = resolveTags(['vegan', 'not_a_real_tag', 'fresh'])
    expect(resolved.map((t) => t.slug)).toEqual(['vegan', 'fresh'])
  })

  it('resolveTagsInGroup filters to a single group', () => {
    const allergens = resolveTagsInGroup(['vegan', 'a_milk', 'fresh'], 'allergen')
    expect(allergens.map((t) => t.slug)).toEqual(['a_milk'])
  })

  it('allergens are not customer-filterable; diet + state are', () => {
    expect(FILTERABLE_GROUP_IDS).toContain('diet')
    expect(FILTERABLE_GROUP_IDS).toContain('state')
    expect(FILTERABLE_GROUP_IDS).not.toContain('allergen')
  })
})
