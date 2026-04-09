/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  MapPin,
  Camera,
  Instagram,
  Youtube,
  Linkedin,
  Facebook,
  Twitter,
  Ghost,
  AtSign,
  X,
  Loader2,
  AlertCircle,
  Link2,
  CircleDollarSign,
  User,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PillChip } from "@/components/shared/PillChip";
import { AppLayout } from "@/components/layout/AppLayout";
import { travelStyles as travelStylesData, getTravelStyleLabel, getTravelStyleEmoji } from "@/data/travelStyles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useUserTrips } from "@/hooks/useTrips";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { getCurrencyInfo, type CurrencyCode } from "@/lib/currencyUtils";
import { cn } from "@/lib/utils";
import { createDirectConversation } from "@/lib/conversations";
import { ImageCropModal } from "@/components/profile/ImageCropModal";
import { uploadImageFromDataUrl } from "@/lib/imageStorage";


// Helper to map stored travel style id/label to display label + emoji for consistent rendering
const resolveTravelStyle = (value: string) => ({
  label: getTravelStyleLabel(value),
  emoji: getTravelStyleEmoji(value),
});


// TikTok icon component
const TikTok = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Platform to icon mapping (now includes tiktok and other)
const platformIcons: Record<string, LucideIcon | typeof TikTok> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  snapchat: Ghost,
  x: Twitter,
  threads: AtSign,
  linkedin: Linkedin,
  tiktok: TikTok,
  other: Link2,
};



// AboutText component with Read more/less functionality

const AboutText = ({ text }: { text: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 120;
  const shouldTruncate = text && text.length > maxLength;
  if (!text) return null;
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {shouldTruncate && !isExpanded ? `${text.slice(0, maxLength)}...` : text}
      </p>
      {shouldTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-primary font-medium mt-1"
        >
          {isExpanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
};



export default function Profile() {
  const navigate = useNavigate();
  const { userId } = useParams(); // Get userId from URL parameter
  const { user, profile: currentUserProfile, loading, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [showAllPreviousTrips, setShowAllPreviousTrips] = useState(false);
  const [viewerMemberTripIds, setViewerMemberTripIds] = useState<string[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCoverImage, setShowCoverImage] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  // State for viewing another user's profile
  const [viewedProfile, setViewedProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  // Determine which profile to show: if userId is provided, fetch that user's profile; otherwise use current user's profile
  const isOwnProfile = !userId || userId === user?.id;
  const profile = isOwnProfile ? currentUserProfile : viewedProfile;
  const [coverPhoto, setCoverPhoto] = useState<string | null>(profile?.cover_image || null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarViewOpen, setAvatarViewOpen] = useState(false);
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);
  const [avatarImageToCrop, setAvatarImageToCrop] = useState<string>("");
  
  // Fetch other user's profile if viewing someone else's profile
  useEffect(() => {
    if (userId && userId !== user?.id) {
      const fetchProfile = async () => {
        setLoadingProfile(true);
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
          
          if (error) throw error;
          setViewedProfile(data);
          setCoverPhoto(data?.cover_image || null);
        } catch (error) {
          console.error("Error fetching profile:", error);
          toast({
            title: "Error",
            description: "Failed to load profile",
            variant: "destructive",
          });
        } finally {
          setLoadingProfile(false);
        }
      };
      fetchProfile();
    } else {
      setViewedProfile(null);
      setCoverPhoto(currentUserProfile?.cover_image || null);
    }
  }, [userId, user?.id, currentUserProfile, toast]);
  
  // Update cover photo when profile changes
  useEffect(() => {
    setCoverPhoto(profile?.cover_image || null);
  }, [profile?.cover_image]);

  // Fetch user's trips for stats and previous trips
  const profileUserId = profile?.id || user?.id;
  const { data: trips = [], isLoading: tripsLoading } = useUserTrips(profileUserId);

  useEffect(() => {
    const loadViewerMembership = async () => {
      if (isOwnProfile || !user?.id || !Array.isArray(trips) || trips.length === 0) {
        setViewerMemberTripIds([]);
        return;
      }

      const tripIds = trips.map((trip: any) => trip?.id).filter(Boolean);
      if (tripIds.length === 0) {
        setViewerMemberTripIds([]);
        return;
      }

      const { data, error } = await supabase
        .from("trip_members")
        .select("trip_id")
        .eq("user_id", user.id)
        .in("trip_id", tripIds)
        .is("left_at", null);

      if (error) {
        console.error("Error fetching viewer trip memberships:", error);
        setViewerMemberTripIds([]);
        return;
      }

      setViewerMemberTripIds(Array.isArray(data) ? data.map((row: any) => row.trip_id).filter(Boolean) : []);
    };

    loadViewerMembership();
  }, [isOwnProfile, user?.id, trips]);

  const canShowTrips = isOwnProfile || profile?.show_trips_publicly;
  const visibleTrips = canShowTrips
    ? (Array.isArray(trips)
        ? trips.filter((trip: any) => {
            if (isOwnProfile) return true;

            const visibility = String(trip?.visibility || "public").toLowerCase();
            const isPrivateTrip = visibility === "private";

            if (!isPrivateTrip) return true;
            return viewerMemberTripIds.includes(trip?.id);
          })
        : [])
    : [];
  const previousTrips = Array.isArray(visibleTrips)
    ? visibleTrips.filter((trip: any) => {
        // Treat trips as previous when they are explicitly closed, or their latest known date is in the past.
        const normalizedStatus = String(trip.status || "").toLowerCase();
        const closedStatuses = ["completed", "cancelled", "canceled", "ended", "archived", "done"];

        if (closedStatuses.includes(normalizedStatus)) return true;

        const dateToCheck = trip.end_date || trip.start_date || trip.created_at;
        if (!dateToCheck) return false;

        const tripDate = new Date(dateToCheck);
        if (Number.isNaN(tripDate.getTime())) return false;

        return tripDate < new Date();
      })
    : [];
  const previousTripsToRender = showAllPreviousTrips ? previousTrips : previousTrips.slice(0, 5);
  const hasMorePreviousTrips = previousTrips.length > 5;

  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 8MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      try {
        setUploadingCover(true);
        const publicUrl = await uploadImageFromDataUrl(dataUrl, {
          bucket: (import.meta as unknown as { env?: { VITE_PROFILE_COVERS_BUCKET?: string } }).env?.VITE_PROFILE_COVERS_BUCKET || "profile-covers",
          folder: `profiles/${user.id}`,
          filename: `cover-${Date.now()}`,
        });

        const { error } = await supabase
          .from("profiles")
          .update({ cover_image: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", user.id);

        if (error) throw error;

        setCoverPhoto(publicUrl);
        await refreshProfile();
        toast({ title: "Cover updated", description: "Your cover photo has been saved." });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to upload cover photo.";
        toast({ title: "Upload failed", description: message, variant: "destructive" });
      } finally {
        setUploadingCover(false);
      }
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;
      setAvatarImageToCrop(dataUrl);
      setAvatarCropOpen(true);
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to log out",
        variant: "destructive",
      });
    }
  };

  const handleAvatarCropComplete = async (croppedImage: string) => {
    if (!user) return;
    try {
      setUploadingAvatar(true);

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: croppedImage, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast({ title: "Photo updated", description: "Your profile photo has been saved." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update profile photo.";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleMessage = async () => {
    if (!profile?.id) return;
    try {
      const convo = await createDirectConversation(profile.id);
      if (convo?.id) {
        // Navigate directly to the conversation ID
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

  // No footer content - buttons will be at the bottom of scrollable area instead

  if (loading || loadingProfile) {
    return (
      <AppLayout showBottomNav={true} fullWidth mainClassName="px-0 sm:px-4">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout showBottomNav={true} fullWidth mainClassName="px-0 sm:px-4">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-6 max-w-md w-full text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Profile not found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't load your profile. Please try logging in again.
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Go to Login
            </Button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Fallback for incomplete profile
  if (user && !profile) {
    const displayName = user.email?.split("@")[0] || "User";
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
    
    return (
      <AppLayout showBottomNav={true} fullWidth mainClassName="px-0 sm:px-4">
        {/* Hidden file input for cover photo */}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverPhotoChange}
          className="hidden"
        />
        {/* Hidden file input for avatar photo */}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarFileSelect}
          className="hidden"
        />

        {/* Cover Photo Banner */}
        <div className="relative group">
          <div className="h-32 sm:h-40 w-full bg-muted overflow-hidden">
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg" />
          </div>

          {/* Avatar - Centered, overlapping cover */}
          <div className="max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-4">
            <div className="flex flex-col items-center -mt-12">
              <button
                type="button"
                onClick={() => setAvatarModalOpen(true)}
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/60"
              >
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                </Avatar>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="pt-3 pb-6">
          <div className="max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-4 space-y-4">
            {/* Profile Header - Identity */}
            <div className="flex flex-col items-center text-center space-y-1">
              <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
              <p className="text-sm text-muted-foreground">Complete your profile to get started</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 text-center border-border/50">
                <p className="text-xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Trips</p>
              </Card>
              <Card className="p-3 text-center border-border/50">
                <p className="text-xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Countries</p>
              </Card>
            </div>

            {/* About Me */}
            <Card className="p-4 border-border/50">
              <h3 className="font-semibold text-foreground mb-2 text-sm">About Me</h3>
              <p className="text-sm text-muted-foreground italic">No bio yet</p>
            </Card>

            {/* Travel Style */}
            <Card className="p-4 border-border/50">
              <h3 className="font-semibold text-foreground mb-3 text-sm">Travel Style</h3>
              <p className="text-sm text-muted-foreground italic">No travel styles selected</p>
            </Card>

            {/* Home Currency */}
            <Card className="p-4 border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Home Currency</span>
                </div>
                <span className="text-xs text-muted-foreground">Not set</span>
              </div>
            </Card>

            {/* Budget Range */}
            

            {/* Previous Trips */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground text-sm">Previous Trips</h3>
              <Card className="p-6 text-center border-border/50">
                <p className="text-sm text-muted-foreground">No previous trips yet</p>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Link to="/profile/edit" className="block">
                <Button size="lg" className="w-full rounded-xl">Edit Profile</Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full rounded-xl text-destructive hover:text-destructive text-sm sm:text-base border-destructive hover:border-destructive"
              >
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // --- Main Profile UI with real data ---
  const displayName = profile.full_name || profile.username || user.email?.split("@")[0] || "User";
  const gender = profile.gender || "";
  
  // Generate gender-based default avatar using Notion style
  const getDefaultAvatar = (userId: string, gender: string) => {
    const timestamp = Date.now(); // Cache buster
    if (gender === "male") {
      return `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}-female&t=${timestamp}`;
    } else if (gender === "female") {
      return `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}-male&t=${timestamp}`;
    }
    return `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}&t=${timestamp}`;
  };
  
  // Always use gender-based avatar if stored avatar is a dicebear URL
  // Only keep the avatar if it's a custom uploaded image (not from dicebear)
  const isDefaultDicebear = profile.avatar_url?.includes('dicebear.com');
  const avatarUrl = (!profile.avatar_url || isDefaultDicebear) ? getDefaultAvatar(profile.id, gender) : profile.avatar_url;
  const location = profile.location || "";
  const travelStyles = Array.isArray(profile.travel_styles) ? profile.travel_styles : [];
  const socialLinks = profile.social_links || {};
  const bio = profile.bio;
  const countriesCount = profile.countries_visited || 0;
  const tripsCount = visibleTrips.length;
  const homeCurrency = (profile.home_currency as CurrencyCode | undefined);
  const currencyInfo = homeCurrency ? getCurrencyInfo(homeCurrency) : undefined;

  return (
    <AppLayout showBottomNav={true} fullWidth mainClassName="px-0 sm:px-4">
      {/* Hidden file input for cover photo */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        onChange={handleCoverPhotoChange}
        className="hidden"
      />
      {/* Hidden file input for avatar photo */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarFileSelect}
        className="hidden"
      />

      {/* Cover Photo Banner */}
      <div className={cn("relative", isOwnProfile ? "group" : "cursor-pointer")}>
        <div className="h-48 sm:h-56 w-full bg-muted overflow-hidden">
          {coverPhoto ? (
            <img
              src={coverPhoto}
              alt="Cover"
              onClick={() => !isOwnProfile && setShowCoverImage(true)}
              className={cn("h-full w-full object-cover shadow-lg", !isOwnProfile && "hover:opacity-90 transition-opacity")}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg" />
          )}
        </div>
        {/* Edit Cover button - Only for owner */}
        {isOwnProfile && (
          <button
            onClick={() => !uploadingCover && coverInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
            disabled={uploadingCover}
          >
            <div className="flex items-center gap-2 text-white text-sm font-medium">
              <Camera className="h-4 w-4" />
              {uploadingCover ? "Uploading..." : "Edit Cover"}
            </div>
          </button>
        )}

        {/* Avatar - Centered, overlapping cover */}
        <div className="max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-4">
          <div className="flex flex-col items-center -mt-12">
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              disabled={!isOwnProfile}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/60 disabled:opacity-80 disabled:cursor-default"
            >
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-3 pb-6">
        <div className="max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-4 space-y-4">
          {/* Profile Header - Identity */}
          <div className="flex flex-col items-center text-center space-y-1">
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <h2 className="text-xl font-bold text-foreground leading-none">{displayName}</h2>
            </div>
            {profile.username && (
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <AtSign className="h-3.5 w-3.5" />
                <span className="text-sm">{profile.username}</span>
              </div>
            )}
            {location && (
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-sm">{location}</span>
              </div>
            )}

            {/* Social Links - Centered row */}
            {Object.keys(socialLinks).length > 0 && (
              <div className="flex items-center gap-3 pt-2">
                {Object.entries(socialLinks).map(([platform, rawUrl]) => {
                  if (!rawUrl) return null;

                  const value = String(rawUrl).trim();
                  if (!value) return null;

                  // Normalize platform key aliases
                  const normalizedPlatform = platform.toLowerCase() === "twitter" ? "x" : platform.toLowerCase();
                  const Icon = platformIcons[normalizedPlatform] || Link2;

                  // Normalize URLs for each platform so they always render as valid links
                  const normalizeUrl = (p: string, v: string) => {
                    if (/^https?:\/\//i.test(v)) return v;
                    const clean = v.replace(/^@/, "");
                    switch (p) {
                      case "instagram":
                        return `https://instagram.com/${clean}`;
                      case "facebook":
                        return `https://facebook.com/${clean}`;
                      case "youtube":
                        return `https://youtube.com/@${clean}`;
                      case "snapchat":
                        return `https://www.snapchat.com/add/${clean}`;
                      case "threads":
                        return `https://www.threads.net/@${clean}`;
                      case "linkedin":
                        return `https://linkedin.com/in/${clean}`;
                      case "tiktok":
                        return `https://tiktok.com/@${clean}`;
                      case "x":
                        return `https://x.com/${clean}`;
                      case "other":
                        return `https://${clean}`;
                      default:
                        return v;
                    }
                  };

                  const displayUrl = normalizeUrl(normalizedPlatform, value);

                  return (
                    <a
                      key={platform}
                      href={displayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={platform}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 text-center border-border/50">
              <p className="text-xl font-bold text-foreground">{tripsCount}</p>
              <p className="text-xs text-muted-foreground">Trips</p>
            </Card>
            <Card className="p-3 text-center border-border/50">
              <p className="text-xl font-bold text-foreground">{countriesCount}</p>
              <p className="text-xs text-muted-foreground">Countries</p>
            </Card>
          </div>

          {/* About Me */}
          {bio && (
            <Card className="p-4 border-border/50">
              <h3 className="font-semibold text-foreground mb-2 text-sm">About Me</h3>
              <AboutText text={bio} />
            </Card>
          )}

          {/* Travel Style */}
          {travelStyles.length > 0 && (
            <Card className="p-4 border-border/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground text-sm">Travel Style</h3>
                <span className="text-xs text-muted-foreground">{travelStyles.length} selected</span>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {travelStyles.map((style) => {
                  const meta = resolveTravelStyle(style);
                  return (
                    <PillChip key={style} label={meta.label} icon={meta.emoji} size="sm" />
                  );
                })}
              </div>
            </Card>
          )}

          {/* Home Currency */}
          <Card className="p-4 border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Home Currency</span>
              </div>
              {currencyInfo ? (
                <span className="text-sm font-medium text-muted-foreground">
                  {currencyInfo.symbol} {currencyInfo.code}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Not set</span>
              )}
            </div>
          </Card>

          {/* Previous Trips */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Previous Trips</h3>
            <div className="space-y-3">
              {!canShowTrips ? (
                <Card className="p-6 text-center border-border/50">
                  <p className="text-sm text-muted-foreground">Trips are private</p>
                </Card>
              ) : previousTrips.length > 0 ? previousTripsToRender.map((trip: any) => (
                <Link key={trip.id} to={`/trip/${trip.id}`}>
                  <Card className="overflow-hidden border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="flex gap-3 p-3">
                      <div className="h-16 w-20 rounded-lg overflow-hidden shrink-0">
                        <img
                          src={trip.cover_image || trip.coverImage || ''}
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
                          {(trip.end_date || trip.start_date || trip.created_at)
                            ? new Date(trip.end_date || trip.start_date || trip.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                            : ''}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              )) : (
                <Card className="p-6 text-center border-border/50">
                  <p className="text-sm text-muted-foreground">No previous trips yet</p>
                </Card>
              )}
              {canShowTrips && hasMorePreviousTrips && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={() => setShowAllPreviousTrips((prev) => !prev)}
                >
                  {showAllPreviousTrips ? "Show less" : `Show all previous trips (${previousTrips.length})`}
                </Button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4">
            {isOwnProfile ? (
              <>
                <Link to="/profile/edit" className="block">
                  <Button size="lg" className="w-full rounded-xl">Edit Profile</Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full rounded-xl text-destructive hover:text-destructive text-sm sm:text-base border-destructive hover:border-destructive"
                >
                  Log Out
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                className="w-full rounded-xl gap-2"
                onClick={handleMessage}
              >
                <MessageCircle className="h-5 w-5" />
                Message {profile?.full_name?.split(" ")[0] || profile?.username || "User"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cover Image Viewer Dialog - For non-owners */}
      <Dialog open={showCoverImage} onOpenChange={setShowCoverImage}>
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

      {/* Avatar options modal: view or change */}
      <Dialog open={avatarModalOpen} onOpenChange={setAvatarModalOpen}>
        <DialogContent className="max-w-sm w-[90vw] border-border/50 p-4 flex flex-col gap-3">
          <DialogHeader className="items-center">
            <DialogTitle className="text-base">Profile Photo</DialogTitle>
          </DialogHeader>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => {
              setAvatarModalOpen(false);
              setAvatarViewOpen(true);
            }}
          >
            View Photo
          </Button>
          {isOwnProfile && (
            <Button
              type="button"
              className="w-full rounded-xl"
              onClick={() => {
                if (!uploadingAvatar) {
                  avatarInputRef.current?.click();
                }
                setAvatarModalOpen(false);
              }}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? "Uploading..." : "Change Photo"}
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-screen avatar viewer */}
      <Dialog open={avatarViewOpen} onOpenChange={setAvatarViewOpen}>
        <DialogContent className="max-w-4xl w-[100vw] h-[100vh] sm:w-[90vw] border-border/50 p-0 overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2 border-b border-border/50 flex-none relative">
            <DialogTitle className="text-center w-full">Profile Photo</DialogTitle>
            <button
              type="button"
              onClick={() => setAvatarViewOpen(false)}
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

      {/* Avatar cropper modal */}
      <ImageCropModal
        open={avatarCropOpen}
        onOpenChange={setAvatarCropOpen}
        imageSrc={avatarImageToCrop}
        onCropComplete={handleAvatarCropComplete}
      />
    </AppLayout>
  );
}
