import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { StoryCard } from "@/components/community/stories/StoryCard";
import { DiscussionCard } from "@/components/community/discussions/DiscussionCard";
import { CommunityProvider, useCommunity, useOptionalCommunity } from "@/contexts/CommunityContext";
import { useAuth } from "@/contexts/AuthContext";
import { useStoryDrafts } from "@/hooks/useStoryDrafts";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PenLine, FileEdit, Heart, Bookmark, Plus, Calendar, BookOpen, MessageSquare, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ContentType = "stories" | "discussions";

export default function MyStories() {
  const community = useOptionalCommunity();

  if (!community) {
    return (
      <CommunityProvider>
        <MyStoriesContent />
      </CommunityProvider>
    );
  }

  return <MyStoriesContent />;
}

function MyStoriesContent() {
  const navigate = useNavigate();
  const isLoading = useSimulatedLoading(500);
  const [tab, setTab] = useState("published");
  const [contentType, setContentType] = useState<ContentType>("stories");
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const { user } = useAuth();
  const { stories, discussions } = useCommunity();
  const { drafts, deleteDraft } = useStoryDrafts();

  // Filter stories from real backend data
  const { publishedStories, likedStories, savedStories } = useMemo(() => {
    const published = stories.filter((story) => story.author.id === user?.id);
    const liked = stories.filter(s => s.isLiked);
    const saved = stories.filter(s => s.isSaved);

    return { publishedStories: published, likedStories: liked, savedStories: saved };
  }, [stories, user?.id]);

  // Filter discussions from real backend data + reaction ids
  const { publishedDiscussions, likedDiscussions, savedDiscussions } = useMemo(() => {
    const published = discussions.filter((discussion) => discussion.author.id === user?.id);
    const liked = discussions.filter((discussion) => discussion.isLiked);
    const saved = discussions.filter((discussion) => discussion.isSaved);

    return { publishedDiscussions: published, likedDiscussions: liked, savedDiscussions: saved };
  }, [discussions, user?.id]);

  const handleConfirmDeleteDraft = () => {
    if (draftToDelete) {
      deleteDraft(draftToDelete);
      setDraftToDelete(null);
    }
  };

  const getEmptyState = () => {
    const isStories = contentType === "stories";
    
    switch (tab) {
      case "published":
        return {
          icon: isStories 
            ? <PenLine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            : <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />,
          message: isStories 
            ? "No published stories yet. Share your first travel story!"
            : "No published discussions yet. Ask a question!",
          cta: (
            <Button onClick={() => navigate(isStories ? "/create-story" : "/community?tab=discussions")} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              {isStories ? "Write a Story" : "Start a Discussion"}
            </Button>
          ),
        };
      case "drafts":
        return {
          icon: <FileEdit className="h-12 w-12 text-muted-foreground mx-auto mb-4" />,
          message: isStories 
            ? "No story drafts. Start writing a new story!"
            : "Discussion drafts are not supported yet.",
          cta: isStories ? (
            <Button onClick={() => navigate("/create-story")} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Start Writing
            </Button>
          ) : null,
        };
      case "liked":
        return {
          icon: <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />,
          message: isStories 
            ? "No liked stories yet. Explore the community!"
            : "No liked discussions yet. Explore the community!",
          cta: (
            <Button onClick={() => navigate(`/community?tab=${isStories ? "stories" : "discussions"}`)} variant="outline" className="mt-4">
              {isStories ? "Explore Stories" : "Explore Discussions"}
            </Button>
          ),
        };
      case "saved":
        return {
          icon: <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />,
          message: isStories 
            ? "No saved stories. Bookmark stories to read later!"
            : "No saved discussions. Bookmark discussions to read later!",
          cta: (
            <Button onClick={() => navigate(`/community?tab=${isStories ? "stories" : "discussions"}`)} variant="outline" className="mt-4">
              {isStories ? "Explore Stories" : "Explore Discussions"}
            </Button>
          ),
        };
      default:
        return { icon: null, message: "No items found", cta: null };
    }
  };

  const renderDraftCard = (draft: typeof drafts[0]) => {
    return (
      <div key={draft.id} className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex gap-4 p-4">
          {/* Cover Image */}
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {draft.coverImage ? (
              <img
                src={draft.coverImage}
                alt={draft.title || "Draft"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileEdit className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                Draft
              </span>
            </div>
            <h3 className="font-semibold text-foreground truncate">
              {draft.title || "Untitled Story"}
            </h3>
            {draft.country && (
              <p className="text-sm text-muted-foreground truncate">
                {draft.city ? `${draft.city}, ${draft.country}` : draft.country}
              </p>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3" />
              <span>Last saved {formatDistanceToNow(new Date(draft.lastSaved), { addSuffix: true })}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2">
          <Button
            onClick={() => navigate(`/create-story?draftId=${draft.id}&from=drafts`)}
            variant="outline"
            className="flex-1"
          >
            Continue Editing
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDraftToDelete(draft.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    const isStories = contentType === "stories";

    switch (tab) {
      case "published": {
        const publishedItems = isStories ? publishedStories : publishedDiscussions;
        if (publishedItems.length === 0) {
          const empty = getEmptyState();
          return (
            <div className="text-center py-12">
              {empty.icon}
              <p className="text-muted-foreground">{empty.message}</p>
              {empty.cta}
            </div>
          );
        }
        return (
          <div className="space-y-4">
            {isStories
              ? publishedStories.map((story) => <StoryCard key={story.id} story={story} />)
              : publishedDiscussions.map((discussion) => <DiscussionCard key={discussion.id} discussion={discussion} />)}
          </div>
        );
      }

      case "drafts": {
        if (!isStories) {
          const empty = getEmptyState();
          return (
            <div className="text-center py-12">
              {empty.icon}
              <p className="text-muted-foreground">{empty.message}</p>
              {empty.cta}
            </div>
          );
        }

        const validDrafts = drafts.filter((draft) => draft.title.trim() || draft.content.trim());

        if (validDrafts.length === 0) {
          const empty = getEmptyState();
          return (
            <div className="text-center py-12">
              {empty.icon}
              <p className="text-muted-foreground">{empty.message}</p>
              {empty.cta}
            </div>
          );
        }
        return (
          <div className="space-y-4">
            {validDrafts.map(renderDraftCard)}
          </div>
        );
      }

      case "liked": {
        const likedItems = isStories ? likedStories : likedDiscussions;
        if (likedItems.length === 0) {
          const empty = getEmptyState();
          return (
            <div className="text-center py-12">
              {empty.icon}
              <p className="text-muted-foreground">{empty.message}</p>
              {empty.cta}
            </div>
          );
        }
        return (
          <div className="space-y-4">
            {isStories
              ? likedStories.map((story) => <StoryCard key={story.id} story={story} />)
              : likedDiscussions.map((discussion) => <DiscussionCard key={discussion.id} discussion={discussion} />)}
          </div>
        );
      }

      case "saved": {
        const savedItems = isStories ? savedStories : savedDiscussions;
        if (savedItems.length === 0) {
          const empty = getEmptyState();
          return (
            <div className="text-center py-12">
              {empty.icon}
              <p className="text-muted-foreground">{empty.message}</p>
              {empty.cta}
            </div>
          );
        }
        return (
          <div className="space-y-4">
            {isStories
              ? savedStories.map((story) => <StoryCard key={story.id} story={story} />)
              : savedDiscussions.map((discussion) => <DiscussionCard key={discussion.id} discussion={discussion} />)}
          </div>
        );
      }

      default:
        return null;
    }
  };

  // Calculate counts for tabs based on content type
  const getCounts = () => {
    const isStories = contentType === "stories";
    const validDrafts = drafts.filter(d => d.title.trim() || d.content.trim());
    return {
      published: isStories ? publishedStories.length : publishedDiscussions.length,
      drafts: isStories ? validDrafts.length : 0,
      liked: isStories ? likedStories.length : likedDiscussions.length,
      saved: isStories ? savedStories.length : savedDiscussions.length,
    };
  };

  const counts = getCounts();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <AppLayout>
        <div className="py-6 space-y-6">
          <h1 className="text-2xl font-bold text-foreground">My Stories & Discussions</h1>

          {/* Content Type Toggle */}
          <div className="flex gap-2">
            <Button
              variant={contentType === "stories" ? "default" : "outline"}
              size="sm"
              onClick={() => setContentType("stories")}
              className="flex-1"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Stories
            </Button>
            <Button
              variant={contentType === "discussions" ? "default" : "outline"}
              size="sm"
              onClick={() => setContentType("discussions")}
              className="flex-1"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Discussions
            </Button>
          </div>

          <SegmentedControl
            options={[
              { label: "Published", value: "published", count: counts.published },
              { label: "Drafts", value: "drafts", count: counts.drafts },
              { label: "Liked", value: "liked", count: counts.liked },
              { label: "Saved", value: "saved", count: counts.saved },
            ]}
            value={tab}
            onChange={setTab}
          />

          {renderContent()}
        </div>
      </AppLayout>

      {/* Delete Draft Confirmation */}
      <AlertDialog open={!!draftToDelete} onOpenChange={(open) => !open && setDraftToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your draft will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteDraft}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
