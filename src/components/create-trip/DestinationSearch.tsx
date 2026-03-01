import { useState, useRef, useEffect } from 'react';
import { MapPin, X, Search, Loader } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { searchLocations, type LocationResult } from '@/lib/locationApi';

interface DestinationSearchProps {
  value: string;
  onChange: (value: string, locationData?: { place: string; state?: string; country?: string; displayName?: string }) => void;
  placeholder?: string;
  helperText?: string;
}

// Mock destinations for offline fallback
const mockDestinations = [
  { name: 'Kyoto, Japan', region: 'Kansai Region' },
  { name: 'Vietnam', region: 'Southeast Asia' },
  { name: 'Dolomites, Italy', region: 'Northern Italy' },
  { name: 'Thailand', region: 'Southeast Asia' },
  { name: 'Bali, Indonesia', region: 'Indonesia' },
  { name: 'Langkawi, Malaysia', region: 'Kedah' },
  { name: 'Cameron Highlands, Malaysia', region: 'Pahang' },
  { name: 'Kuala Lumpur, Malaysia', region: 'Federal Territory' },
  { name: 'Singapore', region: 'Southeast Asia' },
  { name: 'Seoul, South Korea', region: 'South Korea' },
  { name: 'Tokyo, Japan', region: 'Kanto Region' },
  { name: 'Laos', region: 'Southeast Asia' },
  { name: 'Maldives', region: 'Indian Ocean' },
  { name: 'Phuket, Thailand', region: 'Southern Thailand' },
  { name: 'Penang, Malaysia', region: 'Penang' },
];

export function DestinationSearch({
  value,
  onChange,
  placeholder = 'Search city, country, or region',
  helperText,
}: DestinationSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<LocationResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced search with location API
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const locationResults = await searchLocations(query);
        
        // Keep full location results for passing to onChange
        setResults(locationResults);
      } catch (error) {
        console.error('Search error:', error);
        // Fallback to mock data on error
        const filtered = mockDestinations.filter(
          d =>
            d.name.toLowerCase().includes(query.toLowerCase()) ||
            d.region.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered as any);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (destination: string, locationData?: any) => {
    if (locationData && 'displayName' in locationData) {
      // Real API result
      onChange(destination, {
        place: locationData.displayName.split(',')[0].trim(),
        state: locationData.region,
        country: locationData.country,
        displayName: locationData.displayName,
      });
    } else if (locationData && 'region' in locationData) {
      // Mock data result
      onChange(destination, {
        place: destination,
        state: locationData.region,
      });
    } else {
      // Custom input
      onChange(destination);
    }
    setQuery('');
    setIsOpen(false);
  };

  const handleRemove = () => {
    onChange('');
  };

  if (value) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground flex-1">{value}</span>
          <button
            type="button"
            onClick={handleRemove}
            className="p-1 hover:bg-secondary rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        {helperText && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        {isLoading && (
          <Loader className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="rounded-xl pl-10 pr-10 text-sm"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-[240px] overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-6 flex items-center justify-center">
              <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((result, idx) => {
              // Handle both LocationResult and mock format
              const isApiResult = 'displayName' in result;
              const place = isApiResult 
                ? result.displayName.split(',')[0].trim() 
                : (result as any).name;
              const region = isApiResult 
                ? result.region 
                : (result as any).region;
              
              return (
                <button
                  key={`${place}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(place, result)}
                  className={cn(
                    "w-full px-4 py-3 flex items-start gap-3 hover:bg-accent transition-colors text-left border-b border-border/50 last:border-b-0"
                  )}
                >
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{place}</p>
                    {region && (
                      <p className="text-xs text-muted-foreground truncate">{region}</p>
                    )}
                  </div>
                </button>
              );
            })
          ) : query.length > 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No destinations found</p>
              <button
                type="button"
                onClick={() => handleSelect(query)}
                className="mt-2 text-sm text-primary font-medium hover:underline"
              >
                Use "{query}" anyway
              </button>
            </div>
          ) : null}
        </div>
      )}

      {helperText && !isOpen && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
