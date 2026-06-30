/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  MapPin,
  MessageCircle,
  Ban,
  Instagram,
  Youtube,
  Linkedin,
  Globe,
  Camera,
  X,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PillChip } from "@/components/shared/PillChip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUserTrips } from "@/hooks/useTrips";
import { getUserProfileById } from "@/lib/userProfile";
import { tripCategories } from "@/data/categories";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { blockUser, isBlockedByUser, isUserBlocked, unblockUser } from "@/lib/blockUser";
import { ModerationMenu } from "@/components/moderation/ModerationMenu";

// Helper to generate fallback avatar
const getDefaultAvatar = (userId: string) => {
  const timestamp = Date.now();
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}&t=${timestamp}`;
};

// TikTok icon component (UI enhancement without changing existing integrations)
const TikTok = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Helper to find category icon by label
const getCategoryIcon = (styleLabel: string): string | undefined => {
  const category = tripCategories.find(
    (cat) => cat.label.toLowerCase() === styleLabel.toLowerCase()
  );
  return category?.icon;
};

const socialIcons: Record<string, any> = {
  instagram: Instagram,
  tiktok: TikTok,
  youtube: Youtube,
  linkedin: Linkedin,
  website: Globe,
};

const DEFAULT_COVER_PHOTO = "/default-cover-photo.png";

// About text component with truncation
const AboutText = ({ bio }: { bio: string }) => {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = bio.length > 150;

  return (
    <div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {shouldTruncate && !expanded ? `${bio.slice(0, 150)}...` : bio}
      </p>
      {shouldTruncate && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-primary font-medium mt-1"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
};

const UserProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllStyles, setShowAllStyles] = useState(false);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [showCoverImage, setShowCoverImage] = useState(false);
  const [showAvatarImage, setShowAvatarImage] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [viewerBlockedByProfileOwner, setViewerBlockedByProfileOwner] = useState(false);
  const [isViewerBlockCheckLoading, setIsViewerBlockCheckLoading] = useState(true);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    getUserProfileById(userId)
      .then((data) => {
        setProfile(data);
        setCoverPhoto(data?.cover_image || null);
        setLoading(false);
      })
      .catch((err) => {
        setProfile(null);
        setError("Profile not found");
        setLoading(false);
      });
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    const targetUserId = profile?.id;
    if (!user?.id || !targetUserId || user.id === targetUserId) {
      setIsBlocked(false);
      return;
    }

    (async () => {
      const blocked = await isUserBlocked(targetUserId);
      if (!cancelled) {
        setIsBlocked(blocked);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.id]);

  useEffect(() => {
    let cancelled = false;
    const targetUserId = profile?.id;

    if (!user?.id || !targetUserId || user.id === targetUserId) {
      setViewerBlockedByProfileOwner(false);
      setIsViewerBlockCheckLoading(false);
      return;
    }

    setIsViewerBlockCheckLoading(true);

    (async () => {
      try {
        const blockedByOwner = await isBlockedByUser(targetUserId, user.id);
        if (!cancelled) {
          setViewerBlockedByProfileOwner(blockedByOwner);
        }
      } catch (err) {
        console.error("Failed to check profile visibility:", err);
        if (!cancelled) {
          setViewerBlockedByProfileOwner(false);
        }
      } finally {
        if (!cancelled) {
          setIsViewerBlockCheckLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.id]);

  // Fetch user's trips for stats and previous trips
  const { data: trips = [], isLoading: tripsLoading } = useUserTrips(userId);
  const canShowTrips = profile?.show_trips_publicly !== false;
  const visibleTrips = canShowTrips ? trips : [];

  const previousTrips = Array.isArray(visibleTrips)
    ? visibleTrips.filter((trip: any) => {
        if (!trip.end_date) return false;
        const end = new Date(trip.end_date);
        const now = new Date();
        return end < now || ["completed", "cancelled"].includes(trip.status);
      })
    : [];

  const displayedStyles = (profile?.travel_styles || []).slice(0, 4);

  const handleMessage = async () => {
    if (!profile?.id) return;
    if (viewerBlockedByProfileOwner) {
      toast({
        title: "Unavailable",
        description: "You cannot message this user.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/chat/new/${profile.id}`);
  };

  const handleToggleBlock = async () => {
    if (!profile?.id) return;
    if (!user?.id) {
      toast({
        title: "Sign in required",
        description: "Please sign in to block users.",
        variant: "destructive",
      });
      return;
    }
    if (user.id === profile.id) return;

    setIsBlockLoading(true);
    try {
      if (isBlocked) {
        await unblockUser(profile.id);
        setIsBlocked(false);
        toast({
          title: "User unblocked",
          description: `You can interact with ${displayName.split(" ")[0]} again.`,
        });
      } else {
        await blockUser(profile.id, "Blocked from profile view");
        setIsBlocked(true);
        toast({
          title: "User blocked",
          description: "Their content and interactions will be limited for you.",
        });
      }
    } catch (err) {
      console.error("Failed to toggle block state:", err);
      toast({
        title: "Action failed",
        description: "Could not update block status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBlockLoading(false);
    }
  };

  const headerContent = (
    <header className="glass border-b border-border/50 safe-top safe-x">
      <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-3 sm:px-4">
        <div className="flex items-center h-14">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full bg-secondary"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </Button>
            <h1 className="font-semibold text-foreground">Profile</h1>
          </div>
          <div className="ml-auto">
            {user?.id && profile?.id && user.id !== profile.id && (
              <ModerationMenu
                reportType="USER"
                targetId={String(profile.id)}
                reportedUserId={String(profile.id)}
                targetLabel="User"
                reportLabel="Report User"
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );

  if (loading || isViewerBlockCheckLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <span className="text-muted-foreground">Loading profile...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <span className="text-destructive">
          {error || "Profile not found"}
        </span>
        <Button className="mt-4" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const displayName =
    profile.full_name || profile.username || "User";
  const avatarUrl = profile.avatar_url && profile.avatar_url.trim()
    ? profile.avatar_url
    : getDefaultAvatar(profile.id);
  const location = profile.location || "";
  const travelStyles = Array.isArray(profile.travel_styles)
    ? profile.travel_styles
    : [];
  const socialLinks = profile.social_links || {};
  const bio = profile.bio;
  const countriesCount = profile.countries_visited || 0;
  const tripsCount = visibleTrips.length;
  const coverImageUrl = coverPhoto || DEFAULT_COVER_PHOTO;

  if (viewerBlockedByProfileOwner) {
    return (
      <AppLayout
        headerContent={headerContent}
        showBottomNav={true}
        focusedFlow={true}
      >
        <div className="pt-10 pb-6">
          <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-3 sm:px-4">
            <Card className="p-6 text-center border-border/50">
              <h2 className="text-base font-semibold text-foreground">Profile unavailable</h2>
              <p className="text-sm text-muted-foreground mt-2">
                This user is not available to you.
              </p>
              <Button className="mt-4" onClick={() => navigate(-1)}>
                Go Back
              </Button>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      headerContent={headerContent}
      showBottomNav={true}
      focusedFlow={true}
    >
      {/* Cover Photo Banner */}
      <div className="relative cursor-pointer">
        <div className="h-48 sm:h-56 w-full bg-muted overflow-hidden">
          <img
            src={coverImageUrl}
            alt="Cover"
            onClick={() => setShowCoverImage(true)}
            className="h-full w-full object-cover hover:opacity-90 transition-opacity"
          />
        </div>

        {/* Avatar - Centered, overlapping cover */}
        <div className="max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-4">
          <div className="flex flex-col items-center -mt-12">
            <button
              type="button"
              onClick={() => setShowAvatarImage(true)}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/60"
            >
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg bg-white">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback>
                  {displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </div>

      <div className="pt-3 pb-6">
        <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-3 sm:px-4 space-y-6">
          <div className="flex flex-col items-center text-center space-y-1">
            <h2 className="text-xl font-bold text-foreground">
              {displayName}
            </h2>

            {location && (
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-sm">{location}</span>
              </div>
            )}

            {Object.keys(socialLinks).length > 0 && (
              <div className="flex items-center gap-3 pt-2">
                {Object.entries(socialLinks).map(([platform, url]) => {
                  const Icon = socialIcons[platform] || Globe;
                  if (!Icon || !url) return null;
                  return (
                    <a
                      key={platform}
                      href={String(url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 text-center border-border/50">
              <p className="text-xl font-bold text-foreground">
                {tripsCount}
              </p>
              <p className="text-xs text-muted-foreground">Trips</p>
            </Card>
            <Card className="p-3 text-center border-border/50">
              <p className="text-xl font-bold text-foreground">
                {countriesCount}
              </p>
              <p className="text-xs text-muted-foreground">
                Countries
              </p>
            </Card>
          </div>

          {bio && (
            <Card className="p-4 border-border/50">
              <h3 className="font-semibold text-foreground mb-2">
                About Me
              </h3>
              <AboutText bio={bio} />
            </Card>
          )}

          {travelStyles.length > 0 && (
            <Card className="p-3 border-border/50">
              <h3 className="font-semibold text-foreground mb-2">
                Travel Style
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {displayedStyles.map((style) => (
                  <PillChip
                    key={style}
                    label={style}
                    icon={getCategoryIcon(style)}
                    size="sm"
                  />
                ))}
                {travelStyles.length > 0 && (
                  <button
                    onClick={() => setShowAllStyles(true)}
                    className="inline-flex items-center px-2 py-1 text-xs text-primary font-medium"
                  >
                    {travelStyles.length > 4 ? `+${travelStyles.length - 4} more` : "View all"}
                  </button>
                )}
              </div>
            </Card>
          )}

          <Dialog open={showAllStyles} onOpenChange={setShowAllStyles}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Travel Style</DialogTitle>
              </DialogHeader>
              <div className="flex flex-wrap gap-2 pt-2">
                {travelStyles.map((style) => (
                  <PillChip
                    key={style}
                    label={style}
                    icon={getCategoryIcon(style)}
                  />
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">
              Previous Trips
            </h3>
            <div className="space-y-3">
              {!canShowTrips ? (
                <Card className="p-6 text-center border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Trips are private
                  </p>
                </Card>
              ) : previousTrips.length > 0 ? (
                previousTrips.map((trip: any) => (
                  <Link key={trip.id} to={`/trip/${trip.id}`}>
                    <Card className="overflow-hidden border-border/50 hover:bg-muted/30 transition-colors">
                      <div className="flex gap-3 p-3">
                        <div className="h-16 w-20 rounded-lg overflow-hidden shrink-0">
                          <img
                            src={
                              trip.cover_image ||
                              trip.coverImage ||
                              ""
                            }
                            alt={trip.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-sm truncate">
                            {trip.title}
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {trip.destination}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {trip.end_date
                              ? new Date(
                                  trip.end_date
                                ).toLocaleDateString(undefined, {
                                  month: "short",
                                  year: "numeric",
                                })
                              : ""}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))
              ) : (
                <Card className="p-6 text-center border-border/50">
                  <p className="text-sm text-muted-foreground">
                    No previous trips yet
                  </p>
                </Card>
              )}
            </div>
          </div>

          {/* Send Message Button */}
          <div className="pt-4">
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                className="flex-1 rounded-xl gap-2"
                onClick={handleMessage}
              >
                <MessageCircle className="h-5 w-5" />
                Message {displayName.split(" ")[0]}
              </Button>
            </div>
            {user?.id && user.id !== profile.id && (
              <Button
                size="lg"
                variant={isBlocked ? "outline" : "destructive"}
                className="w-full rounded-xl mt-3 gap-2"
                onClick={() => {
                  if (isBlocked) {
                    void handleToggleBlock();
                    return;
                  }
                  setConfirmBlockOpen(true);
                }}
                disabled={isBlockLoading}
              >
                <Ban className="h-4 w-4" />
                {isBlockLoading
                  ? (isBlocked ? "Unblocking..." : "Blocking...")
                  : (isBlocked ? "Unblock User" : "Block User")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmBlockOpen} onOpenChange={setConfirmBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block this user?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer receive messages from this user or see their direct chat in your messages list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBlockLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isBlockLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmBlockOpen(false);
                void handleToggleBlock();
              }}
            >
              {isBlockLoading ? "Blocking..." : "Block"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cover Image Viewer Dialog */}
      <Dialog open={showCoverImage} onOpenChange={setShowCoverImage}>
        <DialogContent className="max-w-4xl w-[95vw] border-border/50 p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>Cover Photo</DialogTitle>
          </DialogHeader>
          <div className="relative w-full">
            <img
              src={coverImageUrl}
              alt="Cover"
              className="w-full h-auto max-h-[80vh] object-contain"
              loading="eager"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-screen Avatar Viewer Dialog */}
      <Dialog open={showAvatarImage} onOpenChange={setShowAvatarImage}>
        <DialogContent className="max-w-4xl w-[100vw] h-[100vh] sm:w-[90vw] border-border/50 p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2 border-b border-border/50 flex-none relative">
            <DialogTitle className="text-center w-full">Profile Photo</DialogTitle>
            <button
              type="button"
              onClick={() => setShowAvatarImage(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors absolute right-4 bottom-2"
              aria-label="Close profile photo"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>
          <div className="flex-1 bg-black flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="max-w-full max-h-[85vh] object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted-foreground">No profile photo</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UserProfilePage;
