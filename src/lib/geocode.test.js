import { describe, it, expect, beforeEach, vi } from 'vitest'
import { geocodeAddress } from './geocode'

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
