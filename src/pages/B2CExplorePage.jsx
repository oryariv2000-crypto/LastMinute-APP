import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import NavbarB2C from '../components/NavbarB2C/NavbarB2C'
import BottomNavigationB2C from '../components/BottomNavigation/BottomNavigationB2C'
import Loader from '../components/Loader/Loader'
import { getBusinessesForMap } from '../lib/db'
import { geocodeAddress } from '../lib/geocode'
import { useProfile } from '../lib/useProfile'
import './B2CExplorePage.css'

/**
 * B2CExplorePage — Snap-Map-style interactive map: the user's location plus
 * nearby businesses as pins. Uses Leaflet + OpenStreetMap (no API key).
 *
 * Route: /b2c/explore
 */
const TEL_AVIV = [32.0853, 34.7818] // fallback center when geolocation denied

/* ── Custom pins (divIcon → no broken default-marker image issues) ── */
function userIcon(initials) {
  return L.divIcon({
    className: 'lm-pin',
    html: `<div class="lm-user-pin"><span>${initials}</span></div>`,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  })
}
function shopIcon() {
  return L.divIcon({
    className: 'lm-pin',
    html: `<div class="lm-shop-pin">🏪</div>`,
    iconSize: [40, 48],
    iconAnchor: [20, 46],
    popupAnchor: [0, -44],
  })
}

/* Recenters the map when a search match resolves to coordinates. Lives inside
   <MapContainer> so it can grab the Leaflet instance via useMap. */
function FlyTo({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    if (lat != null && lng != null) map.flyTo([lat, lng], 16, { duration: 0.8 })
  }, [lat, lng, map])
  return null
}

function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export default function B2CExplorePage() {
  const { profile } = useProfile()
  const { state } = useLocation()
  const focusBusinessId = state?.focusBusinessId ?? null // set when arriving from a search suggestion
  const [pos, setPos]         = useState(null)   // [lat, lng] once resolved
  const [ready, setReady]     = useState(false)  // geolocation settled
  const [denied, setDenied]   = useState(false)
  const [businesses, setBusinesses] = useState([])
  const [geo, setGeo]         = useState({})     // businessId → { lat, lng } from geocoding

  // Resolve the user's location (falls back to Tel Aviv on denial/timeout).
  useEffect(() => {
    let active = true
    const fallback = () => { if (active) { setPos(TEL_AVIV); setDenied(true); setReady(true) } }
    if (!navigator.geolocation) {
      queueMicrotask(fallback)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => { if (active) { setPos([p.coords.latitude, p.coords.longitude]); setReady(true) } },
      () => { if (active) { setPos(TEL_AVIV); setDenied(true); setReady(true) } },
      { enableHighAccuracy: true, timeout: 6000 },
    )
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    getBusinessesForMap()
      .then((b) => { if (active) setBusinesses(b) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  // Geocode real coordinates for businesses that have an address but no stored
  // lat/lng (cached + rate-limited in geocode.js). Resolves pins to real spots.
  useEffect(() => {
    let active = true
    ;(async () => {
      for (const b of businesses) {
        if (b.location_lat != null && b.location_lng != null) continue
        if (!b.address || geo[b.id]) continue
        const coords = await geocodeAddress(b.address)
        if (!active) return
        if (coords) setGeo((prev) => ({ ...prev, [b.id]: coords }))
      }
    })()
    return () => { active = false }
  }, [businesses]) // eslint-disable-line react-hooks/exhaustive-deps

  const center = pos || TEL_AVIV

  // Prefer stored coords, then geocoded coords; only fall back to a deterministic
  // scatter around the user while a business still has no real location.
  const pins = useMemo(() => {
    return businesses.map((b, i) => {
      let lat = b.location_lat ?? geo[b.id]?.lat
      let lng = b.location_lng ?? geo[b.id]?.lng
      const real = lat != null && lng != null
      if (!real) {
        const angle = (((i * 73) % 360) * Math.PI) / 180
        const r = 0.004 + (i % 4) * 0.0025
        lat = center[0] + Math.cos(angle) * r
        lng = center[1] + Math.sin(angle) * r
      }
      return { ...b, lat, lng, real, distanceKm: haversineKm(center, [lat, lng]) }
    })
  }, [businesses, geo, center])

  // Search recenters the map onto the first business whose name matches.
  const [search, setSearch] = useState('')
  const textMatch = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return null
    return pins.find((p) => (p.name || '').toLowerCase().includes(q)) || null
  }, [search, pins])
  // A business chosen from the search dropdown takes priority over typed text.
  const focusMatch = focusBusinessId ? pins.find((p) => p.id === focusBusinessId) : null
  const match = focusMatch || textMatch
  const searching = search.trim().length > 0

  const initials = (profile?.full_name || 'אני')
    .trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('')

  return (
    <div className="b2c-explore" dir="rtl">
      <NavbarB2C userName={profile?.full_name || 'לקוח/ה'} onSearch={setSearch} />

      <div className="b2c-explore__map-wrap">
        <div className="b2c-explore__overlay">
          <h1 className="b2c-explore__title">עסקים קרובים אליך</h1>
          <p className="b2c-explore__sub">
            {match
              ? `מציג את ${match.name}`
              : searching
                ? 'לא נמצא עסק תואם לחיפוש'
                : denied
                  ? 'המיקום לא זמין — מציג את אזור תל אביב'
                  : `${pins.length} עסקים באזורך`}
          </p>
        </div>

        {!ready ? (
          <div className="b2c-explore__loading"><Loader label="מאתר את מיקומך…" /></div>
        ) : (
          <MapContainer center={center} zoom={15} scrollWheelZoom className="b2c-explore__map">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FlyTo lat={match?.lat} lng={match?.lng} />
            {/* radius halo around the user, Snap-Map style */}
            <Circle
              center={center}
              radius={450}
              pathOptions={{ color: '#2D6A4F', fillColor: '#2D6A4F', fillOpacity: 0.08, weight: 1 }}
            />
            <Marker position={center} icon={userIcon(initials)}>
              <Popup>אתה כאן 📍</Popup>
            </Marker>
            {pins.map((p) => (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={shopIcon()}>
                <Popup>
                  <strong>{p.name}</strong>
                  {p.address ? <><br />{p.address}</> : null}
                  <br />{p.distanceKm.toFixed(1)} ק״מ ממך
                  <br />
                  <Link
                    to={`/b2c/business/${p.id}`}
                    style={{ display: 'inline-block', marginTop: 6, fontWeight: 700, color: '#2D6A4F' }}
                  >
                    כניסה לעסק ←
                  </Link>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      <BottomNavigationB2C />
    </div>
  )
}
