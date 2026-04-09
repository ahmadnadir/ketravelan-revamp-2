import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, CheckCircle2, Send, Pencil, Trash2, Share2, MoreVertical, Flag, Copy, Check, MessageCircle, Eye, ArrowUp, ArrowDown, ChevronUp, ChevronDown, Reply as ReplyIcon, Heart, Bookmark } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Discussion, discussionTopicLabels } from "@/data/communityMockData";
import { SEOHead } from "@/components/seo/SEOHead";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { buildPublicUrl } from "@/lib/publicUrl";
import { createDiscussionReply, deleteDiscussionReply, fetchDiscussionById, fetchDiscussionReplies, toggleAcceptDiscussionReply, updateDiscussionReply, incrementDiscussionViews, toggleDiscussionReplyVote, toggleDiscussionReaction } from "@/lib/community";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type SortBy = "top" | "new" | "oldest";

interface DiscussionReply {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  content: string;
  createdAt: Date;
  depth: number;
  parentReplyId?: string | null;
  upvotes: number;
  downvotes: number;
  userVote?: "up" | "down" | null;
}

export default function DiscussionDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
  const [replyText, setReplyText] = useState("");
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<DiscussionReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState("");
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [savingReplyId, setSavingReplyId] = useState<string | null>(null);
  
  // New states for sorting, sharing, reporting
  const [sortBy, setSortBy] = useState<SortBy>("top");
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedReplyForShare, setSelectedReplyForShare] = useState<DiscussionReply | null>(null);
  const [shareLink, setShareLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReplyForReport, setSelectedReplyForReport] = useState<DiscussionReply | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyingToAuthor, setReplyingToAuthor] = useState<string | null>(null);
  const [votingReplyId, setVotingReplyId] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ open: boolean; replyId: string | null }>({ open: false, replyId: null });

  // Function to sort replies based on selected sort option
  const getSortedReplies = () => {
    const sorted = [...replies];
    
    switch (sortBy) {
      case "new":
        return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      case "oldest":
        return sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      case "top":
      default:
        // Sort by votes (upvotes - downvotes)
        return sorted.sort((a, b) => {
          const aScore = a.upvotes - a.downvotes;
          const bScore = b.upvotes - b.downvotes;
          return bScore - aScore;
        });
    }
  };

  // Get nested replies structure - returns replies with their children in a flat array for rendering
  const getNestedReplies = () => {
    const sorted = getSortedReplies();
    // Group child replies with their parents by keeping parent-child order
    const result: DiscussionReply[] = [];
    const topLevelReplies = sorted.filter(r => !r.parentReplyId);
    
    // Add top-level replies and their children in order
    topLevelReplies.forEach((parent) => {
      result.push(parent);
      // Find all immediate children and add them (if expanded)
      if (expandedReplies.has(parent.id)) {
        const children = sorted.filter(r => r.parentReplyId === parent.id);
        result.push(...children);
      }
    });
    
    return result;
  };

  const toggleExpandReplies = (parentId: string) => {
    setExpandedReplies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });
  };

  const getChildReplyCount = (parentId: string) => {
    return replies.filter(r => r.parentReplyId === parentId).length;
  };

  const handleShare = (reply: DiscussionReply) => {
    const link = buildPublicUrl(`/community/discussions/${id}?reply=${reply.id}`);
    setShareLink(link);
    setSelectedReplyForShare(reply);
    setShowShareModal(true);
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast({
        title: "Link copied!",
        description: "The comment link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy link",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReport = (reply: DiscussionReply) => {
    setSelectedReplyForReport(reply);
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason || !selectedReplyForReport) return;

    setIsSubmittingReport(true);
    try {
      const reportEmail = `
        Report Submitted for Discussion Comment
        ---
        Comment ID: ${selectedReplyForReport.id}
        Author: ${selectedReplyForReport.author.name}
        Discussion ID: ${id}
        
        Reason: ${reportReason}
        Details: ${reportDetails || "No additional details provided"}
        
        Reported by: ${user?.email || "Anonymous"}
        Date: ${new Date().toISOString()}
      `;

      // Send email to no-reply@ketravelan.xyz
      await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "no-reply@ketravelan.xyz",
          subject: `New Comment Report - Discussion ${id}`,
          body: reportEmail,
        }),
      });

      toast({
        title: "Report submitted",
        description: "Thank you for helping us keep the community safe. We'll review this shortly.",
      });

      setShowReportModal(false);
      setReportReason("");
      setReportDetails("");
      setSelectedReplyForReport(null);
    } catch (error) {
      toast({
        title: "Failed to submit report",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleVote = async (reply: DiscussionReply, voteType: "up" | "down") => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to vote.",
        variant: "destructive",
      });
      return;
    }

    if (user?.id === reply.author.id) {
      toast({
        title: "Cannot vote on your own reply",
        description: "You can't vote on replies you wrote.",
        variant: "destructive",
      });
      return;
    }

    setVotingReplyId(reply.id);
    try {
      // Call API to save vote
      const result = await toggleDiscussionReplyVote(reply.id, voteType);

      // Determine new vote state
      const isCurrentlyVoted = reply.userVote === voteType;
      const newVote = isCurrentlyVoted ? null : voteType;

      // Update local state with result from API
      setReplies((prev) =>
        prev.map((r) => {
          if (r.id !== reply.id) return r;
          
          return {
            ...r,
            upvotes: result.upvotes,
            downvotes: result.downvotes,
            userVote: newVote,
          };
        })
      );

      toast({
        title: "Vote recorded",
        description: voteType === "up" ? "You upvoted this reply" : "You downvoted this reply",
      });
    } catch (error) {
      toast({
        title: "Failed to vote",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setVotingReplyId(null);
    }
  };

  const handleReplyTo = (reply: DiscussionReply) => {
    setReplyingToId(reply.id);
    setReplyingToAuthor(reply.author.name);
  };

  const cancelReplyTo = () => {
    setReplyingToId(null);
    setReplyingToAuthor(null);
  };

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    const loadDiscussion = async () => {
      setIsLoading(true);
      try {
        const [discussionData, repliesData] = await Promise.all([
          fetchDiscussionById(id, user?.id),
          fetchDiscussionReplies(id),
        ]);

        if (!isMounted) return;
        setDiscussion(discussionData);
        setReplies((repliesData || []) as DiscussionReply[]);

        // Increment view count (non-blocking - don't await)
        incrementDiscussionViews(id).catch((err) => {
          console.error("Error updating view count:", err);
        });
      } catch (error) {
        toast({
          title: "Failed to load discussion",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDiscussion();
    return () => {
      isMounted = false;
    };
  }, [id, user?.id]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50 px-5 py-4 sm:px-4 sm:py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>

        <div className="p-5 sm:p-4 border-b border-border">
          <div className="flex items-start gap-3 mb-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-5 w-3/4 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6 mb-4" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>

        <div className="p-5 sm:p-4 space-y-5 sm:space-y-4">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`reply-skeleton-${index}`} className="p-5 sm:p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-start gap-3 mb-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </AppLayout>
    );
  }

  if (!discussion && !isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
          <h1 className="text-xl font-semibold mb-2">Discussion not found</h1>
          <p className="text-muted-foreground mb-4">This discussion may have been removed.</p>
          <Link to="/community?tab=discussions">
            <Button>Back to Community</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const timeAgo = discussion ? formatDistanceToNow(discussion.createdAt, { addSuffix: true }) : "";

  const handleSendReply = async () => {
    if (!id || !replyText.trim()) return;
    setIsSubmitting(true);
    try {
      const newReply = await createDiscussionReply(id, replyText.trim(), replyingToId || undefined);
      setReplies((prev) => [...prev, newReply as DiscussionReply]);
      setReplyText("");
      
      // Clear the reply-to context after sending
      if (replyingToId) {
        setReplyingToId(null);
        setReplyingToAuthor(null);
      }
      
      toast({
        title: "Reply posted!",
        description: "Your reply has been added to the discussion."
      });
      const updatedDiscussion = await fetchDiscussionById(id, user?.id);
      setDiscussion(updatedDiscussion);
    } catch (error) {
      toast({
        title: "Failed to post reply",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditReply = (replyId: string, currentBody: string) => {
    setEditingReplyId(replyId);
    setEditReplyText(currentBody);
  };

  const handleCancelEdit = () => {
    setEditingReplyId(null);
    setEditReplyText("");
  };

  const handleSaveEdit = async (replyId: string) => {
    if (!editReplyText.trim()) return;

    setSavingReplyId(replyId);
    try {
      await updateDiscussionReply(replyId, editReplyText);
      setReplies((prev) =>
        prev.map((reply) =>
          reply.id === replyId ? { ...reply, content: editReplyText.trim() } : reply
        )
      );
      toast({
        title: "Reply updated",
        description: "Your changes have been saved.",
      });
      setEditingReplyId(null);
      setEditReplyText("");
    } catch (error) {
      toast({
        title: "Failed to update reply",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingReplyId(null);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    setDeletingReplyId(replyId);
    try {
      await deleteDiscussionReply(replyId);
      setReplies((prev) => prev.filter((reply) => reply.id !== replyId));
      toast({
        title: "Reply deleted",
        description: "Your reply has been removed.",
      });
    } catch (error) {
      toast({
        title: "Failed to delete reply",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingReplyId(null);
    }
  };

  const isDiscussionOwner = user && discussion && discussion.author.id === user.id;

  const handleDiscussionReaction = async (reactionType: "like" | "bookmark") => {
    if (!discussion) return;
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: `Please sign in to ${reactionType === "like" ? "like" : "save"} discussions.`,
        variant: "destructive",
      });
      return;
    }

    const previous = discussion;
    const isLike = reactionType === "like";
    const toggledOn = isLike ? !discussion.isLiked : !discussion.isSaved;

    setDiscussion({
      ...discussion,
      isLiked: isLike ? toggledOn : discussion.isLiked,
      isSaved: isLike ? discussion.isSaved : toggledOn,
      likes: isLike ? (discussion.likes ?? 0) + (toggledOn ? 1 : -1) : discussion.likes,
      saves: isLike ? discussion.saves : (discussion.saves ?? 0) + (toggledOn ? 1 : -1),
    });

    try {
      await toggleDiscussionReaction(discussion.id, reactionType);
    } catch (error) {
      setDiscussion(previous);
      toast({
        title: `Failed to ${reactionType === "like" ? "update like" : "update save"}`,
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      {!discussion ? null : (
        <>
      <SEOHead
        title={`${discussion.title} | Ketravelan Discussions`}
        description={discussion?.details || discussion?.title || ""}
      />

      {/* Sub-header for back navigation */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 px-5 py-4 sm:px-4 sm:py-3">
        <div className="flex items-center gap-3">
          <Link
            to="/community?tab=discussions"
            className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-semibold text-base">Discussion</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 sm:pb-4">
        {/* Question - Main Card */}
        <div className="p-5 sm:p-4 md:p-6 border-b border-border/50">
          <div className="space-y-4">
            {/* Author Info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-border/50">
                <AvatarImage src={discussion?.author.avatar} />
                <AvatarFallback className="text-sm font-semibold">{discussion?.author.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{discussion?.author.name}</p>
                <p className="text-xs text-muted-foreground">{timeAgo}</p>
              </div>
            </div>

            {/* Title and Description */}
            <div className="space-y-3">
              <h2 className="text-xl md:text-2xl font-bold break-words leading-tight">{discussion?.title}</h2>
              
              {discussion?.details && (
                <p className="text-sm md:text-base text-foreground/80 leading-relaxed whitespace-pre-wrap">{discussion.details}</p>
              )}
            </div>

            {/* Tags and Status */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs font-medium">
                <MapPin className="h-3.5 w-3.5" />
                {discussion?.location.flag} {discussion?.location.city || discussion?.location.country}
              </Badge>
              <Badge variant="outline" className="px-2.5 py-1 text-xs font-medium">
                {discussion?.topic ? discussionTopicLabels[discussion.topic] : ""}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => handleDiscussionReaction("like")}
              >
                <Heart className={`h-3.5 w-3.5 ${(discussion?.isLiked ?? false) ? "fill-current text-red-500" : ""}`} />
                <span className="ml-1 text-[11px]">{discussion?.likes ?? 0}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => handleDiscussionReaction("bookmark")}
              >
                <Bookmark className={`h-3.5 w-3.5 ${(discussion?.isSaved ?? false) ? "fill-current" : ""}`} />
                <span className="ml-1 text-[11px]">{discussion?.saves ?? 0}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Replies Section */}
        <div className="p-5 sm:p-4 md:p-6">
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {replies.length} {replies.length === 1 ? "reply" : "replies"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {(discussion?.views ?? 0).toLocaleString()} {(discussion?.views ?? 0) === 1 ? "view" : "views"}
                </span>
              </div>
            </div>

            {/* Sort Tabs */}
            <div className="flex gap-2 border-b border-border/50">
              {(['top', 'new', 'oldest'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSortBy(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    sortBy === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'top' ? 'Top' : tab === 'new' ? 'New...' : 'Oldest'}
                </button>
              ))}
            </div>
          </div>

          {replies.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-secondary/30 py-12 px-4 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-background mb-3">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No replies yet</p>
              <p className="text-xs text-muted-foreground">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {getNestedReplies().map((reply) => {
                const isTopLevel = !reply.parentReplyId;
                const childCount = isTopLevel ? getChildReplyCount(reply.id) : 0;
                const isExpanded = expandedReplies.has(reply.id);
                
                return (
                  <div key={reply.id}>
                    <div className="flex gap-4 py-4 border-b border-border/30 last:border-b-0" style={{ marginLeft: `${reply.depth * 32}px` }}>
                  {/* Vote Section */}
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <button
                      onClick={() => handleVote(reply, "up")}
                      disabled={votingReplyId === reply.id || user?.id === reply.author.id}
                      className={`p-1 rounded transition-colors disabled:opacity-50 ${
                        reply.userVote === "up"
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title={user?.id === reply.author.id ? "You can't vote on your own reply" : "Upvote"}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-bold text-foreground">
                      {reply.upvotes - reply.downvotes > 0 ? reply.upvotes - reply.downvotes : (reply.upvotes - reply.downvotes < 0 ? reply.upvotes - reply.downvotes : reply.upvotes)}
                    </span>
                    <button
                      onClick={() => handleVote(reply, "down")}
                      disabled={votingReplyId === reply.id || user?.id === reply.author.id}
                      className={`p-1 rounded transition-colors disabled:opacity-50 ${
                        reply.userVote === "down"
                          ? "text-destructive"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title={user?.id === reply.author.id ? "You can't vote on your own reply" : "Downvote"}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 min-w-0">
                    {/* Reply Header */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={reply.author.avatar} />
                        <AvatarFallback className="text-xs font-semibold">{reply.author.name?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-semibold">{reply.author.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(reply.createdAt, { addSuffix: true })}</p>
                    </div>

                    {/* Reply Content */}
                    {editingReplyId === reply.id ? (
                      <div className="flex gap-2 mt-3">
                        <Input
                          value={editReplyText}
                          onChange={(e) => setEditReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit(reply.id);
                            } else if (e.key === "Escape") {
                              handleCancelEdit();
                            }
                          }}
                          className="flex-1 text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(reply.id)}
                          disabled={!editReplyText.trim() || savingReplyId === reply.id}
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground/85 leading-relaxed">{reply.content}</p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4 mt-3">
                      {isAuthenticated && editingReplyId !== reply.id && (
                        <>
                          {replyingToId !== reply.id ? (
                            <button onClick={() => handleReplyTo(reply)} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                              <ReplyIcon className="h-3.5 w-3.5" />
                              Reply
                            </button>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              Replying to {replyingToAuthor}...
                              <button onClick={cancelReplyTo} className="ml-2 text-primary hover:underline">
                                Cancel
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {/* Share Button */}
                      <button
                        onClick={() => handleShare(reply)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </button>

                      {/* Report Button */}
                      <button
                        onClick={() => handleReport(reply)}
                        className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        Report
                      </button>

                      {/* Edit and Delete Buttons */}
                      {user && reply.author.id === user.id && editingReplyId !== reply.id && (
                        <>
                          <button
                            onClick={() => handleEditReply(reply.id, reply.content)}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                            title="Edit reply"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirmDialog({ open: true, replyId: reply.id })}
                            disabled={deletingReplyId === reply.id}
                            className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 flex items-center gap-1"
                            title="Delete reply"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Show "View X more replies" button only for top-level replies with children */}
                {isTopLevel && childCount > 0 && !isExpanded && (
                  <button
                    onClick={() => toggleExpandReplies(reply.id)}
                    className="text-xs font-medium text-primary hover:underline ml-12 py-2"
                  >
                    View {childCount} more {childCount === 1 ? 'reply' : 'replies'}
                  </button>
                )}

                {/* Show "Hide replies" button when expanded */}
                {isTopLevel && childCount > 0 && isExpanded && (
                  <button
                    onClick={() => toggleExpandReplies(reply.id)}
                    className="text-xs font-medium text-primary hover:underline ml-12 py-2"
                  >
                    Hide replies
                  </button>
                )}
              </div>
            );
          })}
          </div>
          )}
        </div>
      </div>

      {/* Reply input - positioned above navbar */}
      {isAuthenticated && (
        <div className="fixed bottom-above-nav left-0 right-0 bg-background">
          <div className="max-w-5xl mx-auto p-4 border-t border-border">
            {replyingToId && (
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                <span>Replying to <strong>{replyingToAuthor}</strong></span>
                <button onClick={cancelReplyTo} className="text-primary hover:underline text-xs">
                  Cancel
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                placeholder={replyingToId ? `Reply to ${replyingToAuthor}...` : "Write a reply..."}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (replyText.trim()) {
                      handleSendReply();
                    }
                  }
                }}
                className="flex-1"
                disabled={isSubmitting}
              />
              <Button
                size="icon"
                disabled={!replyText.trim() || isSubmitting}
                onClick={handleSendReply}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Comment</DialogTitle>
            <DialogDescription>
              Share this comment with others. They'll be directed to this specific comment when they open the link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded border border-border">
              <Input
                readOnly
                value={shareLink}
                className="flex-1 bg-transparent border-0"
              />
              <Button
                size="sm"
                onClick={copyShareLink}
                className="shrink-0"
              >
                {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {linkCopied ? "Link copied to clipboard!" : "Click the button to copy the link"}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report Comment</DialogTitle>
            <DialogDescription>
              Help us keep the community safe by reporting inappropriate content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Reason for report</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
              >
                <option value="">Select a reason...</option>
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="misinformation">Misinformation</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Additional details (optional)</label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Provide any additional information that helps us understand the issue..."
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                rows={4}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowReportModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={submitReport}
                disabled={!reportReason || isSubmittingReport}
                className="flex-1"
              >
                {isSubmittingReport ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialog.open} onOpenChange={(open) => setDeleteConfirmDialog({ ...deleteConfirmDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Comment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmDialog({ open: false, replyId: null })}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (deleteConfirmDialog.replyId) {
                  handleDeleteReply(deleteConfirmDialog.replyId);
                  setDeleteConfirmDialog({ open: false, replyId: null });
                }
              }}
              disabled={deletingReplyId === deleteConfirmDialog.replyId}
              variant="destructive"
              className="flex-1"
            >
              {deletingReplyId === deleteConfirmDialog.replyId ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}
    </AppLayout>
  );
}
