/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MapPin, SlidersHorizontal, Search, X, Check, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { AppLayout } from "@/components/layout/AppLayout";
import { TripCard } from "@/components/shared/TripCard";
import { TripCardLoading } from "@/components/shared/TripCardLoading";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { tripCategories } from "@/data/categories";
import type { TripCategoryId } from "@/data/categories";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTrips } from "@/hooks/useTrips";

import { TripFilterDrawer, type FilterState } from "@/components/explore/TripFilterDrawer";
import { AppliedFiltersBar } from "@/components/explore/AppliedFiltersBar";
import { isDefaultBudgetRange, formatBudgetRange, BudgetRangeSelector } from "@/components/explore/BudgetTierSelector";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { convertPrice, getCurrencySymbol, getCurrencyInfo, type CurrencyCode } from "@/lib/currencyUtils";
import { searchLocations, type LocationResult } from "@/lib/locationApi";

const defaultFilters: FilterState = {
  destination: "",
  dates: undefined,
  flexibleDates: false,
  budgetRange: [0, 10000],
  categories: [],
  currency: "MYR",
};

type DesktopPanel = "where" | "when" | "budget" | "styles" | null;

export default function Explore() {
  const isLoading = useSimulatedLoading(600);
  const [searchParams, setSearchParams] = useSearchParams();
  // Persist tab in URL so it survives navigation away and back
  const tab = searchParams.get("tab") ?? "upcoming";
  const setTab = (value: string) =>
    setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set("tab", value); return p; }, { replace: true });
  const resultsRef = useRef<HTMLDivElement>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [convertedPrices, setConvertedPrices] = useState<Record<string, number>>({});

  // Desktop inline panel state
  const [activePanel, setActivePanel] = useState<DesktopPanel>(null);
  const [destQuery, setDestQuery] = useState("");
  const [destResults, setDestResults] = useState<LocationResult[]>([]);
  const [destLoading, setDestLoading] = useState(false);
  const destSearchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const desktopBarRef = useRef<HTMLDivElement>(null);

  // Debounced location search
  useEffect(() => {
    if (destSearchTimeoutRef.current) clearTimeout(destSearchTimeoutRef.current);
    if (destQuery.length < 2) { setDestResults([]); setDestLoading(false); return; }
    setDestLoading(true);
    destSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchLocations(destQuery);
        setDestResults(results);
      } catch {
        setDestResults([]);
      } finally {
        setDestLoading(false);
      }
    }, 300);
    return () => { if (destSearchTimeoutRef.current) clearTimeout(destSearchTimeoutRef.current); };
  }, [destQuery]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (desktopBarRef.current && !desktopBarRef.current.contains(e.target as Node)) {
        setActivePanel(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Applied filter state (affects results)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilters);
  const selectedCurrency = (appliedFilters.currency || "MYR") as CurrencyCode;

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
  const { data: trips = [], error, isFetching } = useTrips(queryFilters, {
    refetchOnMount: "always",
    staleTime: 0,
  });

  // Convert prices asynchronously whenever trips or currency changes
  useEffect(() => {
    const convertPrices = async () => {
      const priceMap: Record<string, number> = {};
      for (const trip of trips) {
        if (typeof trip.price === 'number') {
          priceMap[trip.id] = await convertPrice(trip.price, selectedCurrency);
        }
      }
      setConvertedPrices(priceMap);
    };
    
    if (trips.length > 0) {
      convertPrices();
    } else {
      setConvertedPrices({});
    }
  }, [trips, selectedCurrency]);

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
        requirements: Array.isArray(trip.requirements) ? trip.requirements : [],
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

      // Budget match — null-price trips always pass (can't compare what isn't set)
      const [minBudget, maxBudget] = appliedFilters.budgetRange;
      const budgetMatch =
        trip.price === null ||
        (typeof trip.price === 'number' && trip.price >= minBudget && trip.price <= maxBudget);

      // Date range match  trip must overlap with the selected range
      let dateMatch = true;
      if (!appliedFilters.flexibleDates && appliedFilters.dates?.from) {
        const filterFrom = appliedFilters.dates.from;
        const filterTo = appliedFilters.dates.to ?? appliedFilters.dates.from;
        const tripStart = trip.rawStartDate ? new Date(trip.rawStartDate) : null;
        const tripEnd = trip.rawEndDate ? new Date(trip.rawEndDate) : tripStart;
        if (tripStart && tripEnd) {
          // Overlap: trip starts before filter ends AND trip ends after filter starts
          dateMatch = tripStart <= filterTo && tripEnd >= filterFrom;
        }
      }

      return destinationMatch && categoryMatch && budgetMatch && dateMatch;
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
    <AppLayout wideLayout>
      <div className="py-6 sm:py-6 space-y-5 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          Discover Trips
        </h1>

        {/* ── Desktop Filter Bar (lg+) ── */}
        <div ref={desktopBarRef} className="hidden lg:block relative">
          {/* Main bar */}
          <div className="flex items-stretch bg-card rounded-2xl shadow-sm border border-border overflow-visible">
            {/* Where */}
            <button
              onClick={() => { setActivePanel(activePanel === "where" ? null : "where"); setDestQuery(""); }}
              className={cn(
                "flex-1 flex flex-col items-start px-5 py-3.5 transition-colors border-r border-border",
                activePanel === "where" ? "bg-secondary" : "hover:bg-secondary/60"
              )}
            >
              <span className="text-xs font-semibold text-foreground mb-0.5">Where</span>
              <span className={cn(
                "text-sm truncate max-w-[160px]",
                appliedFilters.destination ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {appliedFilters.destination || "Search destinations"}
              </span>
            </button>

            {/* When */}
            <button
              onClick={() => setActivePanel(activePanel === "when" ? null : "when")}
              className={cn(
                "flex-1 flex flex-col items-start px-5 py-3.5 transition-colors border-r border-border",
                activePanel === "when" ? "bg-secondary" : "hover:bg-secondary/60"
              )}
            >
              <span className="text-xs font-semibold text-foreground mb-0.5">When</span>
              <span className={cn(
                "text-sm",
                (appliedFilters.flexibleDates || appliedFilters.dates?.from) ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {appliedFilters.flexibleDates
                  ? "Flexible"
                  : appliedFilters.dates?.from
                    ? appliedFilters.dates.to
                      ? `${format(appliedFilters.dates.from, "MMM d")} – ${format(appliedFilters.dates.to, "MMM d")}`
                      : format(appliedFilters.dates.from, "MMM d, yyyy")
                    : "Add dates"}
              </span>
            </button>

            {/* Budget */}
            <button
              onClick={() => setActivePanel(activePanel === "budget" ? null : "budget")}
              className={cn(
                "flex-1 flex flex-col items-start px-5 py-3.5 transition-colors border-r border-border",
                activePanel === "budget" ? "bg-secondary" : "hover:bg-secondary/60"
              )}
            >
              <span className="text-xs font-semibold text-foreground mb-0.5">Budget</span>
              <span className={cn(
                "text-sm",
                !isDefaultBudgetRange(appliedFilters.budgetRange) ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {isDefaultBudgetRange(appliedFilters.budgetRange)
                  ? "Any budget"
                  : formatBudgetRange(appliedFilters.budgetRange, selectedCurrency)}
              </span>
            </button>

            {/* Travel Styles */}
            <button
              onClick={() => setActivePanel(activePanel === "styles" ? null : "styles")}
              className={cn(
                "flex-1 flex flex-col items-start px-5 py-3.5 transition-colors border-r border-border",
                activePanel === "styles" ? "bg-secondary" : "hover:bg-secondary/60"
              )}
            >
              <span className="text-xs font-semibold text-foreground mb-0.5">Travel Styles</span>
              <span className={cn(
                "text-sm truncate max-w-[160px]",
                appliedFilters.categories.length > 0 ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {appliedFilters.categories.length > 0
                  ? appliedFilters.categories.map(id => tripCategories.find(c => c.id === id)?.label).filter(Boolean).join(", ")
                  : "Any style"}
              </span>
            </button>

            {/* Filters button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="relative flex items-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors rounded-r-2xl"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 w-5 h-5 bg-white/25 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Inline dropdown panel */}
          {activePanel && (
            <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-card border border-border rounded-2xl shadow-xl z-50 p-5">
              {/* WHERE panel */}
              {activePanel === "where" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      autoFocus
                      value={destQuery}
                      onChange={e => setDestQuery(e.target.value)}
                      placeholder="Search city, country, or region…"
                      className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {destQuery && (
                      <button onClick={() => { setDestQuery(""); setDestResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  {appliedFilters.destination && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium flex-1">{appliedFilters.destination}</span>
                      <button onClick={() => setAppliedFilters(f => ({ ...f, destination: "" }))}>
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {destLoading ? (
                      <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span className="text-sm">Searching…</span>
                      </div>
                    ) : destQuery.length >= 2 && destResults.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No locations found</p>
                    ) : destQuery.length < 2 ? (
                      <p className="text-sm text-muted-foreground px-3 py-2">Start typing to search for a destination</p>
                    ) : (
                      destResults.map((result, i) => {
                        const primary = [result.name, result.country].filter(Boolean).join(", ");
                        const secondary = result.region || result.country || "";
                        return (
                          <button
                            key={i}
                            onClick={() => { setAppliedFilters(f => ({ ...f, destination: primary })); setDestQuery(""); setDestResults([]); setActivePanel(null); setTimeout(() => { resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100); }}
                            className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors text-left"
                          >
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium">{primary}</p>
                              {secondary && <p className="text-xs text-muted-foreground">{secondary}</p>}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* WHEN panel */}
              {activePanel === "when" && (
                <div className="flex flex-col gap-4">
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
                      checked={appliedFilters.flexibleDates}
                      onCheckedChange={checked =>
                        setAppliedFilters(f => ({ ...f, flexibleDates: checked, dates: checked ? undefined : f.dates }))
                      }
                    />
                  </div>

                  {/* Calendar  only when not flexible */}
                  {!appliedFilters.flexibleDates && (
                    <div className="flex flex-col items-center gap-3">
                      <Calendar
                        mode="range"
                        selected={appliedFilters.dates}
                        onSelect={(range: DateRange | undefined) => {
                          setAppliedFilters(f => ({ ...f, dates: range }));
                          if (range?.from && range?.to) {
                            setActivePanel(null);
                            setTimeout(() => { resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
                          }
                        }}
                        numberOfMonths={2}
                        className="rounded-xl"
                      />
                      {appliedFilters.dates?.from && (
                        <button
                          onClick={() => setAppliedFilters(f => ({ ...f, dates: undefined }))}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <X className="h-3 w-3" /> Clear dates
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* BUDGET panel */}
              {activePanel === "budget" && (
                <div className="max-w-md mx-auto py-2">
                  <BudgetRangeSelector
                    value={appliedFilters.budgetRange}
                    onChange={range => setAppliedFilters(f => ({ ...f, budgetRange: range }))}
                    currency={selectedCurrency}
                  />
                </div>
              )}

              {/* TRAVEL STYLES panel */}
              {activePanel === "styles" && (
                <div className="flex flex-wrap gap-2">
                  {tripCategories.map(cat => {
                    const isSelected = appliedFilters.categories.includes(cat.id as TripCategoryId);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setAppliedFilters(f => ({
                            ...f,
                            categories: isSelected
                              ? f.categories.filter(c => c !== cat.id)
                              : [...f.categories, cat.id as TripCategoryId],
                          }));
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm transition-all border",
                          isSelected
                            ? "bg-foreground text-background border-foreground"
                            : "bg-secondary text-foreground hover:bg-secondary/80 border-transparent"
                        )}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Mobile Filter Card (hidden on lg+) ── */}
        <div className="lg:hidden bg-card rounded-xl p-5 space-y-4">
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
              { label: "Upcoming", value: "upcoming" },
              { label: "Past", value: "past" },
            ]}
            value={tab}
            onChange={handleTabChange}
          />
        </div>

        {/* Results Header */}
        {!isLoading && !isFetching && (
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">
              Found {displayedTrips.length} {tab} trip{displayedTrips.length !== 1 ? "s" : ""}
            </span>
            <span className="text-muted-foreground hidden sm:block">
              Showing prices in {getCurrencyInfo(selectedCurrency)?.name ?? selectedCurrency} ({getCurrencySymbol(selectedCurrency)})
            </span>
          </div>
        )}

        {/* Trip List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {isLoading || isFetching ? (
            // Show skeletons during initial load and filter-triggered refetches
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
                displayCurrency={getCurrencySymbol(selectedCurrency)}
                slotsLeft={trip.slotsLeft}
                totalSlots={trip.totalSlots}
                tags={trip.tags}
                isAlmostFull={trip.isAlmostFull}
                isOngoing={trip.isOngoing}
                tripType={trip.tripType}
                slug={trip.slug}
                isPrivate={trip.visibility === 'private'}
                requirements={trip.requirements}
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
