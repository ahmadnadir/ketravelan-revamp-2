/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  MapPin,
  MessageCircle,
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
import { useUserTrips } from "@/hooks/useTrips";
import { getUserProfileById } from "@/lib/userProfile";
import { tripCategories } from "@/data/categories";
import { AppLayout } from "@/components/layout/AppLayout";
import { createDirectConversation } from "@/lib/conversations";
import { useToast } from "@/hooks/use-toast";

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
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllStyles, setShowAllStyles] = useState(false);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [showCoverImage, setShowCoverImage] = useState(false);

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
    try {
      const convo = await createDirectConversation(profile.id);
      if (convo?.id) {
        navigate(`/chat/${convo.id}`);
      } else {
        throw new Error("No conversation ID returned");
      }
    } catch (err) {
      console.error("Failed to create conversation:", err);
      toast({
        title: "Error",
        description: "Could not start conversation.",
        variant: "destructive",
      });
    }
  };

  const headerContent = (
    <header className="glass border-b border-border/50 pt-[env(safe-area-inset-top)]">
      <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-3 h-14">
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
      </div>
    </header>
  );

  if (loading) {
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

  return (
    <AppLayout
      headerContent={headerContent}
      showBottomNav={true}
      focusedFlow={true}
    >
      {/* Cover Photo Banner */}
      <div className="relative cursor-pointer">
        <div className="h-56 sm:h-64 w-full bg-muted overflow-hidden safe-top">
          {coverPhoto ? (
            <img
              src={coverPhoto}
              alt="Cover"
              onClick={() => setShowCoverImage(true)}
              className="h-full w-full object-cover hover:opacity-90 transition-opacity"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5" />
          )}
        </div>

        {/* Avatar - Centered, overlapping cover */}
        <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-3 sm:px-4">
          <div className="flex flex-col items-center -mt-16 sm:-mt-20">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg bg-white">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback>
                {displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
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
            <Button
              size="lg"
              className="w-full rounded-xl gap-2"
              onClick={handleMessage}
            >
              <MessageCircle className="h-5 w-5" />
              Message {displayName.split(" ")[0]}
            </Button>
          </div>
        </div>
      </div>

      {/* Cover Image Viewer Dialog */}      <Dialog open={showCoverImage} onOpenChange={setShowCoverImage}>
        <DialogContent className="max-w-4xl w-[95vw] border-border/50 p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>Cover Photo</DialogTitle>
          </DialogHeader>
          <div className="relative w-full">
            {coverPhoto ? (
              <img
                src={coverPhoto}
                alt="Cover"
                className="w-full h-auto max-h-[80vh] object-contain"
                loading="eager"
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">No cover photo</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UserProfilePage;
