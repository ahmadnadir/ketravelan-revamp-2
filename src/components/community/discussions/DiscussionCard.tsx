import { MessageCircle, MapPin, Heart, Bookmark } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Discussion, discussionTopicLabels } from "@/data/communityMockData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useCommunity } from "@/contexts/CommunityContext";
import { cn } from "@/lib/utils";

interface DiscussionCardProps {
  discussion: Discussion;
}

export function DiscussionCard({ discussion }: DiscussionCardProps) {
  const { toggleDiscussionLike, toggleDiscussionSave } = useCommunity();
  const navigate = useNavigate();
  const timeAgo = formatDistanceToNow(discussion.createdAt, { addSuffix: true });
  const [isLiking, setIsLiking] = useState(false);
  const [showLikeFx, setShowLikeFx] = useState(false);
  const lastTapAtRef = useRef(0);
  const pendingNavigationRef = useRef<number | null>(null);

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest("button, input, textarea, select"));
  };

  const clearPendingNavigation = () => {
    if (pendingNavigationRef.current != null) {
      window.clearTimeout(pendingNavigationRef.current);
      pendingNavigationRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearPendingNavigation();
    };
  }, []);

  const triggerLikeAnimation = () => {
    setIsLiking(true);
    setShowLikeFx(true);
    setTimeout(() => setIsLiking(false), 300);
    setTimeout(() => setShowLikeFx(false), 450);
  };

  const handleLikeButton = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    triggerLikeAnimation();
    await toggleDiscussionLike(discussion.id);
  };

  const handleGestureLike = async () => {
    triggerLikeAnimation();

    if (discussion.isLiked) return;
    await toggleDiscussionLike(discussion.id);
  };

  const handleCardClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isInteractiveTarget(event.target)) return;

    const isCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    if (!isCoarsePointer) return;

    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    if (now - lastTapAtRef.current < 320) {
      lastTapAtRef.current = 0;
      clearPendingNavigation();
      void handleGestureLike();
      return;
    }

    lastTapAtRef.current = now;
    clearPendingNavigation();
    pendingNavigationRef.current = window.setTimeout(() => {
      pendingNavigationRef.current = null;
      navigate(`/community/discussions/${discussion.id}`);
    }, 330);
  };

  return (
    <Link
      to={`/community/discussions/${discussion.id}`}
      className="relative block bg-card rounded-xl p-3 sm:p-4 border border-border/50 transition-all hover:shadow-sm hover:border-border"
      onClick={handleCardClick}
      onDoubleClick={(event) => {
        if (isInteractiveTarget(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        void handleGestureLike();
      }}
    >
      {showLikeFx && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className="absolute h-20 w-20 rounded-full border-2 border-destructive/55 animate-ping" />
          <Heart className="h-14 w-14 text-destructive fill-destructive drop-shadow-md animate-pulse" />
        </div>
      )}
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
          <AvatarImage src={discussion.author.avatar} alt={discussion.author.name} />
          <AvatarFallback>{discussion.author.name[0]}</AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
          {/* Title */}
              <h3 className="font-medium text-foreground line-clamp-2 text-sm sm:text-base mb-1">
                {discussion.title}
              </h3>

              {/* Preview text */}
              {discussion.details && (
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                  {discussion.details}
                </p>
              )}
            </div>
          </div>

          {/* Meta row - Stack on mobile, inline on desktop */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
            {/* Line 1: Location + Topic */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {discussion.location.flag} {discussion.location.city || discussion.location.country}
              </span>
              <Badge variant="secondary" className="text-[10px] sm:text-xs font-normal">
                {discussionTopicLabels[discussion.topic]}
              </Badge>
            </div>
            {/* Line 2: Replies + Time */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {discussion.replyCount} {discussion.replyCount === 1 ? "reply" : "replies"}
              </span>
              <span>·</span>
              <span>{timeAgo}</span>
            </div>

            {/* Line 3: Like + Save */}
            <div className="flex items-center gap-1 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn("h-7 px-2 transition-transform duration-200", isLiking && "scale-110")}
                onClick={(event) => {
                  void handleLikeButton(event);
                }}
              >
                <Heart
                  className={cn(
                    "h-3.5 w-3.5 transition-all duration-200",
                    discussion.isLiked ? "fill-current text-red-500 scale-110" : ""
                  )}
                />
                <span className="ml-1 text-[11px]">{discussion.likes ?? 0}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  toggleDiscussionSave(discussion.id);
                }}
              >
                <Bookmark
                  className={`h-3.5 w-3.5 ${discussion.isSaved ? "fill-current" : ""}`}
                />
                <span className="ml-1 text-[11px]">{discussion.saves ?? 0}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
