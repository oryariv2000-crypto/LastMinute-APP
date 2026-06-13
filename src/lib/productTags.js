/**
 * productTags.js — Single source of truth for the multi-select product
 * characteristics ("tags"). A deal's category comes from its BUSINESS TYPE
 * (see businessTypes.js); these tags describe the individual product on top of
 * that — and are the customer's secondary feed filter.
 *
 * A deal has MANY tags. Tags are stored as a `text[]` of slugs in `deals.tags`
 * (see supabase/deal_tags.sql). The taxonomy lives here in code — both the
 * B2B upload screens (TagSelector) and the B2C filter strip read from it, so
 * adding a new tag is a one-line change with no migration.
 *
 * Groups:
 *   diet     — dietary characteristics, customer-filterable (positive filter).
 *   state    — physical state, customer-filterable.
 *   allergen — "contains X"; shown as a warning on the product page, NOT a
 *              feed filter yet (a future "hide allergen" exclude filter can use
 *              the same data).
 */

export const TAG_GROUPS = [
  { id: 'diet',     label: 'תזונתי',        filterable: true },
  { id: 'state',    label: 'מצב המוצר',     filterable: true },
  { id: 'allergen', label: 'מכיל אלרגנים',  filterable: false },
]

export const PRODUCT_TAGS = [
  // ── Dietary ───────────────────────────────────────────────
  { slug: 'vegan',        label: 'טבעוני',     icon: '🌱', group: 'diet' },
  { slug: 'vegetarian',   label: 'צמחוני',     icon: '🥗', group: 'diet' },
  { slug: 'gluten_free',  label: 'ללא גלוטן',  icon: '🌾', group: 'diet' },
  { slug: 'kosher_dairy', label: 'כשר חלבי',   icon: '🧀', group: 'diet' },
  { slug: 'kosher_meat',  label: 'כשר בשרי',   icon: '🍖', group: 'diet' },
  { slug: 'kosher_parve', label: 'כשר פרווה',  icon: '🫛', group: 'diet' },
  { slug: 'organic',      label: 'אורגני',     icon: '🍃', group: 'diet' },
  // ── State ─────────────────────────────────────────────────
  { slug: 'fresh',        label: 'טרי',        icon: '✨', group: 'state' },
  { slug: 'baked_today',  label: 'נאפה היום',  icon: '🥐', group: 'state' },
  { slug: 'frozen',       label: 'קפוא',       icon: '❄️', group: 'state' },
  { slug: 'chilled',      label: 'מצונן',      icon: '🧊', group: 'state' },
  // ── Allergens (contains) ──────────────────────────────────
  { slug: 'a_nuts',       label: 'אגוזים',     icon: '🥜', group: 'allergen' },
  { slug: 'a_gluten',     label: 'גלוטן',      icon: '🌾', group: 'allergen' },
  { slug: 'a_milk',       label: 'חלב',        icon: '🥛', group: 'allergen' },
  { slug: 'a_eggs',       label: 'ביצים',      icon: '🥚', group: 'allergen' },
  { slug: 'a_sesame',     label: 'שומשום',     icon: '🫘', group: 'allergen' },
  { slug: 'a_soy',        label: 'סויה',       icon: '🌰', group: 'allergen' },
]

/** slug → tag descriptor, for fast resolution of stored slugs to labels/icons. */
export const TAG_BY_SLUG = new Map(PRODUCT_TAGS.map((t) => [t.slug, t]))

/** Group descriptor by id. */
export const GROUP_BY_ID = new Map(TAG_GROUPS.map((g) => [g.id, g]))

/** Tags belonging to one group (e.g. tagsInGroup('diet')). */
export function tagsInGroup(groupId) {
  return PRODUCT_TAGS.filter((t) => t.group === groupId)
}

/** Resolve an array of stored slugs to their descriptors (unknown slugs dropped). */
export function resolveTags(slugs = []) {
  return (slugs ?? []).map((s) => TAG_BY_SLUG.get(s)).filter(Boolean)
}

/** Resolve slugs and keep only one group (e.g. just the dietary tags for a card). */
export function resolveTagsInGroup(slugs = [], groupId) {
  return resolveTags(slugs).filter((t) => t.group === groupId)
}

/** Group ids the customer can filter the feed by (diet + state). */
export const FILTERABLE_GROUP_IDS = TAG_GROUPS.filter((g) => g.filterable).map((g) => g.id)
