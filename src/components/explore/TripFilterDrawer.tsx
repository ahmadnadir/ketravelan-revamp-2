import { useState, useEffect, useRef } from "react";
import { MapPin, Search, X, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { BudgetRangeSelector, isDefaultBudgetRange } from "./BudgetTierSelector";
import { TravelStylePills } from "./TravelStylePills";
import type { TripCategoryId } from "@/data/categories";

// Mock destinations for autocomplete
const mockDestinations = [
  { name: "Kyoto, Japan", region: "Kansai Region" },
  { name: "Vietnam", region: "Southeast Asia" },
  { name: "Dolomites, Italy", region: "Northern Italy" },
  { name: "Thailand", region: "Southeast Asia" },
  { name: "Bali, Indonesia", region: "Indonesia" },
  { name: "Langkawi, Malaysia", region: "Kedah" },
  { name: "Cameron Highlands, Malaysia", region: "Pahang" },
  { name: "Kuala Lumpur, Malaysia", region: "Federal Territory" },
  { name: "Singapore", region: "Southeast Asia" },
  { name: "Seoul, South Korea", region: "South Korea" },
  { name: "Tokyo, Japan", region: "Kanto Region" },
  { name: "Phuket, Thailand", region: "Southern Thailand" },
  { name: "Penang, Malaysia", region: "Penang" },
];

export interface FilterState {
  destination: string;
  dates: DateRange | undefined;
  flexibleDates: boolean;
  budgetRange: [number, number];
  categories: TripCategoryId[];
  currency?: string;
}

interface TripFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  onReset: () => void;
  matchingCount: number;
}

export function TripFilterDrawer({
  open,
  onOpenChange,
  filters,
  onApply,
  onReset,
  matchingCount,
}: TripFilterDrawerProps) {
  const isMobile = useIsMobile();

  // Local state for editing
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [destinationQuery, setDestinationQuery] = useState("");
  const [showDestinationResults, setShowDestinationResults] = useState(false);
  const destinationRef = useRef<HTMLDivElement>(null);

  // Sync local state when drawer opens
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
      setDestinationQuery("");
      setShowDestinationResults(false);
    }
  }, [open, filters]);

  // Click outside handler for destination dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (destinationRef.current && !destinationRef.current.contains(e.target as Node)) {
        setShowDestinationResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredDestinations = destinationQuery
    ? mockDestinations.filter(
        (d) =>
          d.name.toLowerCase().includes(destinationQuery.toLowerCase()) ||
          d.region.toLowerCase().includes(destinationQuery.toLowerCase())
      )
    : mockDestinations;

  const handleSelectDestination = (name: string) => {
    setLocalFilters((prev) => ({ ...prev, destination: name }));
    setDestinationQuery("");
    setShowDestinationResults(false);
  };

  const handleRemoveDestination = () => {
    setLocalFilters((prev) => ({ ...prev, destination: "" }));
  };

  const handleApply = () => {
    onApply(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    const resetState: FilterState = {
      destination: "",
      dates: undefined,
      flexibleDates: false,
      budgetRange: [0, 10000],
      categories: [],
    };
    setLocalFilters(resetState);
    onReset();
  };

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return null;
    if (!range.to) return format(range.from, "d MMM yyyy");
    return `${format(range.from, "d MMM")} – ${format(range.to, "d MMM yyyy")}`;
  };

  const content = (
    <div className="flex-1 overflow-y-auto px-4">
      <div className="space-y-6 pb-6">
        {/* Section 1: Destination */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 animate-fade-in" style={{ animationDelay: "0ms", animationFillMode: "backwards" }}>
          <h3 className="text-sm font-semibold text-foreground">Destination</h3>
          
          {localFilters.destination ? (
            <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground flex-1">
                {localFilters.destination}
              </span>
              <button
                type="button"
                onClick={handleRemoveDestination}
                className="p-1 hover:bg-secondary rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div ref={destinationRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={destinationQuery}
                  onChange={(e) => {
                    setDestinationQuery(e.target.value);
                    setShowDestinationResults(true);
                  }}
                  onPointerDown={() => setShowDestinationResults(true)}
                  placeholder="Search city, country, or region"
                  className="rounded-xl pl-10 text-sm"
                />
              </div>

              {showDestinationResults && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-[200px] overflow-y-auto">
                  {filteredDestinations.length > 0 ? (
                    filteredDestinations.map((dest) => (
                      <button
                        key={dest.name}
                        type="button"
                        onClick={() => handleSelectDestination(dest.name)}
                        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-accent transition-colors text-left"
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{dest.name}</p>
                          <p className="text-xs text-muted-foreground">{dest.region}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-center">
                      <p className="text-sm text-muted-foreground">No destinations found</p>
                      {destinationQuery && (
                        <button
                          type="button"
                          onClick={() => handleSelectDestination(destinationQuery)}
                          className="mt-2 text-sm text-primary font-medium"
                        >
                          Use "{destinationQuery}" anyway
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Dates */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 animate-fade-in" style={{ animationDelay: "75ms", animationFillMode: "backwards" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Dates</h3>
            {!localFilters.flexibleDates && localFilters.dates?.from && (
              <span className="text-xs text-primary font-medium">
                {formatDateRange(localFilters.dates)}
              </span>
            )}
          </div>
          
          {/* Flexible dates toggle */}
          <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Flexible dates</p>
                <p className="text-xs text-muted-foreground">I'm open to any dates</p>
              </div>
            </div>
            <Switch
              checked={localFilters.flexibleDates}
              onCheckedChange={(checked) => 
                setLocalFilters((prev) => ({ 
                  ...prev, 
                  flexibleDates: checked,
                  dates: checked ? undefined : prev.dates 
                }))
              }
            />
          </div>

          {/* Calendar - only show when not flexible */}
          {!localFilters.flexibleDates && (
            <div className="flex justify-center">
              <Calendar
                mode="range"
                selected={localFilters.dates}
                onSelect={(dates) => setLocalFilters((prev) => ({ ...prev, dates }))}
                numberOfMonths={1}
                disabled={(date) => date < new Date()}
                className="rounded-xl border border-border pointer-events-auto"
              />
            </div>
          )}
        </div>

        {/* Section 3: Budget */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 animate-fade-in" style={{ animationDelay: "150ms", animationFillMode: "backwards" }}>
          <h3 className="text-sm font-semibold text-foreground">Budget</h3>
          <BudgetRangeSelector
            value={localFilters.budgetRange}
            onChange={(range) => setLocalFilters((prev) => ({ ...prev, budgetRange: range }))}
          />
        </div>

        {/* Section 4: Travel Style */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 animate-fade-in" style={{ animationDelay: "225ms", animationFillMode: "backwards" }}>
          <h3 className="text-sm font-semibold text-foreground">Travel Style</h3>
          <TravelStylePills
            selected={localFilters.categories}
            onChange={(categories) => setLocalFilters((prev) => ({ ...prev, categories }))}
          />
        </div>
      </div>
    </div>
  );

  const footer = (
    <div className="flex gap-3 p-4 border-t border-border bg-background">
      <Button
        variant="outline"
        className="flex-1"
        onClick={handleReset}
      >
        Reset
      </Button>
      <Button className="flex-1" onClick={handleApply}>
        Apply Filters ({matchingCount} trips)
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] flex flex-col overflow-hidden">
          <DrawerHeader className="border-b border-border pb-4">
            <DrawerTitle>Filter Trips</DrawerTitle>
          </DrawerHeader>
          {content}
          <DrawerFooter className="p-0">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[440px] flex flex-col p-0">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle>Filter Trips</SheetTitle>
        </SheetHeader>
        {content}
        <SheetFooter className="p-0 mt-auto">
          {footer}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
