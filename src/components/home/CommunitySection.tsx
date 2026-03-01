import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Bookmark, MapPin, Clock, ArrowRight, MessageCircle, CheckCircle2, MessagesSquare, BookOpen } from "lucide-react";
import { Story, Discussion, storyTypeLabels, discussionTopicLabels } from "@/data/communityMockData";
import { fetchStories, fetchDiscussions } from "@/lib/community";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type TabValue = "stories" | "discussions";

export function CommunitySection() {
  const [activeTab, setActiveTab] = useState<TabValue>("stories");
  const [stories, setStories] = useState<Story[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [storiesData, discussionsData] = await Promise.all([
          fetchStories(user?.id),
          fetchDiscussions(),
        ]);
        setStories(storiesData.slice(0, 3));
        setDiscussions(discussionsData.slice(0, 4));
      } catch (error) {
        console.error("Failed to load community data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  const handleInteraction = (e: React.MouseEvent, action: string) => {
    if (!isAuthenticated) {
      e.preventDefault();
      e.stopPropagation();
      navigate("/auth", { state: { message: `Sign in to ${action}` } });
    }
  };

  const handleAskQuestion = () => {
    if (!isAuthenticated) {
      navigate("/auth", { state: { message: "Sign in to ask questions" } });
    } else {
      navigate("/community?tab=discussions");
    }
  };

  if (loading) {
    return (
      <section className="py-12 sm:py-16">
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="h-8 bg-muted rounded w-48 mb-2 animate-pulse" />
                <div className="h-4 bg-muted rounded w-64 animate-pulse" />
              </div>
            </div>
            <div className="h-10 bg-muted rounded-lg w-full mb-6 animate-pulse" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (stories.length === 0 && discussions.length === 0) return null;

  return (
    <section className="py-12 sm:py-16">
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <MessagesSquare className="h-7 w-7 text-primary" />
                Community
              </h2>
              <p className="text-muted-foreground mt-1">
                Real experiences and answers from fellow travelers
              </p>
            </div>
          </div>

          {/* Tabs - Segmented Control Style */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center bg-muted p-1 rounded-full">
              <button
                onClick={() => setActiveTab("stories")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all",
                  activeTab === "stories"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <BookOpen className="h-4 w-4" />
                Stories
              </button>
              <button
                onClick={() => setActiveTab("discussions")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all",
                  activeTab === "discussions"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageCircle className="h-4 w-4" />
                Discussions
              </button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
            <TabsList className="hidden">
              <TabsTrigger value="stories" />
              <TabsTrigger value="discussions" />
            </TabsList>

            {/* Stories Content */}
            <TabsContent value="stories" className="mt-0 space-y-4">
              {stories.map((story) => (
                <article
                  key={story.id}
                  className="bg-background rounded-xl overflow-hidden border border-border/50 transition-all hover:shadow-md"
                >
                  <div className="flex flex-col sm:flex-row gap-4 p-4">
                    {/* Cover Image */}
                    <Link to={`/community/stories/${story.slug}`} className="flex-shrink-0">
                      <div className="relative w-full sm:w-40 aspect-[16/10] sm:aspect-square overflow-hidden rounded-lg">
                        <img
                          src={story.coverImage}
                          alt={story.title}
                          className="w-full h-full object-cover transition-transform hover:scale-105"
                        />
                        <Badge
                          variant="secondary"
                          className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm text-[10px]"
                        >
                          {storyTypeLabels[story.storyType]}
                        </Badge>
                      </div>
                    </Link>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <Link to={`/community/stories/${story.slug}`}>
                        <h3 className="font-semibold text-base text-foreground line-clamp-2 mb-2 hover:text-primary transition-colors">
                          {story.title}
                        </h3>
                      </Link>

                      {/* Excerpt */}
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {story.excerpt}
                      </p>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {story.location.flag} {story.location.city || story.location.country}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {story.readingTime} min read
                        </span>
                      </div>

                      {/* Author and actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <Link
                          to={`/user/${story.author.id}`}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={story.author.avatar} alt={story.author.name} />
                            <AvatarFallback className="text-xs">{story.author.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground">
                            {story.author.name}
                          </span>
                        </Link>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleInteraction(e, "like stories")}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all duration-200",
                              story.isLiked
                                ? "text-destructive bg-destructive/10"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                            )}
                          >
                            <Heart className={cn("h-4 w-4", story.isLiked && "fill-current")} />
                            <span className="text-sm">{story.likes}</span>
                          </button>

                          <button
                            onClick={(e) => handleInteraction(e, "save stories")}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all duration-200",
                              story.isSaved
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                            )}
                          >
                            <Bookmark className={cn("h-4 w-4", story.isSaved && "fill-current")} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              {/* View All Button */}
              <div className="flex justify-center pt-2">
                <Link to="/community?tab=stories">
                  <Button variant="outline" className="gap-2">
                    View All Stories
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </TabsContent>

            {/* Discussions Content */}
            <TabsContent value="discussions" className="mt-0 space-y-3">
              {discussions.map((discussion) => {
                const timeAgo = formatDistanceToNow(discussion.createdAt, { addSuffix: true });

                return (
                  <Link
                    key={discussion.id}
                    to={`/community/discussions/${discussion.id}`}
                    className="block bg-background rounded-xl p-4 border border-border/50 transition-all hover:shadow-md hover:border-border"
                  >
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <Avatar className="h-10 w-10 flex-shrink-0">
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
                            <Badge
                              variant="outline"
                              className="flex-shrink-0 text-[hsl(var(--success))] border-[0.5px] border-[hsl(var(--success))] gap-1 text-[10px]"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span className="hidden sm:inline">Answered</span>
                              <span className="sm:hidden">✓</span>
                            </Badge>
                          )}
                        </div>

                        {/* Preview text */}
                        {discussion.details && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {discussion.details}
                          </p>
                        )}

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {discussion.location.flag} {discussion.location.city || discussion.location.country}
                          </span>
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {discussionTopicLabels[discussion.topic]}
                          </Badge>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {discussion.replyCount} {discussion.replyCount === 1 ? "reply" : "replies"}
                          </span>
                          <span>·</span>
                          <span>{timeAgo}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleAskQuestion}
                  variant="outline"
                  className="gap-2 flex-1"
                >
                  <MessageCircle className="h-4 w-4" />
                  Ask a Question
                </Button>
                <Link to="/community?tab=discussions" className="flex-1">
                  <Button variant="outline" className="gap-2 w-full">
                    View All Discussions
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}
