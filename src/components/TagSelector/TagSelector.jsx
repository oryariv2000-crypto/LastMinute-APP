import { TAG_GROUPS, tagsInGroup } from '../../lib/productTags'
import './TagSelector.css'

/**
 * TagSelector — grouped multi-select chips for a deal's characteristics
 * (dietary / state / allergens). Shared by every upload surface (the AI review
 * row and the deal edit modal) and reused as the customer-side feed filter.
 *
 * Controlled: `value` is an array of tag slugs; `onChange(nextSlugs)` fires on
 * every toggle. Limit which groups appear with `groups` (array of group ids) —
 * the B2C filter passes only the filterable groups.
 *
 * Props:
 *   value    string[]                  — selected tag slugs
 *   onChange fn(nextSlugs: string[])
 *   groups   string[]                  — group ids to render (default: all)
 */
export default function TagSelector({
  value = [],
  onChange,
  groups = TAG_GROUPS.map((g) => g.id),
}) {
  const selected = new Set(value)

  function toggle(slug) {
    const next = new Set(selected)
    if (next.has(slug)) next.delete(slug)
    else next.add(slug)
    onChange?.([...next])
  }

  const shown = TAG_GROUPS.filter((g) => groups.includes(g.id))

  return (
    <div className="tag-selector">
      {shown.map((group) => (
        <fieldset key={group.id} className="tag-selector__group">
          <legend className="tag-selector__legend">{group.label}</legend>
          <div className="tag-selector__chips">
            {tagsInGroup(group.id).map((tag) => {
              const active = selected.has(tag.slug)
              return (
                <button
                  key={tag.slug}
                  type="button"
                  className={`tag-chip${active ? ' tag-chip--active' : ''}`}
                  aria-pressed={active}
                  onClick={() => toggle(tag.slug)}
                >
                  <span className="tag-chip__icon" aria-hidden="true">{tag.icon}</span>
                  {tag.label}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
