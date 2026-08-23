/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  MapPin,
  Camera,
  Globe,
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
  BadgeCheck,
  User,
  MessageCircle,
  Trash2,
  Ban,
  ChevronLeft,
  MoreVertical,
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
import { useAuth } from "@/contexts/AuthContext";
import { useUserTrips } from "@/hooks/useTrips";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { getCurrencyInfo, type CurrencyCode } from "@/lib/currencyUtils";
import { normalizePlatformKey, normalizeSocialLink } from "@/lib/socialLinks";
import { blockUser, isBlockedByUser, isUserBlocked, unblockUser } from "@/lib/blockUser";
import { ensureCurrentUserCanStartDirectChat } from "@/lib/familiesSafety";
import { ModerationMenu } from "@/components/moderation/ModerationMenu";
import { cn } from "@/lib/utils";
import { ImageCropModal } from "@/components/profile/ImageCropModal";
import { uploadImageFromDataUrl } from "@/lib/imageStorage";
import { countries } from "@/components/onboarding/CountrySelector";


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

const DEFAULT_COVER_PHOTO = "/default-cover-photo.png";
const DEFAULT_DESKTOP_COVER_PHOTO = "/default-cover-desktop.png";

const buildDicebearAvatar = (seed: string) =>
  `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundType=solid&backgroundColor=ffffff`;

const getDicebearSeedFromUrl = (url?: string | null) => {
  if (!url || !url.includes("api.dicebear.com")) return null;
  try {
    return new URL(url).searchParams.get("seed");
  } catch {
    return null;
  }
};

const buildDicebearChoices = (baseSeed: string) =>
  Array.from({ length: 12 }, (_, i) => buildDicebearAvatar(`${baseSeed}-${i + 1}`));

// Older/foreign DiceBear URLs may carry a random or gradient background; force solid white for consistency.
const normalizeAvatarUrl = (url: string) => {
  if (!url.includes("api.dicebear.com")) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("backgroundType", "solid");
    parsed.searchParams.set("backgroundColor", "ffffff");
    return parsed.toString();
  } catch {
    return url;
  }
};

const normalizeCountryName = (value?: string | null) => value?.trim().toLowerCase() || "";

const getCountryFromDestination = (destination?: string | null) => {
  if (!destination) return "";
  const parts = destination.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : destination.trim();
};

const getCountryFlag = (countryName: string) => {
  const match = countries.find((country) => normalizeCountryName(country.name) === normalizeCountryName(countryName));
  return match?.flag || "📍";
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
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const { userId } = useParams(); // Get userId from URL parameter
  const { user, profile: currentUserProfile, loading, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [showAllPreviousTrips, setShowAllPreviousTrips] = useState(false);
  const [showAllUpcomingTrips, setShowAllUpcomingTrips] = useState(false);
  const [activeTripsTab, setActiveTripsTab] = useState<"previous" | "upcoming">("previous");
  const [viewerMemberTripIds, setViewerMemberTripIds] = useState<string[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCoverImage, setShowCoverImage] = useState(false);
  const [showCoverActions, setShowCoverActions] = useState(false);
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
  const [changePhotoOptionsOpen, setChangePhotoOptionsOpen] = useState(false);
  const [dicebearModalOpen, setDicebearModalOpen] = useState(false);
  const [dicebearChoices, setDicebearChoices] = useState<string[]>([]);
  const [showCountriesModal, setShowCountriesModal] = useState(false);

  // Block/report state (only relevant when viewing another user's profile)
  const [isBlocked, setIsBlocked] = useState(false);
  const [viewerBlockedByProfileOwner, setViewerBlockedByProfileOwner] = useState(false);
  const [isViewerBlockCheckLoading, setIsViewerBlockCheckLoading] = useState(false);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  
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

  // Check whether the viewer has blocked (or is blocked by) the profile owner
  useEffect(() => {
    let cancelled = false;
    const targetUserId = profile?.id;

    if (isOwnProfile || !user?.id || !targetUserId) {
      setIsBlocked(false);
      setViewerBlockedByProfileOwner(false);
      setIsViewerBlockCheckLoading(false);
      return;
    }

    setIsViewerBlockCheckLoading(true);

    (async () => {
      try {
        const [blocked, blockedByOwner] = await Promise.all([
          isUserBlocked(targetUserId),
          isBlockedByUser(targetUserId, user.id),
        ]);
        if (!cancelled) {
          setIsBlocked(blocked);
          setViewerBlockedByProfileOwner(blockedByOwner);
        }
      } catch (err) {
        console.error("Failed to check block status:", err);
        if (!cancelled) {
          setIsBlocked(false);
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
  }, [isOwnProfile, user?.id, profile?.id]);

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
        const normalizedStatus = String(trip.status || "").toLowerCase();
        const isPublished = trip?.is_published === true || normalizedStatus === "published";
        if (!isPublished) return false;

        // Treat trips as previous when they are explicitly closed, or their latest known date is in the past.
        const closedStatuses = ["completed", "cancelled", "canceled", "ended", "archived", "done"];

        if (closedStatuses.includes(normalizedStatus)) return true;

        const dateToCheck = trip.end_date || trip.start_date || trip.created_at;
        if (!dateToCheck) return false;

        const tripDate = new Date(dateToCheck);
        if (Number.isNaN(tripDate.getTime())) return false;

        return tripDate < new Date();
      })
    : [];
  const upcomingTrips = Array.isArray(visibleTrips)
    ? visibleTrips.filter((trip: any) => {
        const normalizedStatus = String(trip.status || "").toLowerCase();
        const isPublished = trip?.is_published === true || normalizedStatus === "published";
        if (!isPublished) return false;

        const closedStatuses = ["completed", "cancelled", "canceled", "ended", "archived", "done"];
        if (closedStatuses.includes(normalizedStatus)) return false;

        const dateToCheck = trip.end_date || trip.start_date || trip.created_at;
        if (!dateToCheck) return false;

        const tripDate = new Date(dateToCheck);
        if (Number.isNaN(tripDate.getTime())) return false;

        return tripDate >= new Date();
      })
    : [];
  const previousTripsToRender = showAllPreviousTrips ? previousTrips : previousTrips.slice(0, 5);
  const upcomingTripsToRender = showAllUpcomingTrips ? upcomingTrips : upcomingTrips.slice(0, 5);
  const hasMorePreviousTrips = previousTrips.length > 5;
  const hasMoreUpcomingTrips = upcomingTrips.length > 5;
  const profileReturnPath = `${routerLocation.pathname}${routerLocation.search}`;

  // Hooks must run on every render, so this stays above the conditional early returns below.
  const visitedCountries = useMemo(() => {
    const seen = new Map<string, { name: string; flag: string }>();

    for (const trip of Array.isArray(visibleTrips) ? visibleTrips : []) {
      const countryName = getCountryFromDestination(String(trip?.destination || "").trim());
      const key = normalizeCountryName(countryName);
      if (!key || seen.has(key)) continue;

      seen.set(key, {
        name: countryName,
        flag: getCountryFlag(countryName),
      });
    }

    return Array.from(seen.values());
  }, [visibleTrips]);

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

  const updateAvatarUrl = async (nextAvatarUrl: string | null, successTitle: string, successDescription: string) => {
    if (!user || !isOwnProfile) return;

    try {
      setUploadingAvatar(true);

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: nextAvatarUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast({ title: successTitle, description: successDescription });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update profile photo.";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarModalOpen(false);
    await updateAvatarUrl(null, "Photo removed", "Your profile photo has been removed.");
  };

  const openDicebearPicker = () => {
    if (!profile?.id) return;
    const currentSeed =
      getDicebearSeedFromUrl(profile?.avatar_url) ||
      `${profile.id}-${Date.now()}`;
    setDicebearChoices(buildDicebearChoices(currentSeed));
    setChangePhotoOptionsOpen(false);
    setDicebearModalOpen(true);
  };

  const handleDicebearSelect = async (avatarOption: string) => {
    setDicebearModalOpen(false);
    await updateAvatarUrl(avatarOption, "Photo updated", "DiceBear avatar selected.");
  };

  const handleRemoveCoverPhoto = async () => {
    if (!user || !isOwnProfile) return;

    try {
      setUploadingCover(true);

      const { error } = await supabase
        .from("profiles")
        .update({ cover_image: null, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      setCoverPhoto(null);
      await refreshProfile();
      toast({
        title: "Cover removed",
        description: "Default cover photo is now applied.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove cover photo.";
      toast({
        title: "Remove failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUploadingCover(false);
    }
  };

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
    try {
      await ensureCurrentUserCanStartDirectChat(profile.id);
    } catch (err) {
      toast({
        title: "Messaging restricted",
        description: err instanceof Error ? err.message : "This chat is not available.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/chat/new/${profile.id}`);
  };

  const handleToggleBlock = async () => {
    if (!profile?.id || !user?.id || user.id === profile.id) return;

    setIsBlockLoading(true);
    try {
      if (isBlocked) {
        await unblockUser(profile.id);
        setIsBlocked(false);
        toast({
          title: "User unblocked",
          description: `You can interact with ${(profile.full_name || profile.username || "this user").split(" ")[0]} again.`,
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

  // No footer content - buttons will be at the bottom of scrollable area instead

  if (loading || loadingProfile || (!isOwnProfile && isViewerBlockCheckLoading)) {
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
  if (!isOwnProfile && viewerBlockedByProfileOwner) {
    return (
      <AppLayout showBottomNav={true} fullWidth mainClassName="px-0 sm:px-4">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-6 max-w-md w-full text-center">
            <h2 className="text-base font-semibold text-foreground">Profile unavailable</h2>
            <p className="text-sm text-muted-foreground mt-2">
              This user is not available to you.
            </p>
            <Button className="mt-4" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (user && !profile) {
    const displayName = user.email?.split("@")[0] || "User";
    const avatarUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(user.id)}&backgroundType=solid&backgroundColor=ffffff`;
    
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
      return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(`${userId}-female`)}&backgroundType=solid&backgroundColor=ffffff&t=${timestamp}`;
    } else if (gender === "female") {
      return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(`${userId}-male`)}&backgroundType=solid&backgroundColor=ffffff&t=${timestamp}`;
    }
    return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(userId)}&backgroundType=solid&backgroundColor=ffffff&t=${timestamp}`;
  };

  // Keep user-selected avatar exactly as saved, including DiceBear URLs.
  const avatarUrl = profile.avatar_url && String(profile.avatar_url).trim()
    ? normalizeAvatarUrl(String(profile.avatar_url))
    : "";
  const location = profile.location || "";
  const travelStyles = Array.isArray(profile.travel_styles) ? profile.travel_styles : [];
  const socialLinks = profile.social_links || {};
  const bio = profile.bio;
  const tripsCount = visibleTrips.length;
  const coverImageUrl = coverPhoto || DEFAULT_COVER_PHOTO;
  const coverImageDesktopUrl = coverPhoto || DEFAULT_DESKTOP_COVER_PHOTO;
  const homeCurrency = (profile.home_currency as CurrencyCode | undefined);
  const currencyInfo = homeCurrency ? getCurrencyInfo(homeCurrency) : undefined;

  const countriesCount = visitedCountries.length;

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
      <div className="relative">
        {!isOwnProfile && (
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full bg-background/80 backdrop-blur hover:bg-background"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </Button>
            {user?.id && profile?.id && user.id !== profile.id && (
              <ModerationMenu
                reportType="USER"
                targetId={String(profile.id)}
                reportedUserId={String(profile.id)}
                targetLabel="User"
                reportLabel="Report User"
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-background/80 backdrop-blur hover:bg-background"
                    aria-label="Profile actions"
                  >
                    <MoreVertical className="h-5 w-5 text-foreground" />
                  </Button>
                }
              />
            )}
          </div>
        )}
        <div className="h-48 sm:h-56 w-full bg-muted overflow-hidden">
          {coverPhoto ? (
            <img
              src={coverImageUrl}
              alt="Cover"
              onClick={() => {
                if (isOwnProfile) {
                  setShowCoverActions(true);
                } else {
                  setShowCoverImage(true);
                }
              }}
              className={cn(
                "h-full w-full object-cover shadow-lg cursor-pointer",
                !isOwnProfile && "hover:opacity-90 transition-opacity"
              )}
            />
          ) : (
            <picture>
              <source media="(min-width: 640px)" srcSet={DEFAULT_DESKTOP_COVER_PHOTO} />
              <img
                src={DEFAULT_COVER_PHOTO}
                alt="Default cover"
                onClick={() => {
                  if (isOwnProfile) {
                    setShowCoverActions(true);
                  } else {
                    setShowCoverImage(true);
                  }
                }}
                className={cn(
                  "h-full w-full object-cover shadow-lg cursor-pointer",
                  !isOwnProfile && "hover:opacity-90 transition-opacity"
                )}
              />
            </picture>
          )}
        </div>
        {/* Avatar - Centered, overlapping cover */}
        <div className="max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-4">
          <div className="flex flex-col items-center -mt-12">
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/60"
            >
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg bg-white">
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
                  const normalizedPlatform = normalizePlatformKey(platform);
                  const Icon = platformIcons[normalizedPlatform] || Link2;
                  const displayUrl = normalizeSocialLink(normalizedPlatform, value);
                  if (!displayUrl) return null;

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
            {isOwnProfile ? (
              <Link to="/my-trips" className="block">
                <Card className="p-3 text-center border-border/50 transition-colors hover:bg-muted/30">
                  <p className="text-xl font-bold text-foreground">{tripsCount}</p>
                  <p className="text-xs text-muted-foreground">Trips</p>
                </Card>
              </Link>
            ) : canShowTrips ? (
              <a href="#profile-trips-section" className="block">
                <Card className="p-3 text-center border-border/50 transition-colors hover:bg-muted/30">
                  <p className="text-xl font-bold text-foreground">{tripsCount}</p>
                  <p className="text-xs text-muted-foreground">Trips</p>
                </Card>
              </a>
            ) : (
              <Card className="p-3 text-center border-border/50">
                <p className="text-xl font-bold text-foreground">{tripsCount}</p>
                <p className="text-xs text-muted-foreground">Trips</p>
              </Card>
            )}
            <button type="button" onClick={() => setShowCountriesModal(true)} className="block text-left">
              <Card className="p-3 text-center border-border/50 transition-colors hover:bg-muted/30">
                <p className="text-xl font-bold text-foreground">{countriesCount}</p>
                <p className="text-xs text-muted-foreground">Countries</p>
              </Card>
            </button>
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
          <div id="profile-trips-section" className="space-y-3 scroll-mt-4">
            {isOwnProfile && (
              <div className="flex p-1 bg-secondary rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTripsTab("previous")}
                  className={cn(
                    "flex-1 flex items-center justify-center min-w-0 px-2 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all",
                    activeTripsTab === "previous"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Previous Trips
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTripsTab("upcoming")}
                  className={cn(
                    "flex-1 flex items-center justify-center min-w-0 px-2 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all",
                    activeTripsTab === "upcoming"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Upcoming Trips
                </button>
              </div>
            )}

            {(!isOwnProfile || activeTripsTab === "previous") && (
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground text-sm">Previous Trips</h3>
                <div className="space-y-3">
                  {!canShowTrips ? (
                    <Card className="p-6 text-center border-border/50">
                      <p className="text-sm text-muted-foreground">Trips are private</p>
                    </Card>
                  ) : previousTrips.length > 0 ? previousTripsToRender.map((trip: any) => {
                    const tripPathToken = trip?.slug || trip?.id;
                    const tripCardContent = (
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
                                ? new Date(trip.end_date || trip.start_date || trip.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                                : ''}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );

                    if (!tripPathToken) {
                      return (
                        <div key={trip.id || trip.title || trip.destination}>
                          {tripCardContent}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={trip.id || tripPathToken}
                        to={`/trip/${tripPathToken}?${new URLSearchParams({ return: profileReturnPath }).toString()}`}
                      >
                        {tripCardContent}
                      </Link>
                    );
                  }) : (
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
            )}

            {isOwnProfile && activeTripsTab === "upcoming" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground text-sm">Upcoming Trips</h3>
                <div className="space-y-3">
                  {!canShowTrips ? (
                    <Card className="p-6 text-center border-border/50">
                      <p className="text-sm text-muted-foreground">Trips are private</p>
                    </Card>
                  ) : upcomingTrips.length > 0 ? upcomingTripsToRender.map((trip: any) => {
                    const tripPathToken = trip?.slug || trip?.id;
                    const tripCardContent = (
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
                                ? new Date(trip.end_date || trip.start_date || trip.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                                : ''}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );

                    if (!tripPathToken) {
                      return (
                        <div key={trip.id || trip.title || trip.destination}>
                          {tripCardContent}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={trip.id || tripPathToken}
                        to={`/trip/${tripPathToken}?${new URLSearchParams({ return: profileReturnPath }).toString()}`}
                      >
                        {tripCardContent}
                      </Link>
                    );
                  }) : (
                    <Card className="p-6 text-center border-border/50">
                      <p className="text-sm text-muted-foreground">No upcoming trips yet</p>
                    </Card>
                  )}
                  {canShowTrips && hasMoreUpcomingTrips && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => setShowAllUpcomingTrips((prev) => !prev)}
                    >
                      {showAllUpcomingTrips ? "Show less" : `Show all upcoming trips (${upcomingTrips.length})`}
                    </Button>
                  )}
                </div>
              </div>
            )}
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
              <>
                <Button
                  size="lg"
                  className="w-full rounded-xl gap-2"
                  onClick={handleMessage}
                >
                  <MessageCircle className="h-5 w-5" />
                  Message {profile?.full_name?.split(" ")[0] || profile?.username || "User"}
                </Button>
                {user?.id && profile?.id && user.id !== profile.id && (
                  <Button
                    size="lg"
                    variant={isBlocked ? "outline" : "destructive"}
                    className="w-full rounded-xl gap-2"
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
              </>
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

      {/* Cover Image Viewer Dialog - For non-owners */}
      <Dialog open={showCoverImage} onOpenChange={setShowCoverImage}>
        <DialogContent className="max-w-4xl w-[95vw] border-border/50 p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>Cover Photo</DialogTitle>
          </DialogHeader>
          <div className="relative w-full">
            <img
              src={coverImageDesktopUrl}
              alt="Cover"
              className="w-full h-auto max-h-[80vh] object-contain"
              loading="eager"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Cover Actions Dialog - For owners */}
      <Dialog open={showCoverActions} onOpenChange={setShowCoverActions}>
        <DialogContent className="max-w-sm w-[90vw] border-border/50 p-4 flex flex-col gap-3">
          <DialogHeader className="items-center">
            <DialogTitle className="text-base">Cover Photo</DialogTitle>
          </DialogHeader>

          <Button
            type="button"
            className="w-full rounded-xl"
            onClick={() => {
              setShowCoverActions(false);
              if (!uploadingCover) coverInputRef.current?.click();
            }}
            disabled={uploadingCover}
          >
            {uploadingCover ? "Uploading..." : "Upload Cover"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl text-destructive border-destructive hover:text-destructive"
            onClick={() => {
              setShowCoverActions(false);
              handleRemoveCoverPhoto();
            }}
            disabled={uploadingCover || !coverPhoto}
          >
            Remove Cover
          </Button>
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
            <>
              <Button
                type="button"
                className="w-full rounded-xl"
                onClick={() => {
                  setAvatarModalOpen(false);
                  setChangePhotoOptionsOpen(true);
                }}
                disabled={uploadingAvatar}
              >
                Change Photo
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl text-destructive border-destructive hover:text-destructive"
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Photo
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={changePhotoOptionsOpen} onOpenChange={setChangePhotoOptionsOpen}>
        <DialogContent className="max-w-sm w-[90vw] border-border/50 p-4 flex flex-col gap-3">
          <DialogHeader className="items-center">
            <DialogTitle className="text-base">Change Photo</DialogTitle>
          </DialogHeader>

          <Button
            type="button"
            className="w-full rounded-xl"

            onClick={() => {
              if (!uploadingAvatar) {
                avatarInputRef.current?.click();
              }
              setChangePhotoOptionsOpen(false);
            }}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? "Uploading..." : "Upload Photo"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            onClick={openDicebearPicker}
            disabled={uploadingAvatar}
          >
            Choose Avatar
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={dicebearModalOpen} onOpenChange={setDicebearModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose an Avatar</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-3 pt-2">
            {dicebearChoices.map((avatarOption) => (
              <button
                key={avatarOption}
                type="button"
                onClick={() => handleDicebearSelect(avatarOption)}
                className="h-16 w-16 rounded-full border border-border bg-white overflow-hidden hover:border-primary transition-colors"
              >
                <img
                  src={avatarOption}
                  alt="DiceBear avatar option"
                  className="h-full w-full rounded-full bg-white object-cover"
                />
              </button>
            ))}
          </div>

          <div className="pt-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const refreshSeed = `${profile?.id || "user"}-${Date.now()}`;
                setDicebearChoices(buildDicebearChoices(refreshSeed));
              }}
            >
              Refresh options
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCountriesModal} onOpenChange={setShowCountriesModal}>
        <DialogContent className="max-w-4xl w-[94vw] border-border/50 p-0 overflow-hidden bg-background">
          <DialogHeader className="relative flex flex-row items-start justify-between gap-3 p-4 sm:p-6 pb-4 border-b border-border/50 bg-gradient-to-br from-sky-50/70 via-background to-background pr-14 sm:pr-16">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
              <div className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 via-slate-200 to-zinc-300 text-slate-500 shadow-sm ring-1 ring-slate-200/60">
                <Globe className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div className="min-w-0 pt-0.5">
                <DialogTitle className="text-xl sm:text-3xl font-semibold tracking-tight">Visited Countries</DialogTitle>
                <p className="mt-1 text-xs sm:text-base text-muted-foreground">
                  {countriesCount} places in a flag wall.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-3 sm:p-6 max-h-[72vh] overflow-y-auto">
            {visitedCountries.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
                {visitedCountries.map((country, index) => (
                  <div
                    key={country.name}
                    className={cn(
                      "group relative aspect-[1.25/1] overflow-hidden rounded-[22px] border border-border/60 bg-card shadow-[0_10px_35px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(15,23,42,0.10)] sm:aspect-[1.45/1] sm:rounded-[28px]",
                      index % 3 === 0 && "bg-gradient-to-br from-sky-50/90 via-background to-white",
                      index % 3 === 1 && "bg-gradient-to-br from-emerald-50/90 via-background to-white",
                      index % 3 === 2 && "bg-gradient-to-br from-amber-50/90 via-background to-white"
                    )}
                  >
                    <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.95),transparent_55%)]" />
                    <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/60 blur-2xl" />
                    <div className="relative flex h-full flex-col justify-between p-3 sm:p-5">
                      <div className="flex items-center justify-between">
                        <div className="rounded-full bg-white/85 px-2 py-1 text-[10px] sm:text-[11px] font-medium tracking-wide text-muted-foreground ring-1 ring-border/50 shadow-sm">
                          Visited
                        </div>
                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-white/90">
                          <BadgeCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                      </div>

                      <div className="flex flex-1 items-center justify-center px-1.5 sm:px-3">
                        <div className="flex h-16 w-16 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-white/85 text-4xl sm:text-5xl shadow-inner ring-1 ring-border/40">
                          {country.flag}
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-3">
                        <span className="text-sm sm:text-lg font-semibold text-foreground leading-tight truncate">
                          {country.name}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border/60 p-8 text-center bg-muted/20">
                <p className="text-sm text-muted-foreground">No visited countries found yet.</p>
              </div>
            )}
          </div>
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
