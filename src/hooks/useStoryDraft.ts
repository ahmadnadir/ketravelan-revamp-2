import { useState, useEffect, useCallback } from "react";
import { StoryBlock, StoryType, StoryVisibility, SocialLink, StoryFocus } from "@/data/communityMockData";

export interface StoryDraft {
  storyId?: string; // Set when editing existing story
  title: string;
  storyType: StoryType | null;
  storyFocuses: StoryFocus[];
  travelStyleIds: string[];
  country: string;
  city: string;
  linkedTripId: string | null;
  coverImage: string | null;
  blocks: StoryBlock[];
  visibility: StoryVisibility;
  socialLinks: SocialLink[];
  tags: string[];
  lastSaved: Date;
}

const DRAFT_KEY = "ketravelan-story-draft";

const defaultDraft: StoryDraft = {
  title: "",
  storyType: null,
  storyFocuses: [],
  travelStyleIds: [],
  country: "",
  city: "",
  linkedTripId: null,
  coverImage: null,
  blocks: [],
  visibility: "public",
  socialLinks: [],
  tags: [],
  lastSaved: new Date(),
};

export function useStoryDraft() {
  const [draft, setDraft] = useState<StoryDraft>(defaultDraft);
  const [hasDraft, setHasDraft] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        // Migrate older drafts safely
        const migrated: StoryDraft = {
          ...defaultDraft,
          ...parsed,
          storyFocuses: Array.isArray(parsed.storyFocuses) ? parsed.storyFocuses : [],
          travelStyleIds: Array.isArray(parsed.travelStyleIds) ? parsed.travelStyleIds : [],
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
          lastSaved: parsed.lastSaved ? new Date(parsed.lastSaved) : new Date(),
        };

        // Unify legacy text-ish blocks into one flexible text block
        migrated.blocks = migrated.blocks.map((b: StoryBlock) => {
          if (b.type === "moment") {
            return { ...b, type: "text", textPrompt: b.textPrompt ?? "what-happened" };
          }
          if (b.type === "lesson") {
            return { ...b, type: "text", textPrompt: b.textPrompt ?? "lesson" };
          }
          if (b.type === "tip") {
            return { ...b, type: "text", textPrompt: b.textPrompt ?? "tip" };
          }
          return b;
        });

        setDraft(migrated);
        setHasDraft(true);
      } catch (e) {
        console.error("Failed to parse story draft:", e);
      }
    }
  }, []);

  // Save draft to localStorage
  const saveDraft = useCallback((updates: Partial<StoryDraft>) => {
    setDraft((prev) => {
      const newDraft = {
        ...prev,
        ...updates,
        lastSaved: new Date(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(newDraft));
      setHasDraft(true);
      return newDraft;
    });
  }, []);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setDraft(defaultDraft);
    setHasDraft(false);
  }, []);

  // Update a specific block
  const updateBlock = useCallback((blockId: string, updates: Partial<StoryBlock>) => {
    setDraft((prev) => {
      const newBlocks = prev.blocks.map((block) =>
        block.id === blockId ? { ...block, ...updates } : block
      );
      const newDraft = {
        ...prev,
        blocks: newBlocks,
        lastSaved: new Date(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(newDraft));
      return newDraft;
    });
  }, []);

  // Add a new block
  const addBlock = useCallback((block: StoryBlock) => {
    setDraft((prev) => {
      const newDraft = {
        ...prev,
        blocks: [...prev.blocks, block],
        lastSaved: new Date(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(newDraft));
      setHasDraft(true);
      return newDraft;
    });
  }, []);

  // Remove a block
  const removeBlock = useCallback((blockId: string) => {
    setDraft((prev) => {
      const newDraft = {
        ...prev,
        blocks: prev.blocks.filter((block) => block.id !== blockId),
        lastSaved: new Date(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(newDraft));
      return newDraft;
    });
  }, []);

  // Reorder blocks
  const reorderBlocks = useCallback((blocks: StoryBlock[]) => {
    setDraft((prev) => {
      const newDraft = {
        ...prev,
        blocks,
        lastSaved: new Date(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(newDraft));
      return newDraft;
    });
  }, []);

  return {
    draft,
    hasDraft,
    saveDraft,
    clearDraft,
    updateBlock,
    addBlock,
    removeBlock,
    reorderBlocks,
  };
}
