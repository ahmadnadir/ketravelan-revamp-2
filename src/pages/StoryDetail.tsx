import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Bookmark, Share2, MapPin, Clock, Send, Pencil, Trash2, Instagram, Youtube, Facebook, Twitter, Link2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { storyTypeLabels, storyTypeEmojis, Story } from "@/data/communityMockData";
import { getTravelStyleEmoji, getTravelStyleLabel } from "@/data/travelStyles";
import { SEOHead } from "@/components/seo/SEOHead";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchStoryBySlug, toggleStoryReaction, deleteStory, createStoryComment, updateStoryComment, deleteStoryComment } from "@/lib/community";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const TikTok = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const socialIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  youtube: Youtube,
  facebook: Facebook,
  twitter: Twitter,
  tiktok: TikTok,
  other: Link2,
};

// Helper function to process and clean HTML for display
const processContentForPreview = (htmlContent: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  
  // Find all image blocks and process them
  const imageBlocks = doc.querySelectorAll("[data-image-block]");
  imageBlocks.forEach((block) => {
    const img = block.querySelector("img");
    const button = block.querySelector("button");
    const input = block.querySelector("input");
    const caption = img?.getAttribute("data-caption") || "";
    
    // Hide button and input
    if (button) button.style.display = "none";
    if (input) input.style.display = "none";
    
    // Add caption as a separate block if exists
    if (caption) {
      const captionText = document.createElement("p");
      captionText.className = "text-sm text-muted-foreground italic text-center m-0";
      captionText.textContent = caption;
      
      block.appendChild(captionText);
    }
  });
  
  return doc.body.innerHTML;
};

export default function StoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const normalizeSocialUrl = (platform: string, rawUrl: string) => {
    const value = String(rawUrl || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    const noScheme = value.replace(/^\/+/, "");
    const clean = value.replace(/^@/, "");
    switch (platform) {
      case "instagram":
        return /^(www\.)?instagram\.com\//i.test(noScheme)
          ? `https://${noScheme}`
          : `https://instagram.com/${clean}`;
      case "youtube":
        return /^(www\.)?youtube\.com\//i.test(noScheme)
          ? `https://${noScheme}`
          : `https://youtube.com/@${clean}`;
      case "tiktok":
        return /^(www\.)?tiktok\.com\//i.test(noScheme)
          ? `https://${noScheme}`
          : `https://tiktok.com/@${clean}`;
      case "facebook":
        return /^(www\.)?facebook\.com\//i.test(noScheme)
          ? `https://${noScheme}`
          : `https://facebook.com/${clean}`;
      case "twitter":
        return /^(www\.)?(x|twitter)\.com\//i.test(noScheme)
          ? `https://${noScheme}`
          : `https://x.com/${clean}`;
      default:
        return `https://${noScheme || clean}`;
    }
  };

  const isOwner = user && story && story.author.id === user.id;

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;
    const loadStory = async () => {
      setIsLoading(true);
      try {
        const data = await fetchStoryBySlug(slug, user?.id);
        if (isMounted) setStory(data);
      } catch (error) {
        toast({
          title: "Failed to load story",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadStory();
    return () => {
      isMounted = false;
    };
  }, [slug, user?.id]);

  if (isLoading) {
    return (
      <AppLayout wideLayout>
        <div className="relative -mx-5 sm:-mx-6 -mt-4 lg:-mx-8">
          <Skeleton className="aspect-[16/9] w-full" />
          <div className="absolute top-4 left-4">
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-7 w-3/4" />
          </div>
        </div>

        <div className="py-6 sm:py-6">
          <div className="flex flex-wrap items-center gap-3 mb-8 sm:mb-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>

          <div className="flex items-center gap-3 mb-8 sm:mb-6">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>

          <div className="space-y-3 mb-8 sm:mb-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
          </div>

          <div className="flex items-center justify-between py-5 sm:py-4 border-t border-b border-border mb-8 sm:mb-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-5 w-14" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>

          <div className="space-y-5 sm:space-y-4">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!story && !isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
          <h1 className="text-xl font-semibold mb-2">Story not found</h1>
          <p className="text-muted-foreground mb-4">This story may have been removed or the link is incorrect.</p>
          <Link to="/community">
            <Button>Back to Community</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const timeAgo = story ? formatDistanceToNow(story.createdAt, { addSuffix: true }) : "";

  const handleToggleLike = async () => {
    if (!story) return;
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like stories.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    const snapshot = story;
    setStory({
      ...story,
      isLiked: !story.isLiked,
      likes: story.isLiked ? story.likes - 1 : story.likes + 1,
    });

    try {
      await toggleStoryReaction(story.id, "like");
    } catch (error) {
      setStory(snapshot);
      toast({
        title: "Unable to update like",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleSave = async () => {
    if (!story) return;
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save stories.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    const snapshot = story;
    setStory({
      ...story,
      isSaved: !story.isSaved,
      saves: story.isSaved ? story.saves - 1 : story.saves + 1,
    });

    try {
      await toggleStoryReaction(story.id, "bookmark");
    } catch (error) {
      setStory(snapshot);
      toast({
        title: "Unable to update save",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!story) return;
    setIsDeleting(true);
    try {
      await deleteStory(story.id);
      toast({
        title: "Story deleted",
        description: "Your story has been removed.",
      });
      navigate("/community");
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleEdit = () => {
    if (!story) return;
    navigate(`/create-story?edit=${story.id}`);
  };

  const handleShare = async () => {
    if (!story) return;
    const shareData = {
      title: story.title || "Check out this story",
      text: story.excerpt || "",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "Link copied to clipboard!" });
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "Link copied to clipboard!" });
      }
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !story) return;
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to comment.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createStoryComment(story.id, commentText);
      toast({ 
        title: "Comment posted!",
        description: "Your comment has been added."
      });
      setCommentText("");
      
      // Refresh story to get updated comment count
      const updatedStory = await fetchStoryBySlug(slug!, user?.id);
      setStory(updatedStory);
    } catch (error) {
      toast({
        title: "Failed to post comment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditComment = (commentId: string, currentBody: string) => {
    setEditingCommentId(commentId);
    setEditCommentText(currentBody);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditCommentText("");
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editCommentText.trim()) return;

    try {
      await updateStoryComment(commentId, editCommentText);
      toast({
        title: "Comment updated",
        description: "Your changes have been saved."
      });
      setEditingCommentId(null);
      setEditCommentText("");

      // Refresh story to get updated comments
      const updatedStory = await fetchStoryBySlug(slug!, user?.id);
      setStory(updatedStory);
    } catch (error) {
      toast({
        title: "Failed to update comment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!story) return;
    setDeletingCommentId(commentId);

    try {
      await deleteStoryComment(commentId, story.id);
      toast({
        title: "Comment deleted",
        description: "Your comment has been removed."
      });

      // Refresh story to get updated comments
      const updatedStory = await fetchStoryBySlug(slug!, user?.id);
      setStory(updatedStory);
    } catch (error) {
      toast({
        title: "Failed to delete comment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <AppLayout wideLayout>
      <SEOHead
        title={`${story?.title || "Story"} | Ketravelan Stories`}
        description={story?.excerpt || ""}
        ogImage={story?.coverImage || undefined}
      />

      {/* Hero image with overlay header */}
      <div className="relative -mx-5 sm:-mx-6 -mt-4 lg:-mx-8">
        <div className="aspect-[16/9]">
          <img
            src={story?.coverImage}
            alt={story?.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
        </div>

        {/* Back button */}
        <Link
          to="/community?tab=stories"
          className="absolute top-6 left-4 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        {/* Action buttons */}
        <div className="absolute top-6 right-4 flex items-center gap-2">
          {isOwner && (
            <>
              <button 
                onClick={handleEdit}
                className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
                title="Edit story"
              >
                <Pencil className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setShowDeleteDialog(true)}
                className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-red-500/50 transition-colors"
                title="Delete story"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </>
          )}
          <button 
            onClick={handleShare}
            className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
            title="Share story"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="mb-3 flex flex-wrap gap-2">
            {(story?.storyTypes?.length ? story.storyTypes : story?.storyType ? [story.storyType] : []).map((type) => (
              <Badge key={`detail-type-${type}`} className="bg-white/20 backdrop-blur-sm text-white border-0">
                <span className="mr-1">{storyTypeEmojis[type]}</span>
                {storyTypeLabels[type]}
              </Badge>
            ))}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            {story?.title}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="py-6 sm:py-6">
        {/* Meta bar */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-8 sm:mb-6">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {story?.location.flag} {story?.location.city || story?.location.country}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {story?.readingTime} min read
          </span>
          <span>{timeAgo}</span>
        </div>

        {story?.travelStyleIds && story.travelStyleIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 sm:mb-6">
            {story.travelStyleIds.map((styleId) => (
              <Badge key={`detail-style-${styleId}`} variant="outline" className="text-xs">
                <span className="mr-1">{getTravelStyleEmoji(styleId)}</span>
                {getTravelStyleLabel(styleId)}
              </Badge>
            ))}
          </div>
        )}

        {/* Author */}
        {story && (
          <div className="flex items-center gap-3 mb-8 sm:mb-6">
            <Link
              to={`/user/${story.author.id}`}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={story.author.avatar} alt={story.author.name} />
                <AvatarFallback>{story.author.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{story.author.name}</p>
                <p className="text-sm text-muted-foreground">Travel enthusiast</p>
              </div>
            </Link>
            {((story.socialLinks?.length ? story.socialLinks : story.author.socialLinks) || []).length > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                {((story.socialLinks?.length ? story.socialLinks : story.author.socialLinks) || []).map((link, index) => {
                  const key = `${link.platform}-${index}`;
                  const Icon = socialIcons[link.platform] || Link2;
                  const href = normalizeSocialUrl(link.platform, link.url);
                  if (!href) return null;
                  return (
                    <a
                      key={key}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-secondary/60 hover:text-foreground transition-colors"
                      aria-label={link.platform}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Story content */}
        <div className="space-y-7 sm:space-y-6 mb-8 sm:mb-6">
          {/* Render HTML content from story builder */}
          {story?.blocks && story.blocks.length > 0 && story.blocks[0]?.content ? (
            <div className="text-sm text-foreground leading-relaxed space-y-6">
              <div
                dangerouslySetInnerHTML={{
                  __html: processContentForPreview(story.blocks[0].content),
                }}
                className="space-y-4 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_img]:w-full [&_img]:rounded-lg [&_img]:m-0 [&_input]:hidden [&_button]:hidden"
              />
            </div>
          ) : story?.excerpt ? (
            <p className="text-foreground leading-relaxed text-lg">
              {story.excerpt}
            </p>
          ) : null}
        </div>

        {/* Tags */}
        {story?.tags && story.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 sm:mb-6">
            {story.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between py-5 sm:py-4 border-t border-b border-border mb-8 sm:mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleToggleLike}
              disabled={isUpdating}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Heart className={story?.isLiked ? "h-5 w-5 fill-current text-red-500" : "h-5 w-5"} />
              <span className="text-sm">{story?.likes ?? 0}</span>
            </button>
            <button
              onClick={handleToggleSave}
              disabled={isUpdating}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bookmark className={story?.isSaved ? "h-5 w-5 fill-current text-primary" : "h-5 w-5"} />
              <span className="text-sm">{story?.saves ?? 0}</span>
            </button>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Comments Section */}
        <div className="space-y-5 sm:space-y-4">
          <h3 className="font-semibold text-lg">Comments ({story?.commentsList?.length || 0})</h3>
          
          {/* Comment Input */}
          {user ? (
            <div className="flex gap-2 mb-8 sm:mb-6">
              <Input
                type="text"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
                className="flex-1"
              />
              <Button 
                size="icon" 
                className="rounded-lg"
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="bg-secondary/50 rounded-lg p-4 sm:p-3 mb-8 sm:mb-6 text-center">
              <p className="text-sm text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to leave a comment
              </p>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-7 sm:space-y-6">
            {story?.commentsList && story.commentsList.length > 0 ? (
              story.commentsList.map((comment) => {
                const isCommentOwner = user && comment.author.id === user.id;
                const isEditing = editingCommentId === comment.id;

                return (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarImage src={comment.author.avatar} />
                      <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-sm text-foreground">{comment.author.name}</span>
                          <span className="text-xs text-muted-foreground/70">
                            {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                          </span>
                        </div>
                        {isCommentOwner && !isEditing && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditComment(comment.id, comment.body)}
                              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit comment"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              disabled={deletingCommentId === comment.id}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                              title="Delete comment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveEdit(comment.id);
                              } else if (e.key === "Escape") {
                                handleCancelEdit();
                              }
                            }}
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(comment.id)}
                            disabled={!editCommentText.trim()}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground leading-relaxed">
                          {comment.body}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {isOwner && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete story?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Your story will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </AppLayout>
  );
}
