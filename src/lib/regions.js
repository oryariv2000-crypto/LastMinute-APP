/**
 * regions.js — Israel split into regions, each with its towns and approximate
 * coordinates. Used by the location picker: the customer drills region → city,
 * or taps "detect me" and we pick the nearest region + city locally from these
 * centroids (no third-party reverse-geocoding service).
 */
export const REGIONS = [
  {
    id: 'north', label: 'צפון', center: [32.9, 35.3],
    cities: [
      { name: 'חיפה', center: [32.794, 34.989] },
      { name: 'נהריה', center: [33.006, 35.094] },
      { name: 'עכו', center: [32.928, 35.082] },
      { name: 'כרמיאל', center: [32.918, 35.295] },
      { name: 'טבריה', center: [32.789, 35.531] },
      { name: 'צפת', center: [32.965, 35.498] },
      { name: 'עפולה', center: [32.610, 35.289] },
      { name: 'קריית שמונה', center: [33.207, 35.571] },
    ],
  },
  {
    id: 'center', label: 'מרכז', center: [32.08, 34.83],
    cities: [
      { name: 'תל אביב', center: [32.0853, 34.7818] },
      { name: 'רמת גן', center: [32.068, 34.824] },
      { name: 'פתח תקווה', center: [32.087, 34.887] },
      { name: 'הרצליה', center: [32.166, 34.843] },
      { name: 'רעננה', center: [32.184, 34.871] },
      { name: 'כפר סבא', center: [32.178, 34.907] },
      { name: 'ראשון לציון', center: [31.973, 34.789] },
      { name: 'חולון', center: [32.015, 34.773] },
      { name: 'בת ים', center: [32.017, 34.750] },
      { name: 'נתניה', center: [32.328, 34.857] },
    ],
  },
  {
    id: 'jerusalem', label: 'ירושלים והסביבה', center: [31.8, 35.15],
    cities: [
      { name: 'ירושלים', center: [31.768, 35.214] },
      { name: 'מודיעין', center: [31.898, 35.010] },
      { name: 'בית שמש', center: [31.745, 34.989] },
      { name: 'מעלה אדומים', center: [31.773, 35.298] },
    ],
  },
  {
    id: 'south', label: 'דרום', center: [31.2, 34.75],
    cities: [
      { name: 'באר שבע', center: [31.252, 34.791] },
      { name: 'אשדוד', center: [31.802, 34.650] },
      { name: 'אשקלון', center: [31.669, 34.571] },
      { name: 'קריית גת', center: [31.610, 34.770] },
      { name: 'נתיבות', center: [31.422, 34.588] },
      { name: 'דימונה', center: [31.070, 35.033] },
      { name: 'אילת', center: [29.557, 34.952] },
    ],
  },
]

export function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Nearest region object to a [lat,lng] point (by region centroid). */
export function nearestRegion(point) {
  return REGIONS.reduce((best, r) =>
    haversineKm(point, r.center) < haversineKm(point, best.center) ? r : best, REGIONS[0])
}

/** Nearest city within a region to a [lat,lng] point. */
export function nearestCity(region, point) {
  return region.cities.reduce((best, c) =>
    haversineKm(point, c.center) < haversineKm(point, best.center) ? c : best, region.cities[0])
}

/** Find the region that contains a given city name (or null). */
export function regionOfCity(cityName) {
  return REGIONS.find((r) => r.cities.some((c) => c.name === cityName)) ?? null
}
