import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Bookmark, MapPin, Clock, ArrowRight } from "lucide-react";
import { Story, storyTypeLabels } from "@/data/communityMockData";
import { fetchStories } from "@/lib/community";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function CommunityStoriesSection() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadStories = async () => {
      try {
        const data = await fetchStories(user?.id);
        // Get latest 3 stories
        setStories(data.slice(0, 3));
      } catch (error) {
        console.error("Failed to load stories:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStories();
  }, [user?.id]);

  const handleInteraction = (e: React.MouseEvent, action: string) => {
    if (!isAuthenticated) {
      e.preventDefault();
      e.stopPropagation();
      navigate("/auth", { state: { message: `Sign in to ${action}` } });
    }
  };

  if (loading) {
    return (
      <section className="py-12 sm:py-16">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Community Stories</h2>
              <p className="text-muted-foreground mt-1">Real travel experiences from fellow explorers</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl overflow-hidden border border-border/50 animate-pulse">
                <div className="aspect-[16/10] bg-muted" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (stories.length === 0) return null;

  return (
    <section className="py-12 sm:py-16">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Community Stories</h2>
            <p className="text-muted-foreground mt-1">Real travel experiences from fellow explorers</p>
          </div>
          <Link to="/community?tab=stories">
            <Button variant="ghost" className="gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stories.map((story) => (
            <article
              key={story.id}
              className="bg-card rounded-xl overflow-hidden shadow-sm border border-border/50 transition-shadow hover:shadow-md"
            >
              {/* Cover Image */}
              <Link to={`/community/stories/${story.slug}`}>
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={story.coverImage}
                    alt={story.title}
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                  />
                  <Badge
                    variant="secondary"
                    className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-background/90 backdrop-blur-sm text-[10px] sm:text-xs"
                  >
                    {storyTypeLabels[story.storyType]}
                  </Badge>
                </div>
              </Link>

              {/* Content */}
              <div className="p-3 sm:p-4">
                {/* Title */}
                <Link to={`/community/stories/${story.slug}`}>
                  <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 mb-1.5 sm:mb-2 hover:text-primary transition-colors">
                    {story.title}
                  </h3>
                </Link>

                {/* Excerpt */}
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2 sm:mb-3">
                  {story.excerpt}
                </p>

                {/* Meta info */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground mb-2 sm:mb-3">
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
                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/50">
                  <Link
                    to={`/user/${story.author.id}`}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                      <AvatarImage src={story.author.avatar} alt={story.author.name} />
                      <AvatarFallback className="text-xs">{story.author.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs sm:text-sm font-medium text-foreground">
                      {story.author.name}
                    </span>
                  </Link>

                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <button
                      onClick={(e) => handleInteraction(e, "like stories")}
                      className={cn(
                        "flex items-center gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg transition-all duration-200",
                        story.isLiked
                          ? "text-destructive bg-destructive/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      )}
                    >
                      <Heart className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", story.isLiked && "fill-current")} />
                      <span className="text-xs sm:text-sm">{story.likes}</span>
                    </button>

                    <button
                      onClick={(e) => handleInteraction(e, "save stories")}
                      className={cn(
                        "flex items-center gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg transition-all duration-200",
                        story.isSaved
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      )}
                    >
                      <Bookmark className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", story.isSaved && "fill-current")} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
