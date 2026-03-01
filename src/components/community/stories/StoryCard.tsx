import { Heart, Bookmark, MapPin, Clock, Instagram, Youtube, Facebook, Twitter, Link2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Story, storyTypeLabels, storyTypeEmojis } from "../../../data/communityMockData";
import { useCommunity } from "@/hooks/useCommunity";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { getTravelStyleEmoji, getTravelStyleLabel } from "@/data/travelStyles";

interface StoryCardProps {
  story: Story;
}

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

export function StoryCard({ story }: StoryCardProps) {
  const { toggleStoryLike, toggleStorySave } = useCommunity();
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const storyTypes = story.storyTypes?.length ? story.storyTypes : [story.storyType];
  const travelStyles = story.travelStyleIds || [];
  const socialLinks = (story.socialLinks?.length ? story.socialLinks : story.author.socialLinks) || [];

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

  const handleLike = async () => {
    setIsLiking(true);
    await toggleStoryLike(story.id);
    setTimeout(() => setIsLiking(false), 300);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await toggleStorySave(story.id);
    setTimeout(() => setIsSaving(false), 300);
  };

  return (
    <article className="bg-card rounded-xl sm:rounded-2xl overflow-hidden shadow-sm border border-border/50 transition-shadow hover:shadow-md">
      {/* Cover Image */}
      <Link to={`/community/stories/${story.slug}`}>
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={story.coverImage}
            alt={story.title}
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap gap-1 max-w-[70%]">
            {storyTypes.map((type) => (
              <Badge
                key={`${story.id}-${type}`}
                variant="secondary"
                className="bg-background/90 backdrop-blur-sm text-[10px] sm:text-xs"
              >
                <span className="mr-1">{storyTypeEmojis[type]}</span>
                {storyTypeLabels[type]}
              </Badge>
            ))}
          </div>
          <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={cn(
                "h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center transition-transform duration-200",
                isLiking && "scale-110"
              )}
              aria-label="Like story"
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5 sm:h-4 sm:w-4 transition-all duration-200",
                  story.isLiked ? "fill-destructive text-destructive" : "text-muted-foreground"
                )}
              />
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center transition-transform duration-200",
                isSaving && "scale-110"
              )}
              aria-label="Save story"
            >
              <Bookmark
                className={cn(
                  "h-3.5 w-3.5 sm:h-4 sm:w-4 transition-all duration-200",
                  story.isSaved ? "fill-primary text-primary" : "text-muted-foreground"
                )}
              />
            </button>
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-3 sm:p-4">
        {/* Title */}
        <Link to={`/community/stories/${story.slug}`}>
          <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 mb-2 sm:mb-2 hover:text-primary transition-colors">
            {story.title}
          </h3>
        </Link>

        {/* Excerpt */}
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3 sm:mb-3">
          {story.excerpt}
        </p>

        {/* Meta info - stack on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs text-muted-foreground mb-3 sm:mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {story.location.flag} {story.location.city || story.location.country}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {story.readingTime} min read
          </span>
        </div>

        {travelStyles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 sm:mb-3">
            {travelStyles.slice(0, 4).map((styleId) => (
              <Badge key={`${story.id}-${styleId}`} variant="outline" className="text-[10px] sm:text-xs">
                <span className="mr-1">{getTravelStyleEmoji(styleId)}</span>
                {getTravelStyleLabel(styleId)}
              </Badge>
            ))}
          </div>
        )}

        {/* Author and actions */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
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
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                {socialLinks.map((link, index) => {
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
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-secondary/60 hover:text-foreground transition-colors"
                      aria-label={link.platform}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div className="text-[10px] sm:text-xs text-muted-foreground">
            {story.likes} likes • {story.saves} saves
          </div>
        </div>
      </div>
    </article>
  );
}
