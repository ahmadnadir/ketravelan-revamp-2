import { DiscussionTopic, discussionTopicLabels } from "@/data/communityMockData";
import { useCommunity } from "@/hooks/useCommunity";
import { cn } from "@/lib/utils";

const topics: (DiscussionTopic | "all")[] = [
  "all",
  "general",
  "budget",
  "transport",
  "visa",
  "safety",
  "food",
  "accommodation",
];

export function TopicFilter() {
  const { filters, setDiscussionTopicFilter } = useCommunity();

  return (
    <div className="relative -mx-4 px-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 scroll-smooth">
        {topics.map((topic) => (
          <button
            key={topic}
            onClick={() => setDiscussionTopicFilter(topic)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
              filters.discussionTopic === topic
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {topic === "all" ? "All Topics" : discussionTopicLabels[topic]}
          </button>
        ))}
      </div>
    </div>
  );
}
