import { useCommunity } from "@/contexts/CommunityContext";
import { DiscussionCard } from "./DiscussionCard";
import { LocationFilter } from "./LocationFilter";
import { TopicFilter } from "./TopicFilter";
import { MessageSquarePlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import lookup from "country-code-lookup";

interface DiscussionsFeedProps {
  onAskQuestion?: () => void;
}

export function DiscussionsFeed({ onAskQuestion }: DiscussionsFeedProps) {
  const { filteredDiscussions, filters, setDiscussionSearchQuery, setLocationFilter, isDiscussionsLoading } = useCommunity();
  const { isAuthenticated } = useAuth();

  // Auto-detect user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Use reverse geocoding to get country name
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            const countryName = data.address?.country || data.country || "";
            
            if (countryName) {
              // Map country names to common travel destination formats
              const countryMap: Record<string, string> = {
                "Malaysia": "Malaysia",
                "Indonesia": "Indonesia",
                "United States": "United States",
                "Singapore": "Singapore",
                "Thailand": "Thailand",
                "Philippines": "Philippines",
                "Vietnam": "Vietnam",
              };
              
              const mappedCountry = countryMap[countryName] || countryName;
              setLocationFilter(mappedCountry);
            }
          } catch (error) {
            console.error("Error fetching country from coordinates:", error);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    }
  }, [setLocationFilter]);

  const getCountryFlag = (countryName: string) => {
    const entry = lookup.byCountry(countryName);
    const code = entry?.iso2?.toUpperCase() || "";
    if (code.length !== 2) return "";
    const base = 0x1f1e6;
    const c1 = code.charCodeAt(0) - 65;
    const c2 = code.charCodeAt(1) - 65;
    if (c1 < 0 || c1 > 25 || c2 < 0 || c2 > 25) return "";
    return String.fromCodePoint(base + c1, base + c2);
  };

  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-0 sm:px-4 py-4 sm:py-3 space-y-3">
        {/* Mobile: Stack vertically | Desktop: Side by side */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
          <LocationFilter />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search discussions..."
              value={filters.discussionSearchQuery}
              onChange={(e) => setDiscussionSearchQuery(e.target.value)}
              className="pl-9 rounded-full w-full"
            />
          </div>
        </div>

        {/* Topic chips - horizontal scroll with no overflow */}
        <TopicFilter />

        {/* Location helper text */}
        {filters.location !== "global" && (
          <p className="text-xs text-muted-foreground">
            Showing discussions in {getCountryFlag(filters.location) ? `${getCountryFlag(filters.location)} ` : ""}{filters.location}
          </p>
        )}
      </div>

      {/* Discussions list - extra bottom padding on mobile for sticky CTA */}
      <div className="px-0 sm:px-4 py-4 pb-28 sm:pb-4 space-y-3">
        {isDiscussionsLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={`discussion-skeleton-${index}`} className="bg-card rounded-xl p-3 sm:p-4 border border-border/50">
              <div className="flex gap-3">
                <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : filteredDiscussions.length > 0 ? (
          filteredDiscussions.map((discussion) => (
            <DiscussionCard key={discussion.id} discussion={discussion} />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">No discussions found</p>
            <p className="text-sm text-muted-foreground">
              Try changing your filters or be the first to ask!
            </p>
          </div>
        )}
      </div>

      {/* Desktop floating button - positioned within content container */}
      {isAuthenticated && onAskQuestion && (
        <div className="hidden sm:block fixed bottom-above-nav-lg left-0 right-0 pointer-events-none z-40">
          <div className="max-w-5xl mx-auto px-4 flex justify-end">
            <Button
              onClick={onAskQuestion}
              className="rounded-full shadow-lg gap-2 pointer-events-auto"
              size="lg"
            >
              <MessageSquarePlus className="h-5 w-5" />
              Ask the Community
            </Button>
          </div>
        </div>
      )}

      {/* Mobile sticky full-width button */}
      {isAuthenticated && onAskQuestion && (
        <div className="sm:hidden fixed left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border/50 bottom-above-nav z-[60]">
          <Button
            onClick={onAskQuestion}
            className="w-full gap-2"
            size="lg"
          >
            <MessageSquarePlus className="h-5 w-5" />
            Ask the Community
          </Button>
        </div>
      )}
    </div>
  );
}
