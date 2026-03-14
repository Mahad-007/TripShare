
import { LatLng } from '../hooks/useGeolocation';

// ── Config ──────────────────────────────────────────────────────────────────────

function getToken(): string {
  return import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || '';
}

// ── Geocoding cache & recent-search helpers ─────────────────────────────────

const GEOCODE_CACHE_KEY = 'tripshare_geocode_cache';
const RECENT_SEARCHES_KEY = 'tripshare_recent_searches';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_ENTRIES = 50;
const MAX_RECENT_SEARCHES = 10;

// ── Types ───────────────────────────────────────────────────────────────────────

export interface GeocodedLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface NearbyPlace {
  placeId: string;
  name: string;
  location: LatLng;
  rating?: number;
  vicinity?: string;
  distanceText?: string;
}

export interface DirectionsResult {
  routeGeoJSON: GeoJSON.Feature;
  distanceText: string;
  durationText: string;
}

interface CacheEntry {
  result: GeocodedLocation;
  timestamp: number;
}

interface RecentSearch {
  query: string;
  result: GeocodedLocation;
  timestamp: number;
}

export interface SearchSuggestion {
  placeId: string;
  name: string;
  address: string;
  location: LatLng;
}

// ── Internal cache helpers ──────────────────────────────────────────────────────

function readCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(GEOCODE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CacheEntry>): void {
  try {
    const entries = Object.entries(cache).sort((a, b) => b[1].timestamp - a[1].timestamp);
    const trimmed = Object.fromEntries(entries.slice(0, MAX_CACHE_ENTRIES));
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable – silently continue
  }
}

// ── Public API ──────────────────────────────────────────────────────────────────

/**
 * Geocode a destination string. Returns a cached result when available (7-day TTL).
 */
export async function geocodeDestination(
  destination: string
): Promise<GeocodedLocation | null> {
  const key = destination.trim().toLowerCase();
  if (!key) return null;

  // 1. Check cache
  const cache = readCache();
  const cached = cache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // 2. Call Mapbox Geocoding API
  try {
    const token = getToken();
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${token}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;

    const [lng, lat] = feature.center;
    const geocoded: GeocodedLocation = {
      lat,
      lng,
      formattedAddress: feature.place_name || destination,
    };

    // Cache the result
    cache[key] = { result: geocoded, timestamp: Date.now() };
    writeCache(cache);

    return geocoded;
  } catch (error) {
    console.error('Geocoding failed:', error);
    return null;
  }
}

/**
 * Search for nearby tourist attractions / POIs using Mapbox Geocoding.
 * Returns up to 10 places sorted by distance.
 */
export async function searchNearbyPlaces(
  location: LatLng,
  radius: number = 5000
): Promise<NearbyPlace[]> {
  try {
    const token = getToken();
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/tourist%20attraction.json?proximity=${location.lng},${location.lat}&types=poi&limit=10&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const features = data.features || [];

    const places: NearbyPlace[] = features
      .map((f: any) => {
        const [lng, lat] = f.center;
        const loc: LatLng = { lat, lng };
        const d = haversineKm(location, loc);

        // Skip places outside the radius
        if (d > radius / 1000) return null;

        return {
          placeId: f.id || '',
          name: f.text || f.place_name || 'Unknown',
          location: loc,
          vicinity: f.properties?.address || f.place_name?.split(',').slice(1).join(',').trim() || '',
          distanceText: d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`,
        };
      })
      .filter(Boolean) as NearbyPlace[];

    // Sort by distance
    places.sort((a, b) => {
      const da = haversineKm(location, a.location);
      const db = haversineKm(location, b.location);
      return da - db;
    });

    return places;
  } catch (error) {
    console.error('Nearby search failed:', error);
    return [];
  }
}

/**
 * Get driving directions between two points using Mapbox Directions API.
 */
export async function getDirections(
  origin: LatLng,
  destination: LatLng
): Promise<DirectionsResult | null> {
  try {
    const token = getToken();
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    const distanceKm = route.distance / 1000;
    const durationMin = route.duration / 60;

    return {
      routeGeoJSON: {
        type: 'Feature',
        properties: {},
        geometry: route.geometry,
      },
      distanceText: distanceKm < 1
        ? `${Math.round(route.distance)} m`
        : `${distanceKm.toFixed(1)} km`,
      durationText: durationMin < 60
        ? `${Math.round(durationMin)} min`
        : `${Math.floor(durationMin / 60)} hr ${Math.round(durationMin % 60)} min`,
    };
  } catch (error) {
    console.error('Directions failed:', error);
    return null;
  }
}

/**
 * Search for place suggestions (autocomplete) using Mapbox Geocoding.
 */
export async function searchSuggestions(
  query: string,
  proximity?: LatLng
): Promise<SearchSuggestion[]> {
  if (!query || query.length < 2) return [];

  try {
    const token = getToken();
    let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=5&types=poi,place,address`;
    if (proximity) {
      url += `&proximity=${proximity.lng},${proximity.lat}`;
    }

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    return (data.features || []).map((f: any) => {
      const [lng, lat] = f.center;
      return {
        placeId: f.id || '',
        name: f.text || '',
        address: f.place_name || '',
        location: { lat, lng },
      };
    });
  } catch {
    return [];
  }
}

// ── Recent searches ─────────────────────────────────────────────────────────────

export function saveRecentSearch(query: string, result: GeocodedLocation): void {
  try {
    const searches = getRecentSearches().filter(
      (s) => s.query.toLowerCase() !== query.toLowerCase()
    );
    searches.unshift({ query, result, timestamp: Date.now() });
    localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES))
    );
  } catch {
    // ignore
  }
}

export function getRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearRecentSearches(): void {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

// ── Utilities ───────────────────────────────────────────────────────────────────

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
