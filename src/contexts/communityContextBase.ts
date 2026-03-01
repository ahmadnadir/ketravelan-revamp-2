import { createContext } from "react";
import type { Discussion, DiscussionTopic, Story, StoryType } from "@/data/communityMockData";

export type CommunityMode = "stories" | "discussions";

export interface CommunityFilters {
  storySearchQuery: string;
  storyType: StoryType | "all";
  discussionSearchQuery: string;
  discussionTopic: DiscussionTopic | "all";
  location: string; // country or "global"
}

export interface CommunityContextValue {
  mode: CommunityMode;
  setMode: (m: CommunityMode) => void;
  filters: CommunityFilters;
  setStorySearchQuery: (q: string) => void;
  setStoryTypeFilter: (t: StoryType | "all") => void;
  setDiscussionSearchQuery: (q: string) => void;
  setDiscussionTopicFilter: (t: DiscussionTopic | "all") => void;
  setLocationFilter: (loc: string) => void;
  filteredStories: Story[];
  filteredDiscussions: Discussion[];
  toggleStoryLike: (id: string) => void;
  toggleStorySave: (id: string) => void;
  refreshStories: () => Promise<void>;
  refreshDiscussions: () => Promise<void>;
}

export const CommunityContext = createContext<CommunityContextValue | undefined>(undefined);
