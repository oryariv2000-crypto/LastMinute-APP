import { describe, it, expect, beforeEach, vi } from 'vitest'
import { geocodeAddress, searchAddresses } from './geocode'

const CACHE_KEY = 'lm-geocode-v1'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('geocodeAddress', () => {
  it('returns null for empty input without hitting the network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    expect(await geocodeAddress('   ')).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns a cached result without hitting the network', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ 'תל אביב': { lat: 32.08, lng: 34.78 } }))
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    expect(await geocodeAddress('תל אביב')).toEqual({ lat: 32.08, lng: 34.78 })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('geocodes a new address via Nominatim and caches the result', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '31.25', lon: '34.79' }],
    })
    const coords = await geocodeAddress('באר שבע 1')
    expect(coords).toEqual({ lat: 31.25, lng: 34.79 })
    expect(JSON.parse(localStorage.getItem(CACHE_KEY))['באר שבע 1']).toEqual({ lat: 31.25, lng: 34.79 })
  }, 8000)
})

describe('searchAddresses', () => {
  it('returns [] for empty input without hitting the network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    expect(await searchAddresses('   ')).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('maps Nominatim hits to { label, lat, lng } and drops malformed rows', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        { display_name: 'דיזנגוף 40, תל אביב יפו, ישראל', lat: '32.07', lon: '34.77' },
        { display_name: 'דיזנגוף 50, תל אביב יפו, ישראל', lat: '32.08', lon: '34.78' },
        { display_name: 'בלי קואורדינטות', lat: 'x', lon: 'y' }, // dropped
      ],
    })
    const out = await searchAddresses('תל אביב דיזנגוף')
    expect(out).toEqual([
      { label: 'דיזנגוף 40, תל אביב יפו, ישראל', lat: 32.07, lng: 34.77 },
      { label: 'דיזנגוף 50, תל אביב יפו, ישראל', lat: 32.08, lng: 34.78 },
    ])
  })

  it('caches results so a repeated query does not refetch', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ display_name: 'הרצל 1, ראשון לציון, ישראל', lat: '31.96', lon: '34.80' }],
    })
    await searchAddresses('ראשון לציון הרצל ייחודי')
    await searchAddresses('ראשון לציון הרצל ייחודי')
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
