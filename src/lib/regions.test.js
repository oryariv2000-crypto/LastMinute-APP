import { describe, it, expect } from 'vitest'
import { nearestRegion, nearestCity, regionOfCity, REGIONS } from './regions'

describe('regions', () => {
  it('finds the nearest region to a point (Tel Aviv → מרכז)', () => {
    expect(nearestRegion([32.0853, 34.7818]).id).toBe('center')
  })

  it('finds the nearest region for the south (Beer Sheva → דרום)', () => {
    expect(nearestRegion([31.252, 34.791]).id).toBe('south')
  })

  it('finds the nearest city within a region', () => {
    const center = REGIONS.find((r) => r.id === 'center')
    expect(nearestCity(center, [32.0853, 34.7818]).name).toBe('תל אביב')
  })

  it('maps a city name back to its region', () => {
    expect(regionOfCity('ירושלים')?.id).toBe('jerusalem')
    expect(regionOfCity('עיר דמיונית')).toBeNull()
  })
})
