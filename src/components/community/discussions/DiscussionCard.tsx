import { MessageCircle, MapPin, Heart, Bookmark } from "lucide-react";
import { Link } from "react-router-dom";
import { Discussion, discussionTopicLabels } from "@/data/communityMockData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useCommunity } from "@/contexts/CommunityContext";

interface DiscussionCardProps {
  discussion: Discussion;
}

export function DiscussionCard({ discussion }: DiscussionCardProps) {
  const { toggleDiscussionLike, toggleDiscussionSave } = useCommunity();
  const timeAgo = formatDistanceToNow(discussion.createdAt, { addSuffix: true });

  return (
    <Link
      to={`/community/discussions/${discussion.id}`}
      className="block bg-card rounded-xl p-3 sm:p-4 border border-border/50 transition-all hover:shadow-sm hover:border-border"
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
          <AvatarImage src={discussion.author.avatar} alt={discussion.author.name} />
          <AvatarFallback>{discussion.author.name[0]}</AvatarFallback>
        </Avatar>

        {/* Content */}
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
                className="h-7 px-2"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  toggleDiscussionLike(discussion.id);
                }}
              >
                <Heart
                  className={`h-3.5 w-3.5 ${discussion.isLiked ? "fill-current text-red-500" : ""}`}
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
