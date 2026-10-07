import { useEffect, useRef, useState } from 'react';
import { MapPin, Plus, X, GripVertical, ArrowRight, Search, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { searchLocations, type LocationResult } from '@/lib/locationApi';

interface RouteBuilderProps {
  stops: string[];
  onChange: (stops: string[]) => void;
  onStopsDetailsChange?: (details: Array<{ name: string; place?: string; state?: string; country?: string }>) => void;
  primaryDestination: string;
}

// Mock destinations for quick add
const popularStops = [
  'Thailand',
  'Vietnam', 
  'Laos',
  'Cambodia',
  'Singapore',
  'Bali',
];

export function RouteBuilder({ stops, onChange, onStopsDetailsChange, primaryDestination }: RouteBuilderProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newStop, setNewStop] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const draggedIndexRef = useRef<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number; width: number } | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [stopsDetails, setStopsDetails] = useState<Array<{ name: string; place?: string; state?: string; country?: string }>>([]);
  const activeSearchSeqRef = useRef(0);

  const handleStopPointerDown = (event: React.PointerEvent<HTMLButtonElement>, index: number) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rowWidth = event.currentTarget.closest<HTMLElement>("[data-stop-index]")?.getBoundingClientRect().width ?? 280;
    draggedIndexRef.current = index;
    dropIndexRef.current = index;
    setDraggedIndex(index);
    setDropIndex(index);
    setDragPosition({ x: event.clientX, y: event.clientY, width: rowWidth });
  };

  const handleStopPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (draggedIndexRef.current === null) return;
    setDragPosition((current) => current ? { ...current, x: event.clientX, y: event.clientY } : current);

    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-stop-index]");
    if (!target) return;

    const targetIndex = Number(target.dataset.stopIndex);
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= stops.length) return;
    const bounds = target.getBoundingClientRect();
    const nextDropIndex = targetIndex + (event.clientY >= bounds.top + bounds.height / 2 ? 1 : 0);
    dropIndexRef.current = nextDropIndex;
    setDropIndex(nextDropIndex);
  };

  const handleStopPointerEnd = (shouldCommit: boolean) => {
    const from = draggedIndexRef.current;
    const insertionIndex = dropIndexRef.current;
    if (shouldCommit && from !== null && insertionIndex !== null) {
      const to = insertionIndex > from ? insertionIndex - 1 : insertionIndex;
      if (to !== from) moveStop(from, to);
    }
    draggedIndexRef.current = null;
    dropIndexRef.current = null;
    setDraggedIndex(null);
    setDropIndex(null);
    setDragPosition(null);
  };

  const addStop = (stop: string, locationData?: LocationResult) => {
    if (stop.trim() && !stops.includes(stop.trim())) {
      const newStops = [...stops, stop.trim()];
      onChange(newStops);
      
      // Store location details if available
      const detail = {
        name: stop.trim(),
        place: locationData ? locationData.displayName.split(',')[0].trim() : stop.trim(),
        state: locationData?.region,
        country: locationData?.country,
      };
      const newDetails = [...stopsDetails, detail];
      setStopsDetails(newDetails);
      onStopsDetailsChange?.(newDetails);
    }
    setNewStop('');
    setIsAdding(false);
    setShowSuggestions(false);
    setSearchResults([]);
    setIsSearching(false);
    activeSearchSeqRef.current += 1;
  };

  const removeStop = (index: number) => {
    onChange(stops.filter((_, i) => i !== index));
    setStopsDetails(stopsDetails.filter((_, i) => i !== index));
    onStopsDetailsChange?.(stopsDetails.filter((_, i) => i !== index));
  };

  const moveStop = (from: number, to: number) => {
    if (to < 0 || to >= stops.length) return;
    const newStops = [...stops];
    const [removed] = newStops.splice(from, 1);
    newStops.splice(to, 0, removed);
    onChange(newStops);
    
    // Also reorder details
    const newDetails = [...stopsDetails];
    const [removedDetail] = newDetails.splice(from, 1);
    newDetails.splice(to, 0, removedDetail);
    setStopsDetails(newDetails);
    onStopsDetailsChange?.(newDetails);
  };

  // Search locations as user types
  const handleStopSearch = (query: string) => {
    setNewStop(query);
  };

  useEffect(() => {
    const query = newStop.trim();

    if (!isAdding || query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const seq = ++activeSearchSeqRef.current;
    setIsSearching(true);

    const timeout = window.setTimeout(async () => {
      try {
        const results = await searchLocations(query);
        if (activeSearchSeqRef.current !== seq) return;
        setSearchResults(results);
      } catch (error) {
        if (activeSearchSeqRef.current !== seq) return;
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        if (activeSearchSeqRef.current === seq) {
          setIsSearching(false);
        }
      }
    }, 280);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isAdding, newStop]);

  const filteredSuggestions = popularStops.filter(
    s => 
      !stops.includes(s) && 
      s !== primaryDestination &&
      s.toLowerCase().includes(newStop.toLowerCase())
  );

  if (stops.length === 0 && !isAdding) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsAdding(true)}
        className="w-full justify-start gap-2 rounded-xl border-dashed text-muted-foreground"
      >
        <Plus className="h-4 w-4" />
        Add stop
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Route visualization */}
      {(stops.length > 0 || primaryDestination) && (
        <div className="flex items-center gap-2 flex-wrap text-sm">
          {primaryDestination && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-full font-medium">
              <MapPin className="h-3.5 w-3.5" />
              {primaryDestination}
            </span>
          )}
          {stops.map((stop, index) => (
            <div key={index} className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-foreground rounded-full">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {stop}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Stop list for editing */}
      {stops.length > 0 && (
        <div className="space-y-2">
          {stops.map((stop, index) => {
            const detail = stopsDetails[index];
            return (
              <div
                key={index}
                data-stop-index={index}
                className={cn(
                  "relative flex items-center gap-2 p-2 bg-secondary/50 rounded-xl group",
                  draggedIndex === index && "opacity-30 border border-dashed border-primary/60"
                )}
              >
                {draggedIndex !== null && draggedIndex !== index && dropIndex === index && (
                  <span className="absolute inset-x-2 top-0 z-10 h-0.5 rounded-full bg-primary" />
                )}
                {draggedIndex !== null && draggedIndex !== index && dropIndex === index + 1 && (
                  <span className="absolute inset-x-2 bottom-0 z-10 h-0.5 rounded-full bg-primary" />
                )}
                <button
                  type="button"
                  aria-label={`Reorder stop ${stop}`}
                  onPointerDown={(event) => handleStopPointerDown(event, index)}
                  onPointerMove={handleStopPointerMove}
                  onPointerUp={() => handleStopPointerEnd(true)}
                  onPointerCancel={() => handleStopPointerEnd(false)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      moveStop(index, index - 1);
                    } else if (event.key === "ArrowDown") {
                      event.preventDefault();
                      moveStop(index, index + 1);
                    }
                  }}
                  className="p-1 touch-none cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{stop}</p>
                  {detail?.state && (
                    <p className="text-xs text-muted-foreground">{detail.state}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => moveStop(index, index - 1)}
                    disabled={index === 0}
                    className="p-1 hover:bg-secondary rounded disabled:opacity-30"
                  >
                    <span className="text-xs">↑</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStop(index, index + 1)}
                    disabled={index === stops.length - 1}
                    className="p-1 hover:bg-secondary rounded disabled:opacity-30"
                  >
                    <span className="text-xs">↓</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeStop(index)}
                  className="p-1 hover:bg-destructive/10 rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      )}

        {draggedIndex !== null && dragPosition && stops[draggedIndex] && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-[120] flex items-center gap-2 rounded-xl border border-primary/40 bg-card px-2 py-2 shadow-xl ring-2 ring-primary/20"
            style={{
              left: Math.max(8, Math.min(dragPosition.x + 14, window.innerWidth - dragPosition.width - 8)),
              top: Math.max(8, Math.min(dragPosition.y + 14, window.innerHeight - 56)),
              width: dragPosition.width,
            }}
          >
            <GripVertical className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{stops[draggedIndex]}</p>
              {stopsDetails[draggedIndex]?.state && (
                <p className="truncate text-xs text-muted-foreground">{stopsDetails[draggedIndex].state}</p>
              )}
            </div>
          </div>
        )}

      {/* Add new stop */}
      {isAdding ? (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            {isSearching && (
              <Loader className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            )}
            <Input
              value={newStop}
              onChange={(e) => handleStopSearch(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults.length === 0) {
                  e.preventDefault();
                  addStop(newStop);
                } else if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewStop('');
                  setSearchResults([]);
                  setIsSearching(false);
                  activeSearchSeqRef.current += 1;
                }
              }}
              placeholder="Search city or country..."
              className="rounded-xl text-sm pl-10 pr-10"
              autoFocus
            />
          </div>

          {showSuggestions && (
            <div className="absolute z-50 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden overflow-y-auto bottom-full mb-1 max-h-[180px] sm:bottom-auto sm:top-full sm:mt-1 sm:mb-0 sm:max-h-[240px]">
              {searchResults.length > 0 ? (
                searchResults.slice(0, 8).map((result, idx) => (
                  <button
                    key={`${result.displayName}-${idx}`}
                    type="button"
                    onClick={() => addStop(result.displayName.split(',')[0].trim(), result)}
                    className={cn(
                      "w-full px-4 py-2.5 flex items-center gap-2 hover:bg-accent transition-colors text-left text-sm border-b border-border/50 last:border-b-0"
                    )}
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{result.displayName.split(',')[0]}</p>
                      {result.region && (
                        <p className="text-xs text-muted-foreground truncate">{result.region}</p>
                      )}
                    </div>
                  </button>
                ))
              ) : newStop.length >= 2 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">No locations found</p>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              size="sm"
              onClick={() => addStop(newStop)}
              disabled={!newStop.trim()}
              className="rounded-lg"
            >
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAdding(false);
                setNewStop('');
                setSearchResults([]);
                setIsSearching(false);
                activeSearchSeqRef.current += 1;
              }}
              className="rounded-lg"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="gap-2 rounded-xl border-dashed"
        >
          <Plus className="h-4 w-4" />
          Add another stop
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        For cross-border or multi-city trips. You can refine later.
      </p>
    </div>
  );
}
