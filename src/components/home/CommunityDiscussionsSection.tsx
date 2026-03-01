import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, CheckCircle2, MapPin, ArrowRight } from "lucide-react";
import { Discussion, discussionTopicLabels } from "@/data/communityMockData";
import { fetchDiscussions } from "@/lib/community";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export function CommunityDiscussionsSection() {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadDiscussions = async () => {
      try {
        const data = await fetchDiscussions();
        // Get latest 4 discussions
        setDiscussions(data.slice(0, 4));
      } catch (error) {
        console.error("Failed to load discussions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDiscussions();
  }, []);

  const handleAskQuestion = () => {
    if (!isAuthenticated) {
      navigate("/auth", { state: { message: "Sign in to ask questions" } });
    } else {
      navigate("/community?tab=discussions");
    }
  };

  if (loading) {
    return (
      <section className="py-12 sm:py-16 bg-muted/30">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Community Discussions</h2>
              <p className="text-muted-foreground mt-1">Get answers from experienced travelers</p>
            </div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-xl p-4 border border-border/50 animate-pulse">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (discussions.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Community Discussions</h2>
            <p className="text-muted-foreground mt-1">Get answers from experienced travelers</p>
          </div>
          <Link to="/community?tab=discussions">
            <Button variant="ghost" className="gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Discussions List */}
        <div className="space-y-3">
          {discussions.map((discussion) => {
            const timeAgo = formatDistanceToNow(discussion.createdAt, { addSuffix: true });

            return (
              <Link
                key={discussion.id}
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
                    {/* Title with answered badge */}
                    <div className="flex items-start gap-2 mb-1">
                      <h3 className="font-medium text-foreground line-clamp-2 flex-1 text-sm sm:text-base">
                        {discussion.title}
                      </h3>
                      {discussion.isAnswered && (
                        <Badge variant="outline" className="flex-shrink-0 text-[hsl(var(--success))] border-[0.5px] border-[hsl(var(--success))] gap-1 text-[10px] sm:text-xs">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="hidden sm:inline">Answered</span>
                          <span className="sm:hidden">✓</span>
                        </Badge>
                      )}
                    </div>

                    {/* Preview text */}
                    {discussion.details && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                        {discussion.details}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {discussion.location.flag} {discussion.location.city || discussion.location.country}
                        </span>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs font-normal">
                          {discussionTopicLabels[discussion.topic]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {discussion.replyCount} {discussion.replyCount === 1 ? "reply" : "replies"}
                        </span>
                        <span>·</span>
                        <span>{timeAgo}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleAskQuestion}
            size="lg"
            variant="outline"
            className="gap-2"
          >
            <MessageCircle className="h-5 w-5" />
            Ask a Question
          </Button>
        </div>
      </div>
    </section>
  );
}
