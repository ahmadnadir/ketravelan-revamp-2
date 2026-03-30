/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Location API service for destination search
 * Uses Nominatim (OpenStreetMap) for free geocoding
 */

export interface LocationResult {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  type: string;
  country?: string;
  region?: string;
}

const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';

// Higher number = lower priority in results
const PLACE_PRIORITY: Record<string, number> = {
  country: 0,
  state: 1,
  city: 1,
  municipality: 1,
  town: 2,
  village: 3,
  administrative: 2,
  county: 2,
  district: 3,
  suburb: 4,
  neighbourhood: 5,
  quarter: 5,
};

/**
 * Search for locations using Nominatim API
 * Uses addressdetails + Accept-Language: en to reliably return
 * English names for cities like Osaka, Kyoto, Nagoya, etc.
 */
export async function searchLocations(query: string): Promise<LocationResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      limit: '15',
      addressdetails: '1',
      dedupe: '1',
    });

    const response = await fetch(`${NOMINATIM_API}?${params}`, {
      headers: {
        'Accept': 'application/json',
        // Force English names — critical for Japanese/CJK cities
        'Accept-Language': 'en',
        'User-Agent': 'Ketravelan App (contact: support@ketravelan.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`Location API error: ${response.statusText}`);
    }

    const results = await response.json();

    const mapped: (LocationResult & { _priority: number })[] = results
      .filter((result: any) => result.lat && result.lon)
      .map((result: any) => {
        const addr = result.address || {};

        // Prefer structured address fields over comma-splitting display_name
        const cityName =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.county ||
          addr.state_district ||
          result.name ||
          '';

        const stateName =
          addr.state ||
          addr.state_district ||
          addr.county ||
          '';

        const countryName = addr.country || '';

        // Build a clean "City, Country" display name
        const cleanDisplay = [cityName, countryName].filter(Boolean).join(', ');

        const placeType: string = result.type || result.category || '';

        return {
          name: cityName,
          displayName: cleanDisplay || result.display_name,
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          type: placeType,
          country: countryName,
          region: stateName,
          _priority: PLACE_PRIORITY[placeType] ?? 4,
        };
      });

    // Deduplicate by "city|country" key, keeping highest-priority entry
    const seen = new Map<string, LocationResult & { _priority: number }>();
    for (const item of mapped) {
      const key = `${item.name}|${item.country}`.toLowerCase();
      const existing = seen.get(key);
      if (!existing || item._priority < existing._priority) {
        seen.set(key, item);
      }
    }

    return Array.from(seen.values())
      .sort((a, b) => a._priority - b._priority)
      .slice(0, 10)
      .map(({ _priority: _, ...rest }) => rest);
  } catch (error) {
    console.error('Location search error:', error);
    // Return empty array on error, don't crash
    return [];
  }
}

/**
 * Get location details (coordinates, address, etc.)
 */
export async function getLocationDetails(latitude: number, longitude: number): Promise<LocationResult | null> {
  try {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      format: 'json',
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Ketravelan App (contact: support@ketravelan.com)',
      },
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    const parts = result.display_name.split(',').map((p: string) => p.trim());
    const country = parts[parts.length - 1];
    const region = parts[parts.length - 2];
    const city = parts[0];

    return {
      name: city || result.name,
      displayName: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      type: result.type || 'location',
      country,
      region,
    };
  } catch (error) {
    console.error('Location details error:', error);
    return null;
  }
}

/**
 * Autocomplete suggestions for location search
 */
export async function getLocationSuggestions(query: string): Promise<LocationResult[]> {
  return searchLocations(query);
}
