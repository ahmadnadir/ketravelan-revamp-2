import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { StorySetupStep } from "@/components/story-builder/StorySetupStep";
import { StoryBuilder } from "@/components/story-builder/StoryBuilder";
import { PublishStep } from "@/components/story-builder/PublishStep";
import { DraftBanner } from "@/components/story-builder/DraftBanner";
import { useStoryDraft, StoryDraft } from "@/hooks/useStoryDraft";
import { useAuth } from "@/contexts/AuthContext";
import { SEOHead } from "@/components/seo/SEOHead";
import { publishStoryFromDraft, fetchStoryById } from "@/lib/community";
import { toast } from "@/hooks/use-toast";
import { travelStyles } from "@/data/travelStyles";
import { StoryFocus, StoryType } from "@/data/communityMockData";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type Step = "setup" | "builder" | "publish";

const stepLabels: Record<Step, string> = {
  setup: "Story Setup",
  builder: "Story Builder",
  publish: "Story Preview",
};

export default function CreateStory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<Step>("setup");
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [hasLoadedEdit, setHasLoadedEdit] = useState(false);
  
  const {
    draft,
    hasDraft,
    saveDraft,
    clearDraft,
    updateBlock,
    addBlock,
    removeBlock,
    reorderBlocks,
  } = useStoryDraft();

  // Scroll to top whenever step changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  // Load existing story for editing
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && user && !hasLoadedEdit) {
      setIsLoadingEdit(true);
      const loadStory = async () => {
        try {
          const story = await fetchStoryById(editId);
          setIsEditMode(true);
          
          // Extract all blocks from story content
          const loadedBlocks = story.blocks || [];
          
          // Filter and organize blocks by type
          const textBlocks = loadedBlocks.filter(b => b.type === 'text');
          const photoBlocks = loadedBlocks.filter(b => b.type === 'image');
          const locationBlocks = loadedBlocks.filter(b => b.type === 'location');
          const socialBlocks = loadedBlocks.filter(b => b.type === 'social-link');
          
          // Combine all blocks in order
          const allBlocks = [
            ...textBlocks,
            ...photoBlocks,
            ...locationBlocks,
            ...socialBlocks,
          ];

          const normalizeToken = (value: string) =>
            value.toLowerCase().replace(/[^a-z0-9]/g, "");

          const travelStyleIds = Array.from(
            new Set(
              (story.travelStyleIds?.length ? story.travelStyleIds : (story.tags || []))
                .map((tag) => {
                  const normalizedTag = normalizeToken(tag);
                  return travelStyles.find(
                    (style) =>
                      normalizeToken(style.id) === normalizedTag ||
                      normalizeToken(style.label) === normalizedTag
                  )?.id;
                })
                .filter((value): value is string => Boolean(value))
            )
          );

          const storyTypeToFocus: Partial<Record<StoryType, StoryFocus>> = {
            "trip-recap": "trip-recap",
            guide: "destination-guide",
            tips: "tips-for-others",
            budget: "budget-breakdown",
            review: "lessons-learned",
            itinerary: "trip-recap",
            other: "lessons-learned",
          };

          const storyFocuses = Array.from(
            new Set(
              (story.storyTypes?.length ? story.storyTypes : [story.storyType])
                .map((type) => storyTypeToFocus[type])
                .filter((value): value is StoryFocus => Boolean(value))
            )
          );
          
          saveDraft({
            storyId: story.id,
            title: story.title,
            country: story.location.country,
            city: story.location.city,
            coverImage: story.coverImage,
            visibility: story.visibility,
            storyType: story.storyType,
            storyFocuses,
            travelStyleIds,
            tags: story.tags || [],
            socialLinks: story.socialLinks || [],
            blocks: allBlocks,
            linkedTripId: story.linkedTripId,
          });
          
          // Go directly to builder
          setCurrentStep("builder");
          setHasLoadedEdit(true);
          toast({
            title: "Story loaded",
            description: `Edit your story below.`,
          });
        } catch (error) {
          toast({
            title: "Failed to load story",
            description: error instanceof Error ? error.message : "Could not load the story for editing.",
            variant: "destructive",
          });
          navigate("/community");
        } finally {
          setIsLoadingEdit(false);
        }
      };
      loadStory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user, hasLoadedEdit]);

  // Check for linked trip from URL
  useEffect(() => {
    if (isEditMode) return; // Skip if editing
    const tripId = searchParams.get("tripId");
    if (tripId) {
      saveDraft({ linkedTripId: tripId });
    }
    
    // Clear storyId when creating a new story (not editing)
    const editId = searchParams.get("edit");
    if (!editId && draft.storyId) {
      saveDraft({ storyId: undefined });
    }
  }, [searchParams, saveDraft, isEditMode, draft.storyId]);

  // Show draft banner if there's an existing draft
  useEffect(() => {
    if (hasDraft && draft.title) {
      setShowDraftBanner(true);
    }
  }, [hasDraft, draft.title]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth?redirect=/create-story");
    }
  }, [isAuthenticated, navigate]);

  const handleBack = () => {
    if (currentStep === "setup") {
      // Check if there's unsaved content
      if (draft.title || draft.blocks.length > 0) {
        setShowExitDialog(true);
      } else {
        navigate(-1);
      }
    } else if (currentStep === "builder") {
      setCurrentStep("setup");
    } else if (currentStep === "publish") {
      setCurrentStep("builder");
    }
  };

  const handleClose = () => {
    if (draft.title || draft.blocks.length > 0) {
      setShowExitDialog(true);
    } else {
      navigate(-1);
    }
  };

  const handleSetupComplete = (data: Partial<StoryDraft>) => {
    saveDraft(data);
    setCurrentStep("builder");
  };

  const handleBuilderComplete = () => {
    setCurrentStep("publish");
  };

  const handlePublish = async () => {
    try {
      await publishStoryFromDraft(draft);
      toast({
        title: isEditMode ? "Story updated!" : "Story published!",
        description: isEditMode 
          ? "Your changes have been saved successfully." 
          : "Your story is now live in the community feed.",
      });
      clearDraft();
      navigate("/community");
    } catch (error) {
      toast({
        title: isEditMode ? "Update failed" : "Publish failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveAsDraft = () => {
    // Draft is already saved via auto-save
    navigate("/community");
  };

  const handleResumeDraft = () => {
    setShowDraftBanner(false);
    // Determine which step to resume from
    if (draft.blocks.length > 0) {
      setCurrentStep("builder");
    } else if (draft.title && draft.country) {
      setCurrentStep("builder");
    }
  };

  const handleStartFresh = () => {
    clearDraft();
    setShowDraftBanner(false);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowExitDialog(false);
    navigate(-1);
  };

  const handleSaveDraftExit = () => {
    setShowExitDialog(false);
    navigate(-1);
  };

  return (
    <>
      <SEOHead
        title={isEditMode ? "Edit Your Story | Ketravelan" : "Share Your Story | Ketravelan"}
        description="Share your travel experiences with the Ketravelan community. Write about your adventures, lessons learned, and tips for fellow travelers."
      />
      
      <AppLayout>
        {/* Step Sub-Header (sticky within content) */}
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-background -mt-4 mb-4">
          <div className="flex items-center justify-between h-14">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-semibold text-foreground">
              {isEditMode ? "Edit Story" : stepLabels[currentStep]}
            </h1>
            <button
              onClick={handleClose}
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex gap-1.5 pb-3">
            {(["setup", "builder", "publish"] as Step[]).map((step, index) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index <= ["setup", "builder", "publish"].indexOf(currentStep)
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Loading state while fetching story to edit */}
        {isLoadingEdit && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-muted-foreground">Loading your story...</p>
          </div>
        )}


        {/* Step Content */}
        {currentStep === "setup" && (
          <StorySetupStep
            draft={draft}
            onComplete={handleSetupComplete}
          />
        )}
        
        {currentStep === "builder" && (
          <StoryBuilder
            draft={draft}
            saveDraft={saveDraft}
            addBlock={addBlock}
            updateBlock={updateBlock}
            removeBlock={removeBlock}
            reorderBlocks={reorderBlocks}
            onComplete={handleBuilderComplete}
          />
        )}
        
        {currentStep === "publish" && (
          <PublishStep
            draft={draft}
            saveDraft={saveDraft}
            onPublish={handlePublish}
            onSaveAsDraft={handleSaveAsDraft}
            onBack={() => setCurrentStep("builder")}
            isEditMode={isEditMode}
          />
        )}
      </AppLayout>

      {/* Exit Confirmation Drawer */}
      <Drawer open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DrawerContent className="pt-[env(safe-area-inset-top)]">
          <DrawerHeader className="text-center">
            <DrawerTitle>Leave story creation?</DrawerTitle>
            <DrawerDescription>
              Your progress can be saved as a draft, or you can discard this story.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="gap-3 pb-8">
            <Button onClick={handleSaveDraftExit} className="rounded-xl h-12">
              Save as Draft
            </Button>
            <Button
              variant="destructive"
              onClick={handleDiscardDraft}
              className="rounded-xl h-12"
            >
              Discard Story
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowExitDialog(false)}
              className="rounded-xl h-12"
            >
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
