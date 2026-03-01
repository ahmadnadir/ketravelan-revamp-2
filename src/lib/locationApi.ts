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

/**
 * Search for locations using Nominatim API
 */
export async function searchLocations(query: string): Promise<LocationResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '10',
      countrycodes: '', // Allow all countries
    });

    const response = await fetch(`${NOMINATIM_API}?${params}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Ketravelan App (contact: support@ketravelan.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`Location API error: ${response.statusText}`);
    }

    const results = await response.json();

    // Transform Nominatim results to our format
    return results
      .filter((result: any) => result.lat && result.lon)
      .map((result: any) => {
        // Parse the display name to extract city/region/country
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
      });
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
