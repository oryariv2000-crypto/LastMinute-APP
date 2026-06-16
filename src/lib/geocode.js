/**
 * geocode.js — turn a free-text address into { lat, lng } via OpenStreetMap's
 * Nominatim (free, no API key). Used to place businesses on the explore map
 * when they have no stored coordinates yet.
 *
 * Two safeguards keep us within Nominatim's usage policy:
 *  - results are cached in localStorage (so an address is looked up once), and
 *  - requests are serialized through a queue with ≥1s spacing (max ~1 req/sec).
 */
const CACHE_KEY = 'lm-geocode-v1'

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {} } catch { return {} }
}
function saveCache(cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)) } catch { /* quota — ignore */ }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=il&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const data = await res.json()
  const hit = Array.isArray(data) ? data[0] : null
  if (!hit) return null
  return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) }
}

/**
 * Search Nominatim for up to `limit` matching addresses (for autocomplete).
 * Returns [{ label, lat, lng }]. Unlike geocodeAddress this is NOT routed through
 * the 1s queue — the caller (AddressAutocomplete) debounces keystrokes and aborts
 * stale requests, which keeps us within Nominatim's ~1 req/sec policy. Results
 * are cached in-memory per query so re-typing a query doesn't re-hit the network.
 */
const searchCache = new Map()

export async function searchAddresses(query, { limit = 5, signal } = {}) {
  const key = (query || '').trim()
  if (!key) return []
  if (searchCache.has(key)) return searchCache.get(key)

  const url =
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0` +
    `&limit=${limit}&countrycodes=il&accept-language=he&q=${encodeURIComponent(key)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal })
  if (!res.ok) return []
  const data = await res.json()
  const results = (Array.isArray(data) ? data : [])
    .map((hit) => ({ label: hit.display_name, lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) }))
    .filter((r) => r.label && Number.isFinite(r.lat) && Number.isFinite(r.lng))
  searchCache.set(key, results)
  return results
}

let queue = Promise.resolve()

/**
 * Resolve an address to { lat, lng } (or null). Cached + rate-limited.
 * Returns null immediately for empty input.
 */
export function geocodeAddress(address) {
  const key = (address || '').trim()
  if (!key) return Promise.resolve(null)

  const cache = loadCache()
  if (key in cache) return Promise.resolve(cache[key])

  const run = queue.then(async () => {
    const fresh = loadCache()                 // may have filled while we waited
    if (key in fresh) return fresh[key]
    await sleep(1100)                          // be a good Nominatim citizen
    const c = loadCache()
    try { c[key] = await fetchNominatim(key) } catch { c[key] = null }
    saveCache(c)
    return c[key]
  })
  queue = run.catch(() => {})                  // keep the queue alive on error
  return run
}
