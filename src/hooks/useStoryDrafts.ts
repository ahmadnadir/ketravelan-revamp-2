/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { StoryBlock, StoryType, StoryVisibility, SocialLink, StoryFocus, SocialPlatform } from "@/data/communityMockData";
import { EditorBlock, createTextBlock, migrateLegacyToBlocks } from "@/lib/storyEditorBlocks";

// Inline media for the rich text editor
export interface InlineMediaImage {
  url: string;
  caption?: string;
}

export interface InlineMedia {
  id: string;
  type: "image" | "gallery";
  images: InlineMediaImage[];
  insertPosition: number; // character index in content
  contentAfter?: string; // text written below this media block
}

// User social profile for profile-aware social link insertion
export interface UserSocialProfile {
  platform: SocialPlatform;
  handle: string;
}

export interface StoryDraft {
  id: string; // Unique draft ID
  title: string;
  storyType: StoryType | null;
  storyFocuses: StoryFocus[];
  travelStyles: string[];
  customStoryTypes: string[];
  customTravelStyles: string[];
  country: string;
  city: string;
  linkedTripId: string | null;
  coverImage: string | null;
  // Block-based editor content (source of truth)
  editorBlocks: EditorBlock[];
  // Legacy fields kept for backward compat
  content: string;
  contentAfterMedia: string;
  inlineMedia: InlineMedia[];
  // Selected social links from profile
  selectedSocialLinks: UserSocialProfile[];
  // Legacy blocks for backwards compatibility
  blocks: StoryBlock[];
  visibility: StoryVisibility;
  socialLinks: SocialLink[];
  lastSaved: Date;
  createdAt: Date;
}

const DRAFTS_KEY = "ketravelan-story-drafts";

// Mock user social profiles (in a real app, this would come from user settings)
export const mockUserSocialProfiles: UserSocialProfile[] = [
  { platform: "instagram", handle: "@ahmadrazak" },
  { platform: "youtube", handle: "@ahmadtravels" },
  { platform: "tiktok", handle: "@ahmadtiktok" },
];

const createEmptyDraft = (): StoryDraft => ({
  id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  title: "",
  storyType: null,
  storyFocuses: [],
  travelStyles: [],
  customStoryTypes: [],
  customTravelStyles: [],
  country: "",
  city: "",
  linkedTripId: null,
  coverImage: null,
  editorBlocks: [createTextBlock()],
  content: "",
  contentAfterMedia: "",
  inlineMedia: [],
  selectedSocialLinks: [],
  blocks: [],
  visibility: "public",
  socialLinks: [],
  lastSaved: new Date(),
  createdAt: new Date(),
});

export function useStoryDrafts() {
  const [drafts, setDrafts] = useState<StoryDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load drafts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFTS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate from array or single draft format
        let migratedDrafts: StoryDraft[] = [];
        
        if (Array.isArray(parsed)) {
          migratedDrafts = parsed.map((draft: any) => migrateDraft(draft));
        } else if (typeof parsed === 'object') {
          // Legacy single draft - convert to array
          migratedDrafts = [migrateDraft({ ...parsed, id: parsed.id || `draft-legacy-${Date.now()}` })];
        }
        
        // Filter out empty drafts (no title and no content)
        migratedDrafts = migratedDrafts.filter(
          d => d.title.trim() || d.content.trim()
        );
        
        setDrafts(migratedDrafts);
      } catch (e) {
        console.error("Failed to parse story drafts:", e);
      }
    }
    
    // Also check legacy single draft key
    const legacySingle = localStorage.getItem("ketravelan-story-draft");
    if (legacySingle && !saved) {
      try {
        const parsed = JSON.parse(legacySingle);
        if (parsed.title || parsed.content) {
          const migrated = migrateDraft({ ...parsed, id: `draft-legacy-${Date.now()}` });
          setDrafts([migrated]);
          // Migrate to new format
          localStorage.setItem(DRAFTS_KEY, JSON.stringify([migrated]));
          localStorage.removeItem("ketravelan-story-draft");
        }
      } catch (e) {
        console.error("Failed to migrate legacy draft:", e);
      }
    }
    
    setIsLoaded(true);
  }, []);

  // Helper to migrate draft format
  const migrateDraft = (parsed: any): StoryDraft => {
    const base = createEmptyDraft();
    const draft: StoryDraft = {
      ...base,
      ...parsed,
      id: parsed.id || base.id,
      storyFocuses: Array.isArray(parsed.storyFocuses) ? parsed.storyFocuses : [],
      travelStyles: Array.isArray(parsed.travelStyles) ? parsed.travelStyles : [],
      customStoryTypes: Array.isArray(parsed.customStoryTypes) ? parsed.customStoryTypes : [],
      customTravelStyles: Array.isArray(parsed.customTravelStyles) ? parsed.customTravelStyles : [],
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
      content: parsed.content || "",
      contentAfterMedia: parsed.contentAfterMedia || "",
      inlineMedia: Array.isArray(parsed.inlineMedia) ? parsed.inlineMedia : [],
      selectedSocialLinks: Array.isArray(parsed.selectedSocialLinks) ? parsed.selectedSocialLinks : [],
      lastSaved: parsed.lastSaved ? new Date(parsed.lastSaved) : new Date(),
      createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
    };

    // Migrate to editorBlocks if not present
    if (!Array.isArray(parsed.editorBlocks) || parsed.editorBlocks.length === 0) {
      draft.editorBlocks = migrateLegacyToBlocks(
        draft.content,
        draft.inlineMedia,
        draft.contentAfterMedia
      );
    } else {
      draft.editorBlocks = parsed.editorBlocks;
    }

    return draft;
  };

  // Save drafts to localStorage
  const saveDrafts = useCallback((newDrafts: StoryDraft[]) => {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(newDrafts));
    setDrafts(newDrafts);
  }, []);

  // Get active draft
  const activeDraft = drafts.find(d => d.id === activeDraftId) || null;

  // Create a new draft and set it as active
  const createDraft = useCallback((): StoryDraft => {
    const newDraft = createEmptyDraft();
    const newDrafts = [...drafts, newDraft];
    saveDrafts(newDrafts);
    setActiveDraftId(newDraft.id);
    return newDraft;
  }, [drafts, saveDrafts]);

  // Select an existing draft to edit
  const selectDraft = useCallback((draftId: string) => {
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
      setActiveDraftId(draftId);
      return draft;
    }
    return null;
  }, [drafts]);

  // Update the active draft
  const updateActiveDraft = useCallback((updates: Partial<Omit<StoryDraft, 'id' | 'createdAt'>>) => {
    if (!activeDraftId) return;
    
    setDrafts(prev => {
      const newDrafts = prev.map(draft =>
        draft.id === activeDraftId
          ? { ...draft, ...updates, lastSaved: new Date() }
          : draft
      );
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(newDrafts));
      return newDrafts;
    });
  }, [activeDraftId]);

  // Delete a draft
  const deleteDraft = useCallback((draftId: string) => {
    setDrafts(prev => {
      const newDrafts = prev.filter(d => d.id !== draftId);
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(newDrafts));
      return newDrafts;
    });
    if (activeDraftId === draftId) {
      setActiveDraftId(null);
    }
  }, [activeDraftId]);

  // Clear active draft after publishing
  const clearActiveDraft = useCallback(() => {
    if (activeDraftId) {
      deleteDraft(activeDraftId);
    }
  }, [activeDraftId, deleteDraft]);

  // Clear all drafts
  const clearAllDrafts = useCallback(() => {
    localStorage.removeItem(DRAFTS_KEY);
    setDrafts([]);
    setActiveDraftId(null);
  }, []);

  // Add inline media to active draft
  const addInlineMedia = useCallback((media: InlineMedia) => {
    if (!activeDraftId) return;
    
    setDrafts(prev => {
      const newDrafts = prev.map(draft =>
        draft.id === activeDraftId
          ? { ...draft, inlineMedia: [...draft.inlineMedia, media], lastSaved: new Date() }
          : draft
      );
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(newDrafts));
      return newDrafts;
    });
  }, [activeDraftId]);

  // Update inline media in active draft
  const updateInlineMedia = useCallback((mediaId: string, updates: Partial<InlineMedia>) => {
    if (!activeDraftId) return;
    
    setDrafts(prev => {
      const newDrafts = prev.map(draft =>
        draft.id === activeDraftId
          ? {
              ...draft,
              inlineMedia: draft.inlineMedia.map(m => m.id === mediaId ? { ...m, ...updates } : m),
              lastSaved: new Date()
            }
          : draft
      );
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(newDrafts));
      return newDrafts;
    });
  }, [activeDraftId]);

  // Remove inline media from active draft
  const removeInlineMedia = useCallback((mediaId: string) => {
    if (!activeDraftId) return;
    
    setDrafts(prev => {
      const newDrafts = prev.map(draft =>
        draft.id === activeDraftId
          ? {
              ...draft,
              inlineMedia: draft.inlineMedia.filter(m => m.id !== mediaId),
              lastSaved: new Date()
            }
          : draft
      );
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(newDrafts));
      return newDrafts;
    });
  }, [activeDraftId]);

  // Toggle social link in active draft
  const toggleSocialLink = useCallback((profile: UserSocialProfile) => {
    if (!activeDraftId) return;
    
    setDrafts(prev => {
      const newDrafts = prev.map(draft => {
        if (draft.id !== activeDraftId) return draft;
        
        const exists = draft.selectedSocialLinks.some(
          s => s.platform === profile.platform && s.handle === profile.handle
        );
        const newLinks = exists
          ? draft.selectedSocialLinks.filter(
              s => !(s.platform === profile.platform && s.handle === profile.handle)
            )
          : [...draft.selectedSocialLinks, profile];
        
        return { ...draft, selectedSocialLinks: newLinks, lastSaved: new Date() };
      });
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(newDrafts));
      return newDrafts;
    });
  }, [activeDraftId]);

  return {
    drafts,
    activeDraft,
    activeDraftId,
    isLoaded,
    hasDrafts: drafts.length > 0,
    createDraft,
    selectDraft,
    updateActiveDraft,
    deleteDraft,
    clearActiveDraft,
    clearAllDrafts,
    addInlineMedia,
    updateInlineMedia,
    removeInlineMedia,
    toggleSocialLink,
    setActiveDraftId,
  };
}
