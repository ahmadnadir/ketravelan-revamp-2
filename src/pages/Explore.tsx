/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MapPin, SlidersHorizontal } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { TripCard } from "@/components/shared/TripCard";
import { TripCardLoading } from "@/components/shared/TripCardLoading";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { Button } from "@/components/ui/button";
import { tripCategories } from "@/data/categories";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTrips } from "@/hooks/useTrips";

import { TripFilterDrawer, type FilterState } from "@/components/explore/TripFilterDrawer";
import { AppliedFiltersBar } from "@/components/explore/AppliedFiltersBar";
import { isDefaultBudgetRange, formatBudgetRange } from "@/components/explore/BudgetTierSelector";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { useAuth } from "@/contexts/AuthContext";
import { convertPrice, getCurrencySymbol } from "@/lib/currencyUtils";

const defaultFilters: FilterState = {
  destination: "",
  dates: undefined,
  flexibleDates: false,
  budgetRange: [0, 10000],
  categories: [],
  currency: "MYR",
};

export default function Explore() {
  const isLoading = useSimulatedLoading(600);
  const { homeCurrency } = useAuth();
  const [tab, setTab] = useState("upcoming");
  const [searchParams, setSearchParams] = useSearchParams();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [convertedPrices, setConvertedPrices] = useState<Record<string, number>>({});

  // Applied filter state (affects results)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilters);

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.destination) count++;
    if (appliedFilters.flexibleDates || appliedFilters.dates?.from) count++;
    if (!isDefaultBudgetRange(appliedFilters.budgetRange)) count++;
    count += appliedFilters.categories.length;
    if ((appliedFilters as any).currency && (appliedFilters as any).currency !== "MYR") count++;
    return count;
  }, [appliedFilters]);

  const hasActiveFilters = activeFilterCount > 0;

  // Build query filters
  const queryFilters = useMemo(() => {
    const filters: any = {
      destination: appliedFilters.destination || undefined,
      maxPrice: appliedFilters.budgetRange[1],
    };
    if (appliedFilters.budgetRange[0] > 0) {
      filters.minPrice = appliedFilters.budgetRange[0];
    }
    return filters;
  }, [appliedFilters]);

  // Fetch trips with React Query
  const { data: trips = [], error } = useTrips(queryFilters, {
    refetchOnMount: "always",
    staleTime: 0,
  });

  // Convert prices asynchronously whenever trips or currency changes
  useEffect(() => {
    const convertPrices = async () => {
      const priceMap: Record<string, number> = {};
      for (const trip of trips) {
        if (typeof trip.price === 'number') {
          priceMap[trip.id] = await convertPrice(trip.price, homeCurrency);
        }
      }
      setConvertedPrices(priceMap);
    };
    
    if (trips.length > 0) {
      convertPrices();
    }
  }, [trips, homeCurrency]);

  // Handle errors
  if (error) {
    console.error('Error loading trips:', error);
    toast.error('Failed to load trips');
  }

  // Map trips data
  const mappedTrips = useMemo(() => {
    return (trips || []).map((trip: any) => {
      const maxParticipants = trip.max_participants ?? 0;
      const currentParticipants = trip.current_participants ?? 0;
      let slotsLeft = maxParticipants - currentParticipants;
      if (isNaN(slotsLeft)) slotsLeft = 0;
      // Fallbacks for missing fields
      const hasStartDate = !!trip.start_date;
      const hasEndDate = !!trip.end_date;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDateRaw = hasStartDate ? new Date(trip.start_date) : null;
      const endDateRaw = hasEndDate ? new Date(trip.end_date) : null;
      const isOngoing = !!startDateRaw && !!endDateRaw && startDateRaw <= today && endDateRaw >= today;
      const hasPrice = typeof trip.price === 'number' && !isNaN(trip.price);
      return {
        id: trip.id ?? '',
        title: trip.title ?? 'Untitled',
        destination: trip.destination ?? 'Unknown',
        imageUrl: trip.cover_image || '/placeholder.svg',
        startDate: hasStartDate ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA',
        endDate: hasEndDate ? new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA',
        rawStartDate: trip.start_date,
        rawEndDate: trip.end_date,
        isOngoing,
        price: hasPrice ? trip.price : null,
        slotsLeft,
        totalSlots: maxParticipants,
        tags: Array.isArray(trip.tags) ? trip.tags : [],
        isAlmostFull: slotsLeft > 0 && slotsLeft <= 2,
        tripType: trip.type ?? undefined,
        slug: trip.slug ?? undefined,
        visibility: trip.visibility || 'public',
      };
    });
  }, [trips]);

  // Filter trips based on applied filters and date
  const filteredTrips = useMemo(() => {
    return mappedTrips.filter((trip) => {
      // Destination match
      const destinationMatch =
        !appliedFilters.destination ||
        trip.title.toLowerCase().includes(appliedFilters.destination.toLowerCase()) ||
        trip.destination.toLowerCase().includes(appliedFilters.destination.toLowerCase());

      // Category match
      const categoryMatch =
        appliedFilters.categories.length === 0 ||
        appliedFilters.categories.some((catId) => {
          const category = tripCategories.find((c) => c.id === catId);
          return trip.tags?.includes(category?.label || "");
        });

      // Budget match
      const [minBudget, maxBudget] = appliedFilters.budgetRange;
      const budgetMatch = typeof trip.price === 'number' && trip.price >= minBudget && trip.price <= maxBudget;

      return destinationMatch && categoryMatch && budgetMatch;
    });
  }, [mappedTrips, appliedFilters]);

  // Separate trips into upcoming and past based on current tab
  const { upcomingTrips, pastTrips } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Upcoming: include TBA trips, future trips, and trips currently in progress
    const upcoming = filteredTrips.filter((trip) => {
      if (!trip.rawStartDate) return true; // Show TBA trips as upcoming
      const startDate = new Date(trip.rawStartDate);
      const endDate = trip.rawEndDate ? new Date(trip.rawEndDate) : null;
      if (endDate && endDate < today) return false;
      return startDate >= today || (endDate ? endDate >= today : false);
    });

    const past = filteredTrips.filter((trip) => {
      if (!trip.rawEndDate) return false;
      const endDate = new Date(trip.rawEndDate);
      return endDate < today;
    });

    return { upcomingTrips: upcoming, pastTrips: past };
  }, [filteredTrips]);

  // Get trips to display based on current tab
  const displayedTrips = tab === "upcoming" ? upcomingTrips : pastTrips;

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "upcoming" || tabParam === "past") {
      setTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = useCallback((value: string) => {
    setTab(value);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", value);
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleApplyFilters = useCallback((filters: FilterState) => {
    setAppliedFilters(filters);

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const handleReset = useCallback(() => {
    setAppliedFilters(defaultFilters);
  }, []);

  const handleSearchTrips = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  // Display text for the search bar
  const searchDisplayText = appliedFilters.destination || "Where do you want to go?";

  return (
    <AppLayout>
      <div className="py-6 sm:py-6 space-y-5 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          Discover Trips
        </h1>

        {/* Minimal Control Bar */}
        <div className="bg-card rounded-xl p-5 space-y-4">
          {/* Search Bar Row */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex-1 flex items-center gap-3 p-4 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors text-left"
            >
              <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className={cn(
                "text-sm truncate",
                appliedFilters.destination ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {searchDisplayText}
              </span>
            </button>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="relative p-4 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
            >
              <SlidersHorizontal className="h-5 w-5 text-foreground" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Applied Filters Summary */}
          {hasActiveFilters && (
            <AppliedFiltersBar
              destination={appliedFilters.destination}
              dates={appliedFilters.dates}
              flexibleDates={appliedFilters.flexibleDates}
              budgetRange={appliedFilters.budgetRange}
              categories={appliedFilters.categories}
              currency={appliedFilters.currency}
              onClear={handleReset}
              onEdit={() => setIsDrawerOpen(true)}
            />
          )}

          {/* Search Trips CTA */}
          <Button
            className="w-full rounded-xl h-14"
            onClick={handleSearchTrips}
            variant={hasActiveFilters ? "default" : "secondary"}
          >
            {hasActiveFilters ? `View ${filteredTrips.length} Trips` : "Search Trips"}
          </Button>
        </div>

        {/* Tabs */}
        <div ref={resultsRef}>
          <SegmentedControl
            options={[
              { label: "Upcoming", value: "upcoming", count: upcomingTrips.length },
              { label: "Past", value: "past", count: pastTrips.length },
            ]}
            value={tab}
            onChange={handleTabChange}
          />
        </div>

        {/* Results Header */}
        {!isLoading && (
          <div className="text-xs sm:text-sm">
            <span className="text-muted-foreground">
              Found {displayedTrips.length} {tab} trips
            </span>
          </div>
        )}

        {/* Trip List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {isLoading ? (
            // Show 6 loading skeletons for better perceived performance
            Array.from({ length: 6 }).map((_, i) => (
              <TripCardLoading key={i} />
            ))
          ) : displayedTrips.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <div className="text-muted-foreground">No {tab} trips found</div>
            </div>
          ) : (
            displayedTrips.map((trip) => (
              <TripCard
                key={trip.id}
                id={trip.id}
                title={trip.title}
                destination={trip.destination}
                imageUrl={trip.imageUrl}
                startDate={trip.startDate}
                endDate={trip.endDate}
                price={typeof trip.price === 'number' ? (convertedPrices[trip.id] ?? trip.price) : (trip.price as any)}
                displayCurrency={getCurrencySymbol(homeCurrency)}
                slotsLeft={trip.slotsLeft}
                totalSlots={trip.totalSlots}
                tags={trip.tags}
                isAlmostFull={trip.isAlmostFull}
                isOngoing={trip.isOngoing}
                tripType={trip.tripType}
                slug={trip.slug}
                isPrivate={trip.visibility === 'private'}
                returnTo="explore"
                returnTab={tab}
              />
            ))
          )}
        </div>
      </div>

      {/* Filter Drawer */}
      <TripFilterDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        filters={appliedFilters}
        onApply={handleApplyFilters}
        onReset={handleReset}
        matchingCount={filteredTrips.length}
      />
    </AppLayout>
  );
}
