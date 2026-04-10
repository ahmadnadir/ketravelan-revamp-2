import { LocationSearchResult, Location } from '../types/guided-trip';

const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'GuidedTripPlatform/1.0';

let searchController: AbortController | null = null;

export const searchLocations = async (query: string): Promise<Location[]> => {
  if (!query || query.length < 3) {
    return [];
  }

  if (searchController) {
    searchController.abort();
  }

  searchController = new AbortController();

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '5',
    });

    const response = await fetch(`${NOMINATIM_API_URL}?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
      signal: searchController.signal,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch locations');
    }

    const results: LocationSearchResult[] = await response.json();

    return results.map(result => ({
      place_name: extractPlaceName(result),
      formatted_address: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      country: result.address.country,
    }));
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return [];
    }
    console.error('Location search error:', error);
    return [];
  }
};

const extractPlaceName = (result: LocationSearchResult): string => {
  const { address } = result;

  if (address.city) {
    return address.city;
  }

  if (address.state) {
    return address.state;
  }

  const parts = result.display_name.split(',');
  return parts[0].trim();
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};
