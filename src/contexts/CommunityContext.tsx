/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  Story,
  Discussion,
  StoryType,
  DiscussionTopic,
} from "@/data/communityMockData";
import { useAuth } from "@/contexts/AuthContext";
import { fetchDiscussions, fetchStories, toggleDiscussionReaction, toggleStoryReaction } from "@/lib/community";
import { toast } from "@/hooks/use-toast";

type CommunityMode = "stories" | "discussions";

interface CommunityFilters {
  storyType: StoryType | "all";
  discussionTopic: DiscussionTopic | "all";
  location: string | "global";
  storySearchQuery: string;
  discussionSearchQuery: string;
}

interface CommunityContextType {
  mode: CommunityMode;
  setMode: (mode: CommunityMode) => void;
  stories: Story[];
  discussions: Discussion[];
  isStoriesLoading: boolean;
  isDiscussionsLoading: boolean;
  filters: CommunityFilters;
  setStoryTypeFilter: (type: StoryType | "all") => void;
  setDiscussionTopicFilter: (topic: DiscussionTopic | "all") => void;
  setLocationFilter: (location: string | "global") => void;
  setStorySearchQuery: (query: string) => void;
  setDiscussionSearchQuery: (query: string) => void;
  toggleStoryLike: (storyId: string) => void;
  toggleStorySave: (storyId: string) => void;
  toggleDiscussionLike: (discussionId: string) => void;
  toggleDiscussionSave: (discussionId: string) => void;
  refreshStories: () => Promise<void>;
  refreshDiscussions: () => Promise<void>;
  filteredStories: Story[];
  filteredDiscussions: Discussion[];
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<CommunityMode>("stories");
  const [stories, setStories] = useState<Story[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [isStoriesLoading, setIsStoriesLoading] = useState(true);
  const [isDiscussionsLoading, setIsDiscussionsLoading] = useState(true);
  const [filters, setFilters] = useState<CommunityFilters>({
    storyType: "all",
    discussionTopic: "all",
    location: "global",
    storySearchQuery: "",
    discussionSearchQuery: "",
  });

  const refreshStories = useCallback(async () => {
    setIsStoriesLoading(true);
    try {
      const data = await fetchStories(user?.id);
      setStories(data);
    } catch (error) {
      toast({
        title: "Failed to load stories",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStoriesLoading(false);
    }
  }, [user?.id]);

  const refreshDiscussions = useCallback(async () => {
    setIsDiscussionsLoading(true);
    try {
      const data = await fetchDiscussions(user?.id);
      setDiscussions(data);
    } catch (error) {
      toast({
        title: "Failed to load discussions",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDiscussionsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshStories();
    refreshDiscussions();
  }, [refreshStories, refreshDiscussions]);

  const setStoryTypeFilter = useCallback((type: StoryType | "all") => {
    setFilters((prev) => ({ ...prev, storyType: type }));
  }, []);

  const setDiscussionTopicFilter = useCallback((topic: DiscussionTopic | "all") => {
    setFilters((prev) => ({ ...prev, discussionTopic: topic }));
  }, []);

  const setLocationFilter = useCallback((location: string | "global") => {
    setFilters((prev) => ({ ...prev, location }));
  }, []);

  const setStorySearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, storySearchQuery: query }));
  }, []);

  const setDiscussionSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, discussionSearchQuery: query }));
  }, []);

  const toggleStoryLike = useCallback(
    async (storyId: string) => {
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to like stories.",
          variant: "destructive",
        });
        return;
      }

      let snapshot: Story[] | null = null;
      setStories((prev) => {
        snapshot = prev;
        return prev.map((story) =>
          story.id === storyId
            ? {
                ...story,
                isLiked: !story.isLiked,
                likes: story.isLiked ? story.likes - 1 : story.likes + 1,
              }
            : story
        );
      });

      try {
        await toggleStoryReaction(storyId, "like");
      } catch (error) {
        if (snapshot) setStories(snapshot);
        toast({
          title: "Unable to update like",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    },
    [user]
  );

  const toggleStorySave = useCallback(
    async (storyId: string) => {
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to save stories.",
          variant: "destructive",
        });
        return;
      }

      let snapshot: Story[] | null = null;
      setStories((prev) => {
        snapshot = prev;
        return prev.map((story) =>
          story.id === storyId
            ? {
                ...story,
                isSaved: !story.isSaved,
                saves: story.isSaved ? story.saves - 1 : story.saves + 1,
              }
            : story
        );
      });

      try {
        await toggleStoryReaction(storyId, "bookmark");
      } catch (error) {
        if (snapshot) setStories(snapshot);
        toast({
          title: "Unable to update save",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    },
    [user]
  );

  const toggleDiscussionLike = useCallback(
    async (discussionId: string) => {
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to like discussions.",
          variant: "destructive",
        });
        return;
      }

      let snapshot: Discussion[] | null = null;
      setDiscussions((prev) => {
        snapshot = prev;
        return prev.map((discussion) =>
          discussion.id === discussionId
            ? {
                ...discussion,
                isLiked: !discussion.isLiked,
                likes: (discussion.likes ?? 0) + (discussion.isLiked ? -1 : 1),
              }
            : discussion
        );
      });

      try {
        await toggleDiscussionReaction(discussionId, "like");
      } catch (error) {
        if (snapshot) setDiscussions(snapshot);
        toast({
          title: "Unable to update like",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    },
    [user]
  );

  const toggleDiscussionSave = useCallback(
    async (discussionId: string) => {
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to save discussions.",
          variant: "destructive",
        });
        return;
      }

      let snapshot: Discussion[] | null = null;
      setDiscussions((prev) => {
        snapshot = prev;
        return prev.map((discussion) =>
          discussion.id === discussionId
            ? {
                ...discussion,
                isSaved: !discussion.isSaved,
                saves: (discussion.saves ?? 0) + (discussion.isSaved ? -1 : 1),
              }
            : discussion
        );
      });

      try {
        await toggleDiscussionReaction(discussionId, "bookmark");
      } catch (error) {
        if (snapshot) setDiscussions(snapshot);
        toast({
          title: "Unable to update save",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    },
    [user]
  );

  const filteredStories = stories.filter((story) => {
    if (filters.storyType !== "all") {
      const storyTypes = story.storyTypes?.length ? story.storyTypes : [story.storyType];
      if (!storyTypes.includes(filters.storyType)) {
        return false;
      }
    }
    if (filters.storySearchQuery) {
      const query = filters.storySearchQuery.toLowerCase();
      return (
        story.title.toLowerCase().includes(query) ||
        story.excerpt.toLowerCase().includes(query) ||
        story.location.country.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const filteredDiscussions = discussions.filter((discussion) => {
    if (
      filters.discussionTopic !== "all" &&
      discussion.topic !== filters.discussionTopic
    ) {
      return false;
    }
    if (
      filters.location !== "global" &&
      discussion.location.country !== filters.location
    ) {
      return false;
    }
    if (filters.discussionSearchQuery) {
      const query = filters.discussionSearchQuery.toLowerCase();
      return (
        discussion.title.toLowerCase().includes(query) ||
        discussion.details?.toLowerCase().includes(query) ||
        discussion.location.country.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <CommunityContext.Provider
      value={{
        mode,
        setMode,
        stories,
        discussions,
        isStoriesLoading,
        isDiscussionsLoading,
        filters,
        setStoryTypeFilter,
        setDiscussionTopicFilter,
        setLocationFilter,
        setStorySearchQuery,
        setDiscussionSearchQuery,
        toggleStoryLike,
        toggleStorySave,
        toggleDiscussionLike,
        toggleDiscussionSave,
        refreshStories,
        refreshDiscussions,
        filteredStories,
        filteredDiscussions,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
}

export function useCommunity() {
  const context = useContext(CommunityContext);
  if (!context) {
    throw new Error("useCommunity must be used within a CommunityProvider");
  }
  return context;
}

export function useOptionalCommunity() {
  return useContext(CommunityContext);
}
