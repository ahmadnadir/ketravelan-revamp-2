import { useNavigate } from "react-router-dom";
import { useCommunity } from "@/hooks/useCommunity";
import { StoryCard } from "./StoryCard";
import { StoryTypeChips } from "./StoryTypeChips";
import { PenSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

export function StoriesFeed() {
  const navigate = useNavigate();
  const { filteredStories, filters, setStorySearchQuery, isStoriesLoading } = useCommunity();
  const { isAuthenticated } = useAuth();

  const handleCreateStory = () => {
    navigate("/create-story");
  };

  return (
    <div className="flex flex-col">
      {/* Filter section */}
      <div className="px-0 sm:px-4 pt-3 pb-2 space-y-2 border-b border-border/40">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stories..."
            value={filters.storySearchQuery}
            onChange={(e) => setStorySearchQuery(e.target.value)}
            className="pl-9 rounded-full w-full"
          />
        </div>
        
        {/* Story type chips */}
        <StoryTypeChips />
      </div>

      {/* Stories grid - extra bottom padding on mobile for sticky CTA */}
      <div className="px-0 sm:px-4 pt-4 pb-28 sm:pb-4 space-y-5 sm:space-y-4">
        {isStoriesLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={`story-skeleton-${index}`} className="bg-card rounded-xl sm:rounded-2xl overflow-hidden shadow-sm border border-border/50">
              <Skeleton className="h-40 sm:h-52 w-full" />
              <div className="p-3 sm:p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 sm:h-7 sm:w-7 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-10 rounded-lg" />
                    <Skeleton className="h-6 w-10 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : filteredStories.length > 0 ? (
          filteredStories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No stories found</p>
          </div>
        )}
      </div>

      {/* Desktop floating CTA - pinned to bottom-right, clear of sidebar */}
      {isAuthenticated && (
        <div className="hidden sm:block fixed bottom-8 right-8 z-40">
            <Button
              onClick={handleCreateStory}
              className="rounded-full shadow-lg gap-2"
              size="lg"
            >
              <PenSquare className="h-5 w-5" />
              Share Your Story
            </Button>
        </div>
      )}

      {/* Mobile sticky full-width CTA */}
      {isAuthenticated && (
        <div className="sm:hidden fixed left-0 right-0 p-4 bg-background border-t border-border/50 bottom-above-nav z-[60]">
          <Button
            onClick={handleCreateStory}
            className="w-full gap-2"
            size="lg"
          >
            <PenSquare className="h-5 w-5" />
            Share Your Story
          </Button>
        </div>
      )}
    </div>
  );
}
