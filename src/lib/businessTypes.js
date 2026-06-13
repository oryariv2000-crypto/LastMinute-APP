/**
 * businessTypes.js — Single source of truth for the kind of business
 * ("category" in product terms): bakery / café / pizzeria / …
 *
 * This is the PRIMARY classification axis: a product (deal) is categorized by
 * the type of the business that sells it — there is no per-product category.
 * The customer's main feed filter is built from this list, and the storefront
 * + profile chips resolve a stored slug back to its label/icon here.
 *
 * Storage: `businesses.business_type` holds the slug for a known type, or the
 * owner's free text when they pick "אחר" (Other). Unknown values simply don't
 * match any feed chip (they still show under "הכל").
 */

export const BUSINESS_TYPES = [
  { slug: 'bakery',     label: 'מאפייה',           icon: '🥐' },
  { slug: 'cafe',       label: 'בית קפה',          icon: '☕' },
  { slug: 'pizzeria',   label: 'פיצרייה',          icon: '🍕' },
  { slug: 'restaurant', label: 'מסעדה',            icon: '🍽️' },
  { slug: 'grocery',    label: 'מרכול/מכולת',      icon: '🛒' },
  { slug: 'deli',       label: 'מעדנייה',          icon: '🧀' },
  { slug: 'patisserie', label: 'קונדיטוריה',       icon: '🍰' },
  { slug: 'juicebar',   label: 'בר מיצים/שייקים',  icon: '🥤' },
  { slug: 'sushi',      label: 'סושי',             icon: '🍣' },
]

/** slug → descriptor, for resolving a stored business_type to label + icon. */
export const BUSINESS_TYPE_BY_SLUG = new Map(BUSINESS_TYPES.map((t) => [t.slug, t]))

/**
 * Display label for a stored business_type value: the taxonomy label when it's
 * a known slug, otherwise the raw value (a custom "Other" entry). Returns ''
 * for empty input.
 */
export function businessTypeLabel(value) {
  if (!value) return ''
  return BUSINESS_TYPE_BY_SLUG.get(value)?.label ?? value
}

/** Icon for a stored business_type, or a neutral fallback. */
export function businessTypeIcon(value) {
  return BUSINESS_TYPE_BY_SLUG.get(value)?.icon ?? '🏪'
}

/** True when the stored value is one of the predefined types (not custom text). */
export function isKnownBusinessType(value) {
  return BUSINESS_TYPE_BY_SLUG.has(value)
}
