import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { Location } from '../../types/guided-trip';
import { searchLocations, debounce } from '../../services/locationService';

interface LocationAutocompleteProps {
  selectedLocations: Location[];
  onAddLocation: (location: Location) => void;
  onRemoveLocation: (index: number) => void;
  error?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  selectedLocations,
  onAddLocation,
  onRemoveLocation,
  error,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const debouncedSearch = useRef(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 3) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const results = await searchLocations(searchQuery);
      setSuggestions(results);
      setIsLoading(false);
      setShowDropdown(true);
    }, 500)
  ).current;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setHighlightedIndex(-1);

    if (value.length >= 3) {
      setIsLoading(true);
      debouncedSearch(value);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleSelectLocation = (location: Location) => {
    const isDuplicate = selectedLocations.some(
      loc =>
        loc.place_name === location.place_name &&
        loc.country === location.country
    );

    if (!isDuplicate) {
      onAddLocation(location);
    }

    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectLocation(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowDropdown(true);
              }
            }}
            placeholder="Search for a location (e.g., Bali, Tokyo, Paris)..."
            className={`w-full pl-10 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
          )}
        </div>

        {showDropdown && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          >
            {suggestions.map((location, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectLocation(location)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                  highlightedIndex === index ? 'bg-gray-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {location.place_name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {location.formatted_address}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {showDropdown && !isLoading && query.length >= 3 && suggestions.length === 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4"
          >
            <p className="text-sm text-gray-500 text-center">
              No locations found. Try a different search term.
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {selectedLocations.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Selected Locations ({selectedLocations.length})
          </p>
          <div className="space-y-2">
            {selectedLocations.map((location, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {location.place_name}
                    </p>
                    {location.country && (
                      <p className="text-sm text-gray-600 truncate">
                        {location.country}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveLocation(index)}
                  className="flex-shrink-0 ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedLocations.length === 0 && (
        <p className="text-sm text-gray-400 italic">No locations added yet. Start typing to search.</p>
      )}
    </div>
  );
};
