import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import BottomNavigationB2C from '../components/BottomNavigation/BottomNavigationB2C'
import CategoryFilters from '../components/CategoryFilters/CategoryFilters'
import ProductCard from '../components/ProductCard/ProductCard'
import TagSelector from '../components/TagSelector/TagSelector'
import Loader from '../components/Loader/Loader'
import { getActiveDealsPage, discountPct } from '../lib/db'
import { FILTERABLE_GROUP_IDS, tagsInGroup } from '../lib/productTags'
import { BUSINESS_TYPES, businessTypeLabel } from '../lib/businessTypes'
import { useProfile } from '../lib/useProfile'
import { usePreferences } from '../lib/usePreferences'
import './B2CPage.css'

/**
 * B2CHomePage — Customer catalogue of last-minute deals. Reads `deals` from
 * Supabase one page at a time (infinite scroll) so it scales to thousands of
 * rows. Two filter axes are pushed to the server: the primary chips by
 * BUSINESS TYPE (bakery/café/…) and a characteristics panel by product tags
 * (dietary/state). The feed renders in the responsive product grid.
 *
 * Route: /b2c/home
 */
const ALL_CHIP = { id: 'all', label: 'הכל', icon: '🌿' }
// Primary filter chips = the business-type taxonomy. Static (no DB round-trip).
const TYPE_CHIPS = [ALL_CHIP, ...BUSINESS_TYPES.map((t) => ({ id: t.slug, label: t.label, icon: t.icon }))]
const PAGE_SIZE = 24

/** Debounce a fast-changing value (search box) so we don't refetch per keystroke. */
function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function B2CHomePage() {
  const { profile } = useProfile()
  const { prefs } = usePreferences()
  const [types, setTypes] = useState([])            // selected business-type slugs ([] = all)
  const [tags, setTags] = useState([])              // characteristic slugs to require (diet/state)
  const [excludeAllergens, setExcludeAllergens] = useState([]) // allergen slugs to hide
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [rawQuery, setRawQuery] = useState('')
  const query = useDebounced(rawQuery, 350)

  // The "show vegan only" profile preference layers a required 'vegan' tag on
  // top of whatever the in-page filters select.
  const effectiveTags = useMemo(
    () => (prefs.veganOnly && !tags.includes('vegan') ? [...tags, 'vegan'] : tags),
    [tags, prefs.veganOnly],
  )

  // Stable keys for the tag arrays so the query doesn't refetch on identical sets.
  const tagsKey = [...effectiveTags].sort().join(',')
  const excludeKey = [...excludeAllergens].sort().join(',')
  const typesKey = [...types].sort().join(',')
  const activeFilterCount = tags.length + excludeAllergens.length

  // Chips reflect the multi-selection; empty selection lights up the "all" chip.
  const chipValue = types.length ? types : ['all']
  function handleTypeToggle(id) {
    if (id === 'all') { setTypes([]); return }
    setTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  function toggleExclude(slug) {
    setExcludeAllergens((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug])
  }

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['deals-feed', typesKey, query, tagsKey, excludeKey],
    queryFn: ({ pageParam }) =>
      getActiveDealsPage({ pageParam, pageSize: PAGE_SIZE, businessTypes: types, search: query, tags: effectiveTags, excludeTags: excludeAllergens }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset,
  })

  const deals = useMemo(() => data?.pages.flatMap((p) => p.rows) ?? [], [data])

  // IntersectionObserver sentinel — load the next page as it nears the viewport.
  const sentinelRef = useRef(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return undefined
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
      },
      { rootMargin: '600px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0]
  const errorMsg = isError ? (error?.message || 'שגיאה בטעינת המבצעים') : ''

  return (
    <div className="b2c-page" dir="rtl">
      <NavbarB2C
        userName={profile?.full_name || 'לקוח/ה'}
        onSearch={setRawQuery}
      />

      <main className="b2c-page__main">
        <header className="b2c-page__greeting">
          <h1 className="b2c-page__greeting-title">
            שלום {firstName || 'וברוכים הבאים'} 👋
          </h1>
          <p className="b2c-page__greeting-sub">
            {isLoading ? 'אוכל טרי במחיר מופחת, ממש לידך' : `${deals.length} מבצעים פעילים סביבך`}
          </p>
        </header>

        <CategoryFilters
          categories={TYPE_CHIPS}
          value={chipValue}
          onChange={handleTypeToggle}
        />

        <div className="feed-filters">
          <button
            type="button"
            className={`feed-filters__toggle${activeFilterCount ? ' feed-filters__toggle--active' : ''}`}
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <FilterIcon />
            מאפיינים
            {activeFilterCount > 0 && <span className="feed-filters__count">{activeFilterCount}</span>}
          </button>
          {activeFilterCount > 0 && (
            <button
              type="button"
              className="feed-filters__clear"
              onClick={() => { setTags([]); setExcludeAllergens([]) }}
            >
              נקה
            </button>
          )}
        </div>

        {filtersOpen && (
          <div className="feed-filters__panel">
            <TagSelector value={tags} onChange={setTags} groups={FILTERABLE_GROUP_IDS} />

            {/* Allergens are an EXCLUDE filter — hide dishes that contain them. */}
            <fieldset className="tag-selector__group">
              <legend className="tag-selector__legend">הסתר מנות שמכילות</legend>
              <div className="tag-selector__chips">
                {tagsInGroup('allergen').map((t) => {
                  const active = excludeAllergens.includes(t.slug)
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      className={`tag-chip${active ? ' tag-chip--active' : ''}`}
                      aria-pressed={active}
                      onClick={() => toggleExclude(t.slug)}
                    >
                      <span className="tag-chip__icon" aria-hidden="true">{t.icon}</span>
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          </div>
        )}

        {errorMsg ? (
          <div className="product-grid__empty" role="alert">
            <span aria-hidden="true">⚠️</span>
            <p>{errorMsg}</p>
          </div>
        ) : isLoading ? (
          <SkeletonGrid />
        ) : deals.length === 0 ? (
          <div className="product-grid__empty">
            <span aria-hidden="true">🥦</span>
            <p>אין מבצעים תואמים לסינון</p>
          </div>
        ) : (
          <>
            <div className="product-grid" role="list">
              {deals.map((deal) => (
                <Link
                  key={deal.id}
                  to={`/b2c/product/${deal.id}`}
                  className="product-grid__cell"
                  role="listitem"
                  aria-label={`${deal.title} — ${deal.businesses?.name ?? ''}`}
                >
                  <ProductCard
                    asLink={false}
                    id={deal.id}
                    image={deal.image_url}
                    title={deal.title}
                    businessName={deal.businesses?.name ?? ''}
                    rating={deal.businesses?.rating ?? 0}
                    originalPrice={deal.original_price}
                    price={deal.discount_price}
                    discountPct={discountPct(deal.original_price, deal.discount_price)}
                    quantityLeft={deal.quantity_left}
                    tag={businessTypeLabel(deal.businesses?.business_type)}
                    tags={deal.tags}
                  />
                </Link>
              ))}
            </div>

            {/* Infinite-scroll trigger + tail spinner */}
            <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />
            {isFetchingNextPage && <Loader label="טוען עוד…" />}
            {!hasNextPage && deals.length > PAGE_SIZE && (
              <p className="b2c-feed__end">הגעת לסוף — אלה כל המבצעים הפעילים כרגע 🌿</p>
            )}
          </>
        )}
      </main>

      <BottomNavigationB2C />
    </div>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

/* Skeleton grid shown on first load (matches the real grid layout). */
function SkeletonGrid() {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <article key={i} className="product-card product-card--skeleton">
          <div className="product-card__media" />
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line skeleton-line--meta" />
          <div className="skeleton-line skeleton-line--price" />
        </article>
      ))}
    </div>
  )
}
