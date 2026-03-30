import { useEffect, useState } from "react";
import { Calendar, MapPin, Users, Heart, Share2, Copy, MessageCircle, Check, Lock, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TripType } from "@/data/mockData";
import { tripCategories } from "@/data/categories";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { isTripSaved, saveTrip, unsaveTrip } from "@/lib/savedTrips";

interface TripCardProps {
  id: string;
  title: string;
  destination: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  price: number;
  displayCurrency?: string;
  slotsLeft: number;
  totalSlots: number;
  tags: string[];
  isAlmostFull?: boolean;
  isOngoing?: boolean;
  tripType?: TripType;
  className?: string;
  slug?: string;
  isPrivate?: boolean;
  status?: 'draft' | 'published';
  onDelete?: (tripId: string) => void;
  onCancel?: (tripId: string) => void;
  returnTo?: "explore" | "my-trips";
  returnTab?: string;
}

export function TripCard({
  id,
  title,
  destination,
  imageUrl,
  startDate,
  endDate,
  price,
  displayCurrency = "RM",
  slotsLeft,
  totalSlots,
  tags,
  isAlmostFull,
  isOngoing,
  tripType,
  className,
  slug,
  isPrivate,
  status,
  onDelete,
  onCancel,
  returnTo,
  returnTab,
}: TripCardProps) {
  const { user } = useAuth();
  const [isFavourited, setIsFavourited] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!onDelete) return;
    
    if (confirm("Are you sure you want to delete this draft trip?")) {
      setIsDeleting(true);
      try {
        onDelete(id);
      } catch (error) {
        console.error("Error deleting trip:", error);
        toast({
          title: "Error",
          description: "Failed to delete draft trip",
          variant: "destructive",
        });
        setIsDeleting(false);
      }
    }
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!onCancel) return;
    if (confirm("Cancel this trip? This will notify all participants.")) {
      try {
        onCancel(id);
      } catch (error) {
        console.error("Error cancelling trip:", error);
        toast({
          title: "Error",
          description: "Failed to cancel trip",
          variant: "destructive",
        });
      }
    }
  };

  // Fallbacks for all props
  // Use a special 'no photo' SVG icon if imageUrl is missing
  const noPhotoIcon = (
    <div className="flex items-center justify-center h-full w-full bg-muted text-muted-foreground">
      <img
        src="https://static.thenounproject.com/png/1211233-200.png"
        alt="No Photo"
        className="w-12 h-12 object-contain"
      />
    </div>
  );
  const hasImage = imageUrl && imageUrl.trim() !== "";
  const safeImageUrl = hasImage ? imageUrl : undefined;
  const safeTitle = title && title.trim() !== "" ? title : "Untitled Trip";
  const safeDestination = destination && destination.trim() !== "" ? destination : "Unknown Destination";
  const safeStartDate = startDate && startDate.trim() !== "" ? startDate : "TBA";
  const safeEndDate = endDate && endDate.trim() !== "" ? endDate : "TBA";
  const safeSlotsLeft = typeof slotsLeft === "number" && slotsLeft >= 0 ? slotsLeft : "?";
  const safeTotalSlots = typeof totalSlots === "number" && totalSlots > 0 ? totalSlots : "?";
  const safeTags = Array.isArray(tags) && tags.length > 0 ? tags : ["No tags"];
  let safePrice: string | number | null = null;
  if (typeof price === "number" && price > 0) safePrice = price;
  else if (typeof price === "number" && price === 0) safePrice = "Free";
  else safePrice = "TBA";
  const safeCurrency = displayCurrency && displayCurrency.trim() !== "" ? displayCurrency : "RM";
  const tripIdentifier = slug || id || "unknown";
  const returnParams = new URLSearchParams();
  if (returnTo) returnParams.set("from", returnTo);
  if (returnTab) returnParams.set("tab", returnTab);
  const returnSuffix = returnParams.toString();
  const tripLink = returnSuffix
    ? `/trip/${tripIdentifier}?${returnSuffix}`
    : `/trip/${tripIdentifier}`;
  const tripUrl = `${window.location.origin}${tripLink}`;
  const shareText = `Check out this trip: ${safeTitle} to ${safeDestination}`;

  const handleFavourite = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast({ title: "Sign in required", description: "Please sign in to save trips." });
      return;
    }
    setIsAnimating(true);
    const next = !isFavourited;
    setIsFavourited(next);
    (async () => {
      const ok = next ? await saveTrip(id, user.id) : await unsaveTrip(id, user.id);
      if (!ok) {
        // revert on failure
        setIsFavourited(!next);
        toast({ title: "Failed", description: "Could not update favourites.", variant: "destructive" });
      } else {
        toast({ title: next ? "Added to favourites" : "Removed from favourites" });
      }
      setTimeout(() => setIsAnimating(false), 300);
    })();
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
          url: tripUrl,
        });
      } catch (err) {
        // User cancelled or share failed - fall back to modal
        if ((err as Error).name !== 'AbortError') {
          setShareModalOpen(true);
        }
      }
    } else {
      // Fallback to custom modal
      setShareModalOpen(true);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(tripUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Trip link has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-green-500",
      onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText + " " + tripUrl)}`, "_blank"),
    },
    {
      name: "Facebook",
      icon: () => (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      color: "bg-blue-600",
      onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(tripUrl)}`, "_blank"),
    },
    {
      name: "Twitter",
      icon: () => (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      color: "bg-black dark:bg-white dark:text-black",
      onClick: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(tripUrl)}`, "_blank"),
    },
    {
      name: "Telegram",
      icon: () => (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      color: "bg-sky-500",
      onClick: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(tripUrl)}&text=${encodeURIComponent(shareText)}`, "_blank"),
    },
  ];

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const saved = await isTripSaved(id, user.id);
      setIsFavourited(saved);
    })();
  }, [user?.id, id]);

  return (
    <>
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="sm:max-w-sm w-[calc(100%-2rem)] max-w-sm left-1/2 -translate-x-1/2 rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-center">Share Trip</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Trip Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
              {hasImage ? (
                <img 
                  src={safeImageUrl} 
                  alt={safeTitle} 
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {noPhotoIcon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{safeTitle}</p>
                <p className="text-xs text-muted-foreground truncate">{safeDestination}</p>
              </div>
            </div>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                {copied ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <Copy className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm font-medium text-foreground">
                {copied ? "Copied!" : "Copy Link"}
              </span>
            </button>

            {/* Share Options */}
            <div className="grid grid-cols-4 gap-3">
              {shareOptions.map((option) => (
                <button
                  key={option.name}
                  onClick={() => {
                    option.onClick();
                    setShareModalOpen(false);
                  }}
                  className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-secondary transition-colors"
                >
                  <div className={cn("h-12 w-12 rounded-full flex items-center justify-center text-white", option.color)}>
                    <option.icon />
                  </div>
                  <span className="text-xs text-muted-foreground">{option.name}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className={cn("overflow-hidden border-border/50 shadow-sm flex flex-col h-full", className)}>
      <Link to={tripLink}>
        {/* Image */}
        <div className="relative aspect-[16/10] sm:aspect-[16/9] overflow-hidden">
          {hasImage ? (
            <img
              src={safeImageUrl}
              alt={safeTitle}
              className="h-full w-full object-cover transition-transform hover:scale-105"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-muted">
              {noPhotoIcon}
            </div>
          )}
          {(isAlmostFull || isOngoing || slotsLeft === 0) && (
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1">
              {isOngoing && (
                <span className="bg-emerald-500 text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
                  Ongoing
                </span>
              )}
              {slotsLeft === 0 ? (
                <span className="bg-red-500 text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
                  Full
                </span>
              ) : isAlmostFull && (
                <span className="bg-warning text-warning-foreground text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
                  Almost Full
                </span>
              )}
            </div>
          )}
          {/* Top-right controls and badges */}
          <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex items-center gap-1.5 sm:gap-2">
            {isPrivate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div aria-label="Private" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-card/80 backdrop-blur-sm border border-border/60 flex items-center justify-center">
                      <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Private</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-card/80 backdrop-blur-sm"
              onClick={handleShare}
            >
              <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className={cn(
                "h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-card/80 backdrop-blur-sm transition-transform duration-300",
                isAnimating && "scale-125"
              )}
              onClick={handleFavourite}
            >
              <Heart 
                className={cn(
                  "h-3.5 w-3.5 sm:h-4 sm:w-4 transition-all duration-300",
                  isFavourited ? "fill-destructive text-destructive scale-110" : "fill-transparent"
                )} 
              />
            </Button>
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 gap-2 sm:gap-3">
        <Link to={tripLink}>
          <h3 className="font-semibold text-foreground line-clamp-1 hover:text-primary transition-colors text-sm sm:text-base">
            {safeTitle}
          </h3>
        </Link>

        <div className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm">
          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span className="truncate">{safeDestination}</span>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm">
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span className="truncate">{safeStartDate} - {safeEndDate}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {safeTags.slice(0, 3).map((tag) => {
            // Find the emoji for this tag from categories, skip for fallback
            const category = tripCategories.find(
              (c) => c.label.toLowerCase() === tag.toLowerCase()
            );
            const emoji = category?.icon || "";
            return (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground"
              >
                {emoji && <span>{emoji}</span>}
                <span>{tag}</span>
              </span>
            );
          })}
          {Array.isArray(tags) && tags.length > 3 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
              +{tags.length - 3} more
            </span>
          )}
        </div>

        {/* Footer - pinned to bottom */}
        <div className="mt-auto pt-2 border-t border-border/50">
          <div className="flex items-center justify-between gap-2">
            {status === 'draft' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-xs sm:text-sm">{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </Button>
            ) : onCancel ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="text-destructive border-destructive/40 hover:bg-destructive/10 gap-1"
              >
                <X className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Cancel</span>
              </Button>
            ) : (
              <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm min-w-0">
                <Users className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0", slotsLeft === 0 ? "text-red-500" : "text-muted-foreground")} />
                <span className={cn("truncate font-medium", slotsLeft === 0 ? "text-red-500" : "text-muted-foreground")}>
                  {slotsLeft === 0 ? "0 slots left" : `${safeSlotsLeft} slots left`}
                </span>
              </div>
            )}
            <div className="text-right shrink-0 flex flex-col items-end">
              <span className="text-base sm:text-lg font-bold text-foreground">
                {safeCurrency} {safePrice != null ? safePrice.toLocaleString() : 'N/A'}
              </span>
              <span className="text-xs text-muted-foreground ml-1">budget per person</span>
            </div>
          </div>
        </div>
      </div>
      </Card>
    </>
  );
}
