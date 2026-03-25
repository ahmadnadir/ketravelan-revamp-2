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
import { getCurrentCoords, getCountryFromCoords } from "@/lib/geolocation";

interface DiscussionsFeedProps {
  onAskQuestion?: () => void;
}

export function DiscussionsFeed({ onAskQuestion }: DiscussionsFeedProps) {
  const { filteredDiscussions, filters, setDiscussionSearchQuery, setLocationFilter, isDiscussionsLoading } = useCommunity();
  const { isAuthenticated } = useAuth();

  // Auto-detect user location on mount
  useEffect(() => {
    (async () => {
      try {
        const coords = await getCurrentCoords();
        const country = await getCountryFromCoords(coords);
        if (country) setLocationFilter(country);
      } catch (error) {
        console.error("Location detection error:", error);
      }
    })();
  }, [setLocationFilter]);

  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <div className="px-0 sm:px-4 pt-3 pb-2 space-y-2 border-b border-border/40">
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
            Showing discussions in {filters.location}
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

      {/* Desktop floating button - pinned to bottom-right, clear of sidebar */}
      {isAuthenticated && onAskQuestion && (
        <div className="hidden sm:block fixed bottom-8 right-8 z-40">
            <Button
              onClick={onAskQuestion}
              className="rounded-full shadow-lg gap-2"
              size="lg"
            >
              <MessageSquarePlus className="h-5 w-5" />
              Ask the Community
            </Button>
        </div>
      )}

      {/* Mobile sticky full-width button */}
      {isAuthenticated && onAskQuestion && (
        <div className="sm:hidden fixed left-0 right-0 p-4 bg-background border-t border-border/50 bottom-above-nav z-[60]">
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
