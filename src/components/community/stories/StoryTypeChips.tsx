import { StoryType, storyTypeLabels } from "../../../data/communityMockData";
import { useCommunity } from "@/contexts/CommunityContext";
import { cn } from "@/lib/utils";

const storyTypes: (StoryType | "all")[] = [
  "all",
  "trip-recap",
  "guide",
  "review",
  "tips",
  "itinerary",
  "budget",
  "other",
];

export function StoryTypeChips() {
  const { filters, setStoryTypeFilter } = useCommunity();

  return (
    <div className="relative -mx-4 px-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 scroll-smooth">
        {storyTypes.map((type) => (
          <button
            key={type}
            onClick={() => setStoryTypeFilter(type)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
              filters.storyType === type
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {type === "all" ? "All Stories" : storyTypeLabels[type]}
          </button>
        ))}
      </div>
    </div>
  );
}
