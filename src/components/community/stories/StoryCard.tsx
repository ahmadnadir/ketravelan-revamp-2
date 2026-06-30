import { Heart, Bookmark, MapPin, Clock, Instagram, Youtube, Facebook, Twitter, Link2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Story, storyTypeLabels, storyTypeEmojis } from "../../../data/communityMockData";
import { useCommunity } from "@/hooks/useCommunity";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRef, useState } from "react";
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
  const [showLikeFx, setShowLikeFx] = useState(false);
  const [showSaveFx, setShowSaveFx] = useState(false);
  const tapRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; at: number; active: boolean } | null>(null);
  const suppressNavigationUntilRef = useRef(0);
  const storyTypes = story.storyTypes?.length ? story.storyTypes : [story.storyType];
  const travelStyles = story.travelStyleIds || [];
  const socialLinks = (story.socialLinks?.length ? story.socialLinks : story.author.socialLinks) || [];

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest("button, a, input, textarea, select"));
  };

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
    setShowLikeFx(true);
    await toggleStoryLike(story.id);
    setTimeout(() => setIsLiking(false), 300);
    setTimeout(() => setShowLikeFx(false), 450);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setShowSaveFx(true);
    await toggleStorySave(story.id);
    setTimeout(() => setIsSaving(false), 300);
    setTimeout(() => setShowSaveFx(false), 500);
  };

  const handleGestureLike = async () => {
    // Double-tap should always trigger the like animation, even if already liked.
    setShowLikeFx(true);

    if (!story.isLiked) {
      setIsLiking(true);
      await toggleStoryLike(story.id);
      setTimeout(() => setIsLiking(false), 300);
    }

    setTimeout(() => setShowLikeFx(false), 450);
  };

  const handleGestureSave = async () => {
    // Downward drag gesture is intended to save quickly, not toggle off.
    if (!story.isSaved) {
      await handleSave();
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (isInteractiveTarget(event.target)) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      at: Date.now(),
      active: true,
    };
  };

  const handlePointerUp = async (event: React.PointerEvent<HTMLElement>) => {
    if (isInteractiveTarget(event.target)) {
      dragRef.current = null;
      return;
    }

    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.active) return;

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    const elapsed = Date.now() - drag.at;

    // Intentional downward drag to save.
    if (dy > 90 && Math.abs(dx) < 70 && elapsed < 900) {
      await handleGestureSave();
      tapRef.current = null;
      return;
    }

    // Treat short, steady taps as candidates for double-tap like.
    const isTap = Math.abs(dx) < 20 && Math.abs(dy) < 20 && elapsed < 350;
    if (!isTap) return;

    const now = Date.now();
    const lastTap = tapRef.current;
    if (lastTap && now - lastTap.at < 320) {
      suppressNavigationUntilRef.current = now + 380;
      tapRef.current = null;
      await handleGestureLike();
      return;
    }

    tapRef.current = { x: event.clientX, y: event.clientY, at: now };
  };

  return (
    <article
      className="bg-card rounded-xl sm:rounded-2xl overflow-hidden shadow-sm border border-border/50 transition-shadow hover:shadow-md"
      onDoubleClick={() => {
        void handleGestureLike();
      }}
      onClickCapture={(event) => {
        if (Date.now() > suppressNavigationUntilRef.current) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest("a")) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={(event) => {
        void handlePointerUp(event);
      }}
    >
      {/* Cover Image */}
      <Link to={`/community/stories/${story.slug}`}>
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={story.coverImage}
            alt={story.title}
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
          {showLikeFx && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <span className="absolute h-20 w-20 rounded-full border-2 border-destructive/55 animate-ping" />
              <Heart className="h-14 w-14 text-destructive fill-destructive drop-shadow-md animate-pulse" />
            </div>
          )}
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
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void handleLike();
              }}
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
            <div className="relative">
              {showSaveFx && (
                <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-primary/60 animate-ping" />
              )}
              <button
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleSave();
                }}
                disabled={isSaving}
                className={cn(
                  "relative h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center transition-transform duration-200",
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
