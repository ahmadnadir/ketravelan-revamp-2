/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  Share2,
  Heart,
  MessageCircle,
  MoreVertical,
  Car,
  Bed,
  Utensils,
  Ticket,
  Calendar,
  Route,
  Sparkles,
  Copy,
  Check,
  UserPlus,
  X,
  Pencil,
  Clock,
  ZoomIn,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { PillChip } from "@/components/shared/PillChip";
import { AvatarRow } from "@/components/shared/AvatarRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getPublishedTripById, PublishedTrip } from "@/lib/publishedTrips";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import SafetyNotice from "@/components/trip-details/SafetyNotice";
import { tripCategories } from "@/data/categories";
import { cn } from "@/lib/utils";
import { createJoinRequest, fetchJoinRequests, createTripInvite, cancelTrip } from "@/lib/trips";
import { useAuth } from "@/contexts/AuthContext";
import { createDirectConversation } from "@/lib/conversations";
import { useTripDetails, useJoinRequestStatus } from "@/hooks/useTrips";
import { useQueryClient } from "@tanstack/react-query";
import { TripDetailsSkeleton } from "@/components/skeletons/TripDetailsSkeleton";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Helmet } from "react-helmet-async";
import { isTripSaved, saveTrip, unsaveTrip } from "@/lib/savedTrips";
import { convertPrice, getCurrencySymbol } from "@/lib/currencyUtils";
import { SEOHead } from "@/components/seo/SEOHead";
import { TripSchema } from "@/components/seo/TripSchema";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";
import { FAQSchema } from "@/components/seo/FAQSchema";

const iconMap: Record<string, any> = {
  car: Car,
  bed: Bed,
  utensils: Utensils,
  ticket: Ticket,
  transport: Car,
  accommodation: Bed,
  food: Utensils,
  activities: Ticket,
};

// Build category lookup from tripCategories
const categoryLookup: Record<string, { label: string; icon: string }> = {};
tripCategories.forEach(cat => {
  categoryLookup[cat.id] = { label: cat.label, icon: cat.icon };
});

// Normalize image source to support base64 strings and URLs
function normalizeImageSrc(src: string): string {
  if (!src) return src;
  const trimmed = String(src).trim();
  // Already a data URL, http(s) URL, blob URL, or absolute path
  if (
    /^(data:image\/[a-zA-Z]+;base64,)/.test(trimmed) ||
    /^https?:\/\//.test(trimmed) ||
    /^blob:/.test(trimmed) ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  // Assume bare base64 and default to JPEG
  return `data:image/jpeg;base64,${trimmed}`;
}

// Helper to generate fallback avatar
const getDefaultAvatar = (seed: string) => {
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}`;
};

// Generate contextual value proposition based on trip data
const generateValueProposition = (tripData: any): string => {
  const tags = tripData.tags || [];
  const groupSize = tripData.totalSlots || 8;
  const price = tripData.price || 0;
  
  const vibeWords = [];
  if (tags.some((t: string) => t.toLowerCase().includes('outdoor') || t.toLowerCase().includes('adventure'))) {
    vibeWords.push('adventure-filled');
  } else if (tags.some((t: string) => t.toLowerCase().includes('city') || t.toLowerCase().includes('urban'))) {
    vibeWords.push('cultural');
  } else if (tags.some((t: string) => t.toLowerCase().includes('beach'))) {
    vibeWords.push('relaxing');
  } else {
    vibeWords.push('memorable');
  }
  
  const budgetLevel = price < 500 ? 'budget-friendly' : price < 800 ? 'well-planned' : 'curated';
  const groupDesc = groupSize <= 6 ? 'intimate' : groupSize <= 10 ? 'small group' : 'community';
  
  return `A ${vibeWords[0]}, ${budgetLevel} escape for travelers who enjoy ${groupDesc} adventures.`;
};

// Generate urgency text based on slots
const getUrgencyText = (joined: number, total: number): string => {
  const slotsLeft = total - joined;
  if (slotsLeft <= 2) return "Almost full";
  if (slotsLeft <= Math.floor(total / 2)) return "Filling up";
  return "Spots available";
};

// Parse description into bullet points
const parseDescriptionToBullets = (description: string): string[] => {
  // Try to extract key phrases from the description
  const sentences = description.split(/[.!]/).filter(s => s.trim().length > 10);
  const bullets: string[] = [];
  
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    if (trimmed.length > 0 && bullets.length < 4) {
      // Clean up and shorten if needed
      let bullet = trimmed;
      if (bullet.length > 80) {
        bullet = bullet.substring(0, 77) + '...';
      }
      bullets.push(bullet);
    }
  });
  
  return bullets.length > 0 ? bullets : [description];
};

export default function TripDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [currentImage, setCurrentImage] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [isFavourited, setIsFavourited] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, homeCurrency } = useAuth();
  const queryClient = useQueryClient();
  
  // State for converted budget breakdown
  const [convertedBudgetBreakdown, setConvertedBudgetBreakdown] = useState<{ category: string; amount: number; icon: string }[]>([]);
  const [convertedTotalPrice, setConvertedTotalPrice] = useState(0);

  // Join confirmation modal state
  const [showJoinConfirmModal, setShowJoinConfirmModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");
  const [joinNote, setJoinNote] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [isCancellingTrip, setIsCancellingTrip] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Fetch trip details with React Query
  const isLoading = useSimulatedLoading(700);
  const { data: dbTrip, isLoading: dbTripLoading, error } = useTripDetails(id);
  // Fetch join request status
  const { data: joinRequest } = useJoinRequestStatus(
    dbTrip?.id,
    user?.id
  );
  
  // Try to load from published trips first, then fall back to mock data
  const publishedTrip = useMemo(() => id ? getPublishedTripById(id) : null, [id]);

  // Normalize data for display
  const tripData = useMemo(() => {
    if (dbTrip) {
      // Convert budget_breakdown object to array format
      let budgetBreakdown: { category: string; amount: number; icon: string }[] = [];
      if (dbTrip.budget_breakdown && typeof dbTrip.budget_breakdown === 'object' && !Array.isArray(dbTrip.budget_breakdown)) {
        // Check if it's the new format with total and categories array
        if ('total' in dbTrip.budget_breakdown && Array.isArray((dbTrip.budget_breakdown as any).categories)) {
          const total = Number((dbTrip.budget_breakdown as any).total) || 0;
          const categories = (dbTrip.budget_breakdown as any).categories || [];
          const amountPerCategory = categories.length > 0 ? Math.floor(total / categories.length) : 0;
          budgetBreakdown = categories.map((cat: string) => ({
            category: cat.charAt(0).toUpperCase() + cat.slice(1),
            amount: amountPerCategory,
            icon: cat.toLowerCase(),
          }));
        } else {
          // Handle old format with key-value pairs {Food: 100, Stay: 500}
          budgetBreakdown = Object.entries(dbTrip.budget_breakdown).map(([cat, amount]) => ({
            category: cat.charAt(0).toUpperCase() + cat.slice(1),
            amount: Number(amount) || 0,
            icon: cat.toLowerCase(),
          }));
        }
      }
      
      const travelStyleTags = Array.isArray(dbTrip.travel_styles) ? dbTrip.travel_styles : [];
      const expectationTags = Array.isArray(dbTrip.tags) ? dbTrip.tags : [];

      const itineraryArray = Array.isArray(dbTrip.itinerary) ? dbTrip.itinerary : null;
      const notesFromArray = itineraryArray
        ? itineraryArray
            .map((item: any) => (typeof item?.notes === 'string' ? item.notes.trim() : ''))
            .filter(Boolean)
            .join('\n')
        : '';
      const dayByDayFromArray = itineraryArray
        ? itineraryArray.filter((item: any) => item && (item.day || item.activities))
        : [];
      const inferredItineraryType = itineraryArray
        ? (dayByDayFromArray.length > 0 ? 'dayByDay' : (notesFromArray ? 'notes' : 'skip'))
        : (dbTrip.itinerary_type || 'skip');

      return {
        id: dbTrip.id,
        title: dbTrip.title,
        destination: dbTrip.destination,
        description: dbTrip.description || `A trip to ${dbTrip.destination}`,
        tags: travelStyleTags.map((styleId: string) => categoryLookup[styleId]?.label || styleId),
        requirements: expectationTags,
        budgetBreakdown,
        price: Number(dbTrip.price) || 0,
        totalSlots: dbTrip.max_participants || 10,
        slotsLeft: (dbTrip.max_participants || 10) - (dbTrip.current_participants || 0),
        galleryImages: dbTrip.images?.length > 0 ? dbTrip.images : (dbTrip.cover_image ? [dbTrip.cover_image] : []),
        dateType: dbTrip.start_date ? 'set' as const : 'flexible' as const,
        startDate: dbTrip.start_date || '',
        endDate: dbTrip.end_date || '',
        itineraryType: inferredItineraryType,
        simpleNotes: Array.isArray(dbTrip.itinerary)
          ? notesFromArray
          : (dbTrip.itinerary?.simpleNotes || ''),
        dayByDayPlan: Array.isArray(dbTrip.itinerary)
          ? (inferredItineraryType === 'notes' ? [] : dayByDayFromArray)
          : (dbTrip.itinerary?.dayByDayPlan || []),
        visibility: dbTrip.visibility || 'public',
        travelStyleIds: [],
        additionalStops: [],
        creator: dbTrip.creator,
        trip_members: dbTrip.trip_members || [],
      };
    } else if (publishedTrip) {
      // Calculate total budget
      let totalBudget = 0;
      let budgetBreakdown: { category: string; amount: number; icon: string }[] = [];
      
      if (publishedTrip.budgetType === 'rough') {
        totalBudget = publishedTrip.roughBudgetTotal;
        budgetBreakdown = publishedTrip.roughBudgetCategories.map(cat => ({
          category: cat.charAt(0).toUpperCase() + cat.slice(1),
          amount: Math.round(publishedTrip.roughBudgetTotal / publishedTrip.roughBudgetCategories.length),
          icon: cat.toLowerCase(),
        }));
      } else if (publishedTrip.budgetType === 'detailed') {
        totalBudget = Object.values(publishedTrip.detailedBudget).reduce((a, b) => a + b, 0);
        budgetBreakdown = Object.entries(publishedTrip.detailedBudget).map(([cat, amount]) => ({
          category: cat.charAt(0).toUpperCase() + cat.slice(1),
          amount,
          icon: cat.toLowerCase(),
        }));
      }

      return {
        id: publishedTrip.id,
        title: publishedTrip.title,
        destination: publishedTrip.primaryDestination,
        additionalStops: publishedTrip.additionalStops,
        description: publishedTrip.description || `A ${publishedTrip.visibility} trip to ${publishedTrip.primaryDestination}${publishedTrip.additionalStops.length > 0 ? ` and ${publishedTrip.additionalStops.length} more stop${publishedTrip.additionalStops.length > 1 ? 's' : ''}` : ''}.`,
        tags: publishedTrip.travelStyles.map(s => categoryLookup[s]?.label || s),
        requirements: publishedTrip.expectations,
        budgetBreakdown,
        price: totalBudget,
        totalSlots: publishedTrip.groupSizeType === 'set' ? publishedTrip.groupSize : 10,
        slotsLeft: publishedTrip.groupSizeType === 'set' ? publishedTrip.groupSize - 1 : 9,
        galleryImages: publishedTrip.galleryImages,
        dateType: publishedTrip.dateType,
        startDate: publishedTrip.startDate,
        endDate: publishedTrip.endDate,
        itineraryType: publishedTrip.itineraryType,
        simpleNotes: publishedTrip.simpleNotes,
        dayByDayPlan: publishedTrip.dayByDayPlan,
        visibility: publishedTrip.visibility,
        travelStyleIds: publishedTrip.travelStyles,
      };
    }
  }, [dbTrip, publishedTrip]);
  
  // Convert budget breakdown and total price to home currency
  useEffect(() => {
    const convertBudgetData = async () => {
      if (!tripData?.budgetBreakdown || tripData.budgetBreakdown.length === 0) {
        setConvertedTotalPrice(0);
        setConvertedBudgetBreakdown([]);
        return;
      }
      
      try {
        // Use homeCurrency or default to MYR
        const currencyToUse = homeCurrency && homeCurrency !== "MYR" ? homeCurrency : homeCurrency || "MYR";
        
        // Only convert if not already in MYR
        if (currencyToUse === "MYR") {
          setConvertedTotalPrice(tripData.price);
          setConvertedBudgetBreakdown(tripData.budgetBreakdown);
          return;
        }
        
        // Convert total price
        const convertedTotal = await convertPrice(tripData.price, currencyToUse);
        setConvertedTotalPrice(convertedTotal);
        
        // Convert budget breakdown items
        const convertedItems = await Promise.all(
          tripData.budgetBreakdown.map(async (item) => ({
            ...item,
            amount: await convertPrice(item.amount, currencyToUse),
          }))
        );
        setConvertedBudgetBreakdown(convertedItems);
      } catch (error) {
        console.error('Error converting budget:', error);
        // Fallback to original values if conversion fails
        setConvertedTotalPrice(tripData.price);
        setConvertedBudgetBreakdown(tripData.budgetBreakdown);
      }
    };
    
    convertBudgetData();
  }, [tripData, homeCurrency]);


  // Handle errors
  if (error) {
    console.error('Error loading trip:', error);
    toast({
      title: "Error",
      description: "Failed to load trip details",
      variant: "destructive",
    });
  }

  // Determine join request status
  const joinRequestStatus = useMemo(() => {
    if (!dbTrip || !user) return 'none';
    
    // Check if user is a member
    const isMember = dbTrip?.trip_members?.some((m: any) => {
      const match = String(m.user?.id) === String(user.id);
      const notLeft = m.left_at === null || m.left_at === undefined || m.left_at === '';
      return match && notLeft;
    });
    
    if (isMember) return 'member';
    
    // Check join request status
    if (joinRequest) {
      return joinRequest.status === 'pending' ? 'pending' : 
             joinRequest.status === 'approved' ? 'approved' : 'none';
    }
    
    return 'none';
  }, [dbTrip, user, joinRequest]);

  const handleEditTrip = useCallback(() => {
    const target = dbTrip?.slug || id;
    if (target) {
      navigate(`/create?edit=${target}`);
    }
  }, [dbTrip?.slug, id, navigate]);

  // Determine if we're showing a published trip or mock trip
  const isPublishedTrip = !!publishedTrip;
  const isDbTrip = !!dbTrip;

  // Check if current user is the organizer
  const isOrganizer = isDbTrip && user && dbTrip?.creator_id === user.id;

  // Transform trip members from DB to UI format
  const transformedMembers = useMemo(() => {
    if (dbTrip?.trip_members) {
      return dbTrip.trip_members
        .filter((member: any) => !member.left_at)
        .map((member: any) => ({
          id: member.user?.id || '',
          name: member.user?.full_name || member.user?.username || 'User',
          imageUrl: member.user?.avatar_url || getDefaultAvatar(member.user?.id || member.user?.full_name || 'User'),
          role: member.is_admin ? 'Organizer' : 'Member',
          descriptor: member.role || '',
        }));
    }
    return [];
  }, [dbTrip]);


  // Find organizer from members or use creator from database
  const organizer = tripData && tripData.creator
    ? {
        id: tripData.creator.id,
        name: tripData.creator.full_name || tripData.creator.username || 'Trip Organizer',
        avatar: tripData.creator.avatar_url || getDefaultAvatar(tripData.creator.id || tripData.creator.full_name || 'User'),
        imageUrl: tripData.creator.avatar_url || getDefaultAvatar(tripData.creator.id || tripData.creator.full_name || 'User'),
        role: 'Organizer',
        bio: tripData.creator.bio || ''
      }
    : undefined;
  const joined = tripData ? tripData.totalSlots - tripData.slotsLeft : 0;
  const isTripFull = tripData ? tripData.slotsLeft <= 0 : false;
  const valueProposition = tripData ? generateValueProposition(tripData) : '';
  const urgencyText = tripData ? getUrgencyText(joined, tripData.totalSlots) : '';
  const descriptionBullets = tripData ? parseDescriptionToBullets(tripData.description) : [];
  const slotsStatusText = isTripFull ? 'Fulled' : urgencyText;
  const itineraryNotes = useMemo(() => {
    if (!tripData?.simpleNotes) return [];
    return tripData.simpleNotes
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  }, [tripData?.simpleNotes]);

  const images = useMemo(() => (tripData && tripData.galleryImages ? tripData.galleryImages : []).map(normalizeImageSrc), [tripData]);

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Photo lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // Booking calendar state
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const nextImage = () => setCurrentImage((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImage((prev) => (prev - 1 + images.length) % images.length);

  const tripUrl = `${window.location.origin}/trip/${id}`;
  const shareText = tripData ? `Check out this trip: ${tripData.title} to ${tripData.destination}` : "Check out this trip!";
  const returnTo = searchParams.get("from");
  const returnTab = searchParams.get("tab");
  const allowedExploreTabs = new Set(["upcoming", "past"]);
  const allowedMyTripsTabs = new Set(["upcoming", "previous", "draft"]);
  const backParams = new URLSearchParams();
  let backBasePath = "/explore";

  if (returnTo === "my-trips") {
    backBasePath = "/my-trips";
    if (returnTab && allowedMyTripsTabs.has(returnTab)) {
      backParams.set("tab", returnTab);
    }
  } else if (returnTo === "explore") {
    backBasePath = "/explore";
    if (returnTab && allowedExploreTabs.has(returnTab)) {
      backParams.set("tab", returnTab);
    }
  } else if (returnTab && allowedExploreTabs.has(returnTab)) {
    backBasePath = "/explore";
    backParams.set("tab", returnTab);
  }

  const backLink = backParams.toString()
    ? `${backBasePath}?${backParams.toString()}`
    : backBasePath;
  const backLabel = returnTo === "my-trips" ? "Back to My Trips" : "Back to Explore";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tripData.title,
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

  const handleFavourite = () => {
    setIsAnimating(true);
    const tripUUID = getTripUUID();
    if (!user?.id) {
      toast({ title: "Sign in required", description: "Please sign in to save trips." });
      setIsAnimating(false);
      return;
    }
    if (!tripUUID) {
      toast({ title: "Invalid trip", description: "Could not identify this trip." });
      setIsAnimating(false);
      return;
    }

    const next = !isFavourited;
    setIsFavourited(next);
    (async () => {
      const ok = next ? await saveTrip(tripUUID, user.id) : await unsaveTrip(tripUUID, user.id);
      if (!ok) {
        setIsFavourited(!next);
        toast({ title: "Failed", description: "Could not update favourites.", variant: "destructive" });
      } else {
        toast({ title: next ? "Added to favourites" : "Removed from favourites" });
      }
      setTimeout(() => setIsAnimating(false), 300);
    })();
  };

  function getTripUUID() {
    // Prefer dbTrip.id if available and is a valid UUID
    if (dbTrip?.id && /^[0-9a-fA-F-]{36}$/.test(dbTrip.id)) return dbTrip.id;
    // Fallback: check if id param is a valid UUID
    if (id && /^[0-9a-fA-F-]{36}$/.test(id)) return id;
    // Otherwise, return null
    return null;
  }

  // Load initial favourite state
  useEffect(() => {
    const tripUUID = getTripUUID();
    if (!tripUUID || !user?.id) return;
    (async () => {
      const saved = await isTripSaved(tripUUID, user.id);
      setIsFavourited(saved);
    })();
    // getTripUUID is a stable function; dependencies cover its inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, dbTrip?.id, id]);

  // After sending join request, update status
  const handleSendJoinRequest = async () => {
    const tripUUID = getTripUUID();
    if (!tripUUID) {
      toast({
        title: "Invalid trip ID",
        description: "Cannot send join request. Trip ID is not a valid UUID.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createJoinRequest(tripUUID, joinNote.trim() || undefined);
      setShowJoinConfirmModal(false);
      setJoinNote("");
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['joinRequest', tripUUID, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      
      // Fire notification to trip owner (email + push)
      try {
        const requesterName = user?.user_metadata?.full_name || (user?.email || '').split('@')[0] || 'Traveler';
        await supabase.functions.invoke('send-join-request-received', {
          body: {
            tripId: tripUUID,
            requesterId: user?.id,
            requesterName,
          },
        });
      } catch (e) {
        console.warn('Failed to send join request notification', e);
      }

      toast({
        title: "Request sent!",
        description: "The organizer will review your request to join this trip.",
      });
    } catch (error: any) {
      console.error('Failed to send join request:', error);
      if (error.code === '23503' && error.message?.includes('join_requests_user_id_fkey')) {
        toast({
          title: "Profile Required",
          description: (
            <span>
              You need to complete your profile before requesting to join a trip. Please visit your profile page and fill in your details.<br />
              <Button
                variant="secondary"
                className="mt-3"
                onClick={() => navigate('/profile')}
              >
                Go to Profile
              </Button>
            </span>
          ),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to send request",
          description: error.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Handler to start or open a direct conversation
  const handleMessageMember = async (memberId: string) => {
    try {
      const convo = await createDirectConversation(memberId);
      if (convo && convo.id) {
        navigate(`/chat/${convo.id}`);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not start conversation.",
        variant: "destructive",
      });
    }
  };

  const handleSendInvite = async () => {
    if (!dbTrip?.id) return;
    const email = inviteEmail.trim();
    if (!email) {
      toast({ title: "Email required", description: "Enter an email to invite." });
      return;
    }
    try {
      setIsInviting(true);
      await createTripInvite(dbTrip.id, email);
      toast({ title: "Invite sent", description: "The invite has been created." });
      setInviteEmail("");
      setShowInviteModal(false);
    } catch (error) {
      toast({
        title: "Invite failed",
        description: error instanceof Error ? error.message : "Could not send invite.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelTrip = async () => {
    if (!dbTrip?.id) return;
    try {
      setIsCancellingTrip(true);
      await cancelTrip(dbTrip.id);
      toast({ title: "Trip cancelled", description: "Participants have been notified." });
      navigate("/my-trips");
    } catch (error) {
      toast({
        title: "Cancel failed",
        description: error instanceof Error ? error.message : "Could not cancel trip.",
        variant: "destructive",
      });
    } finally {
      setIsCancellingTrip(false);
      setShowCancelConfirm(false);
    }
  };

  if (isLoading) {
    return <TripDetailsSkeleton />;
  }
  if (!tripData) {
    return (
      <AppLayout hideHeader>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <h2 className="text-lg font-semibold mb-2">Trip not found</h2>
          <p className="text-muted-foreground mb-4">We couldn't find the trip details. It may have been removed or is unavailable.</p>
          <Link to={backLink}>
            <Button variant="outline">{backLabel}</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  

  return (
    <>
      {/* SEO Meta Tags */}
      {tripData && (
        <>
          <SEOHead
            title={`${tripData.title} - ${tripData.destination}`}
            description={tripData.description}
            canonicalUrl={tripUrl}
            ogImage={images.length > 0 ? images[0] : ""}
            ogType="website"
            keywords={[
              tripData.destination,
              ...tripData.tags,
              "group trip",
              "travel",
              "adventure",
              ...tripData.requirements,
            ]}
            noIndex={isPublishedTrip ? publishedTrip?.visibility !== 'public' : dbTrip?.is_public === false}
          />

          <TripSchema
            name={tripData.title}
            description={tripData.description}
            destination={tripData.destination}
            startDate={dbTrip?.start_date}
            endDate={dbTrip?.end_date}
            price={tripData.price}
            currency={homeCurrency}
            image={images.length > 0 ? images[0] : ""}
            url={tripUrl}
            organizer={{
              name: dbTrip?.organizer_username || "Trip Organizer",
              url: dbTrip?.organizer_id ? `${window.location.origin}/user/${dbTrip.organizer_id}` : undefined,
            }}
            touristTypes={tripData.tags}
            itinerary={
              Array.isArray(dbTrip?.itinerary)
                ? dbTrip.itinerary.map((item: any) => ({
                    day: item.day || 0,
                    activities: Array.isArray(item.activities)
                      ? item.activities.map((a: any) => (typeof a === "string" ? a : a.name || ""))
                      : [],
                  }))
                : []
            }
            visibility={isPublishedTrip ? (publishedTrip?.visibility ? "public" : "private") : (dbTrip?.is_public ? "public" : "private")}
            geo={
              dbTrip?.destination_coords
                ? {
                    latitude: dbTrip.destination_coords.lat || 0,
                    longitude: dbTrip.destination_coords.lng || 0,
                  }
                : undefined
            }
          />

          <BreadcrumbSchema
            items={[
              { name: "Home", url: window.location.origin },
              { name: "Explore", url: `${window.location.origin}/explore` },
              { name: tripData.destination, url: `${window.location.origin}/explore?destination=${encodeURIComponent(tripData.destination)}` },
              { name: tripData.title, url: tripUrl },
            ]}
          />

          <OrganizationSchema />

          <FAQSchema
            items={[
              {
                question: `How do I join ${tripData.title}?`,
                answer: `To join this trip, click the "Join Trip" button, provide a message about yourself, and the trip organizer will review your request. You'll be notified once your request is approved.`,
              },
              {
                question: `What's included in the ${tripData.destination} trip budget?`,
                answer: `The total budget of ${getCurrencySymbol(homeCurrency)}${tripData.price.toLocaleString()} covers the following categories: ${tripData.budgetBreakdown.map((b) => `${b.category} (${getCurrencySymbol(homeCurrency)}${b.amount.toLocaleString()})`).join(", ")}.`,
              },
              {
                question: `When does the trip to ${tripData.destination} start?`,
                answer: `The trip starts on ${dbTrip?.start_date ? new Date(dbTrip.start_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "a date to be confirmed"}. Please refer to the trip details for the complete itinerary.`,
              },
              {
                question: `Who is organizing this trip to ${tripData.destination}?`,
                answer: `This trip is organized by ${dbTrip?.organizer_username || "an experienced travel organizer"}. You can visit their profile to learn more about their travel experience and previous trips.`,
              },
            ]}
          />
        </>
      )}

      {/* Photo Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden bg-black/95">
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
            
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setLightboxIndex((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-4 h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  onClick={() => setLightboxIndex((prev) => (prev + 1) % images.length)}
                  className="absolute right-4 h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              </>
            )}
            
            <img
              src={images[lightboxIndex]}
              alt={`Gallery image ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              {lightboxIndex + 1} / {images.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Booking Calendar Modal */}
      <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Dates</DialogTitle>
            <DialogDescription>
              Choose your preferred dates for this trip
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() + i);
                const isSelected = selectedDate?.toDateString() === date.toDateString();
                const isStartDate = tripData.startDate && new Date(tripData.startDate).toDateString() === date.toDateString();
                
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "h-10 w-10 rounded-lg text-sm transition-colors",
                      isSelected && "bg-primary text-primary-foreground",
                      isStartDate && "border-2 border-primary",
                      !isSelected && !isStartDate && "hover:bg-secondary"
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCalendar(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedDate) {
                    toast({
                      title: "Date Selected",
                      description: `You've selected ${selectedDate.toLocaleDateString()}`,
                    });
                    setShowCalendar(false);
                  }
                }}
                className="flex-1"
                disabled={!selectedDate}
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Share Modal */}
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="sm:max-w-sm w-[calc(100%-2rem)] max-w-sm left-1/2 -translate-x-1/2 rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-center">Share Trip</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Trip Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
              {images.length > 0 && (
                <img
                  src={images[0]}
                  alt={tripData ? tripData.title : "Trip"}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{tripData ? tripData.title : "Trip"}</p>
                <p className="text-xs text-muted-foreground truncate">{tripData ? tripData.destination : ""}</p>
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

      {/* Invite Modal */}
      {isDbTrip && isOrganizer && (
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
          <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] sm:w-full rounded-2xl">
            <DialogHeader>
              <DialogTitle>Invite by Email</DialogTitle>
              <DialogDescription>
                Invite someone to join this trip.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="friend@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button
                onClick={handleSendInvite}
                disabled={isInviting}
                className="w-full"
              >
                {isInviting ? "Inviting..." : "Send Invite"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Invited users will see the request in their approvals page.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel Confirmation */}
      {isDbTrip && isOrganizer && (
        <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
          <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] sm:w-full rounded-2xl">
            <DialogHeader>
              <DialogTitle>Cancel this trip?</DialogTitle>
              <DialogDescription>
                This will notify all participants and remove the trip from listings.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1"
              >
                Keep Trip
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelTrip}
                disabled={isCancellingTrip}
                className="flex-1"
              >
                {isCancellingTrip ? "Cancelling..." : "Cancel Trip"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AppLayout>
        <div className="pb-36">
        {/* Image Gallery */}
        {images.length > 0 && (
        <div className="relative -mx-4 sm:-mx-6">
          <div 
            className="aspect-[4/3] sm:aspect-[16/10] overflow-hidden cursor-pointer group"
            onClick={() => {
              setLightboxIndex(currentImage);
              setLightboxOpen(true);
            }}
          >
            <img
              src={images[currentImage]}
              alt={tripData.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-full p-3">
                <ZoomIn className="h-6 w-6 text-gray-800" />
              </div>
            </div>
          </div>

          {/* Back Button */}
          <Link
            to={backLink}
            className="absolute top-3 sm:top-4 left-3 sm:left-4 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
          </Link>

          {/* Actions */}
          <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex gap-1.5 sm:gap-2">
            <button 
              onClick={handleShare}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-95"
            >
              <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
            </button>
            <button 
              onClick={handleFavourite}
              className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center transition-all duration-300 ${isAnimating ? 'scale-125' : ''}`}
            >
              <Heart 
                className={`h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 ${
                  isFavourited 
                    ? 'fill-destructive text-destructive scale-110' 
                    : 'fill-transparent text-foreground'
                }`} 
              />
            </button>
            {isDbTrip && isOrganizer && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-95"
                    aria-label="Trip actions"
                  >
                    <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[12rem]">
                  <DropdownMenuItem onSelect={() => setShowInviteModal(true)}>
                    Invite by email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => setShowCancelConfirm(true)}
                    className="text-destructive focus:text-destructive"
                    disabled={isCancellingTrip}
                  >
                    {isCancellingTrip ? "Cancelling..." : "Cancel trip"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center"
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center"
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
              </button>

              {/* Thumbnails */}
              <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 max-w-[80%] overflow-x-auto scrollbar-hide">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImage(index)}
                    className={`h-10 w-14 sm:h-12 sm:w-16 rounded-lg overflow-hidden border-2 shrink-0 ${
                      index === currentImage ? "border-white" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        )}

        {/* Content */}
        <div className="pt-4 sm:pt-6 space-y-4 sm:space-y-6">
          {/* Title & Location */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{tripData.title}</h1>
              </div>
              {isPublishedTrip && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full shrink-0 ${
                  tripData.visibility === 'public' 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  {tripData.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">{tripData.destination}</span>
              </div>
              {/* Enhanced Slots with Urgency */}
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">
                  {joined}/{tripData.totalSlots} spots filled · <span className={isTripFull ? "text-destructive font-medium" : (tripData.slotsLeft <= 2 ? "text-primary font-medium" : "")}>{slotsStatusText}</span>
                </span>
              </div>
              {isPublishedTrip && tripData.dateType === 'exact' && tripData.startDate && (
                <button
                  onClick={() => setShowCalendar(true)}
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">
                    {new Date(tripData.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {tripData.endDate && ` - ${new Date(tripData.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  </span>
                </button>
              )}
            </div>

            {/* Route display for published trips */}
            {isPublishedTrip && tripData.additionalStops.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <Route className="h-3.5 w-3.5 text-primary" />
                <span className="px-2 py-1 bg-primary/10 text-primary rounded-full">
                  {tripData.destination}
                </span>
                {tripData.additionalStops.map((stop, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="text-muted-foreground">→</span>
                    <span className="px-2 py-1 bg-secondary text-foreground rounded-full">
                      {stop}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {/* Members Preview */}
            <AvatarRow avatars={transformedMembers} max={4} />

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {tripData.tags.map((tag) => {
                const category = tripCategories.find(c => c.label === tag);
                return (
                  <span
                    key={tag}
                    className="px-3 py-2 text-sm rounded-full border bg-white border-border text-muted-foreground flex items-center gap-2"
                  >
                    {category?.icon && <span>{category.icon}</span>}
                    {tag}
                  </span>
                );
              })}
            </div>
          </div>


          {/* Tabs */}
          <SegmentedControl
            options={[
              { label: "Overview", value: "overview" },
              { label: "Itinerary", value: "itinerary" },
              { label: "Members", value: "members" },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-3 sm:space-y-4">
              {/* Description - Now as bullet points */}
              <Card className="p-3 sm:p-4 border-border/50">
                <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">About This Trip</h3>
                <ul className="space-y-1.5 sm:space-y-2">
                  {descriptionBullets.map((bullet, index) => (
                    <li key={index} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 sm:mt-2 shrink-0" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Requirements */}
              {tripData.requirements.length > 0 && (
                <Card className="p-3 sm:p-4 border-border/50">
                  <h3 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">What to Expect</h3>
                  <ul className="space-y-1.5 sm:space-y-2">
                    {tripData.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 sm:mt-2 shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}


              {/* Budget Breakdown */}
              {tripData.budgetBreakdown.length > 0 && (
                <Card className="p-3 sm:p-4 border-border/50">
                  <h3 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">Budget Breakdown</h3>
                  <div className="space-y-2 sm:space-y-3">
                    {tripData.budgetBreakdown.map((item) => {
                      // Get the converted amount from convertedBudgetBreakdown or use original
                      // Try to find by exact category match first, then by normalized category name
                      const convertedItem = convertedBudgetBreakdown.find(c => 
                        c.category === item.category || 
                        c.category.toLowerCase() === item.category.toLowerCase()
                      );
                      const displayAmount = convertedItem?.amount ?? item.amount;
                      const currencyToDisplay = homeCurrency || "MYR";
                      // Map budget categories to emojis
                      const categoryEmojiMap: Record<string, string> = {
                        'Transport': '🚗',
                        'transport': '🚗',
                        'Accommodation': '🏨',
                        'accommodation': '🏨',
                        'Food & Drinks': '🍴',
                        'food': '🍴',
                        'Food': '🍴',
                        'Activities': '🎫',
                        'activities': '🎫',
                        'Flight': '✈️',
                        'flight': '✈️',
                        'Stay': '🏨',
                        'stay': '🏨',
                      };
                      const emoji = categoryEmojiMap[item.category] || categoryEmojiMap[item.icon] || '📦';
                      return (
                        <div key={item.category} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-secondary flex items-center justify-center shrink-0">
                              <span className="text-base sm:text-lg">{emoji}</span>
                            </div>
                            <span className="text-xs sm:text-sm text-foreground truncate">{item.category}</span>
                          </div>
                          <span className="font-semibold text-foreground text-sm sm:text-base shrink-0">
                            {getCurrencySymbol(currencyToDisplay)} {Math.round(displayAmount)}
                          </span>
                        </div>
                      );
                    })}
                    <div className="pt-2 sm:pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-sm sm:text-base">Total per person</span>
                        <span className="text-base sm:text-lg font-bold text-primary">
                          {getCurrencySymbol(homeCurrency || "MYR")} {Math.round(convertedTotalPrice || tripData.price)}
                        </span>
                      </div>
                      {/* Budget Clarification */}
                      <div className="mt-2 p-2 bg-secondary/50 rounded-lg">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-medium text-foreground">Estimated shared expenses.</span> This is the amount you should be prepared to spend during the trip. You don't pay this to the organizer — expenses are tracked and split transparently in the group.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* No budget set message */}
              {tripData.budgetBreakdown.length === 0 && (
                <Card className="p-3 sm:p-4 border-border/50">
                  <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">Budget</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Budget will be discussed in the group
                  </p>
                </Card>
              )}
            </div>
          )}

          {activeTab === "itinerary" && (
            <div className="space-y-3 sm:space-y-4">

              {/* Day-by-day itinerary */}
              {tripData.itineraryType === 'dayByDay' && tripData.dayByDayPlan.length > 0 && (
                <div className="space-y-3">
                  {tripData.dayByDayPlan.map((day, index) => (
                    <Card key={index} className="p-3 sm:p-4 border-border/50">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{day.day}</span>
                        </div>
                        <h3 className="font-semibold text-foreground text-sm sm:text-base">
                          Day {day.day}
                        </h3>
                      </div>
                      {Array.isArray(day.activities) && day.activities.length > 0 ? (
                        <ul className="space-y-1.5 sm:space-y-2 pl-10">
                          {day.activities.map((activity, actIndex) => (
                            <li key={actIndex} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 sm:mt-2 shrink-0" />
                              {activity}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs sm:text-sm text-muted-foreground pl-10">
                          No activities planned yet
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              {itineraryNotes.length > 0 && (
                <Card className="p-3 sm:p-4 border-border/50">
                  <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">Itinerary notes</h3>
                  {itineraryNotes.length === 1 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {itineraryNotes[0]}
                    </p>
                  ) : (
                    <ul className="space-y-1.5 sm:space-y-2">
                      {itineraryNotes.map((note, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 sm:mt-2 shrink-0" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )}


              {/* Empty state - Improved messaging */}
              {(tripData.itineraryType === 'skip' || 
                (tripData.itineraryType === 'notes' && itineraryNotes.length === 0) ||
                (tripData.itineraryType === 'dayByDay' && tripData.dayByDayPlan.length === 0)) && (
                <Card className="p-4 border-border/50">
                  <div className="text-center py-6 sm:py-8">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="h-6 w-6 text-primary/60" />
                    </div>
                    <p className="text-sm sm:text-base font-medium text-foreground mb-1">
                      Plans stay flexible
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
                      The detailed itinerary will be co-created together in the group chat after joining.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === "members" && (
            <div className="space-y-2 sm:space-y-3">
              {transformedMembers.length > 0 ? (
                transformedMembers.map((member) => (
                  <Card key={member.id} className="p-3 sm:p-4 border-border/50">
                    <div className="flex items-center gap-2 sm:gap-3">
                      {/* Clickable Avatar + Name area */}
                      {member.id ? (
                        <Link
                          to={`/user/${member.id}`}
                          className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                        >
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted overflow-hidden shrink-0">
                            {member.imageUrl ? (
                              <img src={member.imageUrl} alt={member.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground font-medium text-sm sm:text-base">
                                {member.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm sm:text-base truncate">{member.name}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">{member.role}</p>
                            {member.descriptor && (
                              <p className="text-xs text-muted-foreground/70">{member.descriptor}</p>
                            )}
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted overflow-hidden shrink-0">
                            {member.imageUrl ? (
                              <img src={member.imageUrl} alt={member.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground font-medium text-sm sm:text-base">
                                {member.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm sm:text-base truncate">{member.name}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">{member.role}</p>
                            {member.descriptor && (
                              <p className="text-xs text-muted-foreground/70">{member.descriptor}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Message button stays separate - hide for current user */}
                      {user && member.id && member.id !== user.id && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="shrink-0 text-xs sm:text-sm"
                          onClick={() => handleMessageMember(member.id)}
                        >
                          Message
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-4 border-border/50">
                  <div className="text-center py-6 sm:py-8">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Users className="h-6 w-6 text-primary/60" />
                    </div>
                    <p className="text-sm sm:text-base font-medium text-foreground mb-1">
                      No members yet
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
                      Be the first to join this trip!
                    </p>
                  </div>
                </Card>
              )}
            </div>
          )}

          

          {/* Safety Notice - Appears across all tabs */}
          <SafetyNotice />
        </div>
      </div>

      {/* Organizer actions: Edit + Trip Chat */}
      {isDbTrip && isOrganizer && (
        <div className="fixed bottom-above-nav left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border/50">
          <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                className="w-full rounded-xl text-sm sm:text-base gap-2 bg-black text-white hover:bg-neutral-800 border-none"
                variant="default"
                onClick={handleEditTrip}
              >
                <Pencil className="h-4 w-4" />
                Edit Trip
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-xl text-sm sm:text-base gap-2"
                onClick={() => navigate(`/trip/${dbTrip?.id || id}/hub`)}
              >
                <MessageCircle className="h-4 w-4" />
                Trip Chat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky CTA Bar */}
      {isDbTrip && !isOrganizer && (
        <div className="fixed bottom-above-nav left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border/50">
          <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              {joinRequestStatus === 'member' ? (
                <Button size="lg" disabled className="w-full rounded-xl text-sm sm:text-base gap-2">
                  <Check className="h-4 w-4" />
                  You're a member
                </Button>
              ) : joinRequestStatus === 'pending' ? (
                <Button
                  size="lg"
                  disabled
                  className="w-full rounded-xl text-sm sm:text-base gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Request Pending
                </Button>
              ) : joinRequestStatus === 'approved' ? (
                <Button size="lg" disabled className="w-full rounded-xl text-sm sm:text-base gap-2">
                  <Check className="h-4 w-4" />
                  Approved
                </Button>
              ) : (
                <Button
                  size="lg"
                  disabled={isTripFull}
                  className="w-full rounded-xl text-sm sm:text-base gap-2"
                  onClick={() => {
                    if (!user) {
                      navigate('/auth', { state: { from: location.pathname } });
                      return;
                    }
                    setShowJoinConfirmModal(true);
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                  Request to Join
                </Button>
              )}
              {joinRequestStatus === 'member' ? (
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full rounded-xl text-sm sm:text-base gap-2"
                  onClick={() => navigate(`/trip/${dbTrip?.id || id}/hub`)}
                >
                  <MessageCircle className="h-4 w-4" />
                  Trip Chat
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full rounded-xl text-sm sm:text-base gap-2"
                  onClick={() => setShowMessageModal(true)}
                >
                  <MessageCircle className="h-4 w-4" />
                  Message
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Request to Join Confirmation Modal */}
      <Dialog open={showJoinConfirmModal} onOpenChange={setShowJoinConfirmModal}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full rounded-2xl p-0 overflow-hidden [&>button]:hidden">
          <DialogHeader className="p-4 pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <DialogTitle>Request to Join Trip</DialogTitle>
              <button 
                onClick={() => setShowJoinConfirmModal(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <DialogDescription>
              Here's what happens when you request to join
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 space-y-4">
            {/* What happens next steps */}
            <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">1</div>
                <p className="text-sm text-muted-foreground">Your request is sent to the trip organizer</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">2</div>
                <p className="text-sm text-muted-foreground">They'll review your profile and message</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">3</div>
                <p className="text-sm text-muted-foreground">You'll be notified when they respond</p>
              </div>
            </div>

            {/* Message input */}
            <div className="space-y-2">
              <label htmlFor="join-note" className="text-sm font-medium">
                Introduce yourself <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                id="join-note"
                value={joinNote}
                onChange={(e) => setJoinNote(e.target.value.slice(0, 300))}
                placeholder={`Hi! I'd love to join your ${tripData.destination} trip. A bit about me...`}
                className="w-full min-h-[80px] p-3 rounded-xl border border-border/50 bg-background text-sm resize-none focus-visible:outline-none focus-visible:border-primary/50"
                maxLength={300}
              />
              <p className="text-xs text-muted-foreground text-right">
                {joinNote.length}/300
              </p>
            </div>
            
            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowJoinConfirmModal(false);
                  setJoinNote("");
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendJoinRequest}
                className="rounded-xl gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Organizer Modal */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full rounded-2xl p-0 overflow-hidden [&>button]:hidden">
          <DialogHeader className="p-4 pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <DialogTitle>Message Trip Organizer</DialogTitle>
              <button 
                onClick={() => setShowMessageModal(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <DialogDescription>
              Start a conversation with {organizer.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 space-y-4">
            {/* Organizer preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
              <img 
                src={organizer.imageUrl} 
                alt={organizer.name} 
                className="h-12 w-12 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{organizer.name}</p>
                <p className="text-xs text-muted-foreground">Trip Organizer</p>
              </div>
            </div>

            {/* Message input */}
            <div className="space-y-2">
              <label htmlFor="initial-message" className="text-sm font-medium">
                Your message
              </label>
              <textarea
                id="initial-message"
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value.slice(0, 500))}
                placeholder={`Hi ${organizer.name}, I'm interested in joining your ${tripData.destination} trip...`}
                className="w-full min-h-[100px] p-3 rounded-xl border border-border/50 bg-background text-sm resize-none focus-visible:outline-none focus-visible:border-primary/50"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {initialMessage.length}/500
              </p>
            </div>
            
            {/* Info note */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                Messages are private between you and the organizer. They typically respond within a few hours.
              </p>
            </div>
            
            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowMessageModal(false);
                  setInitialMessage("");
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  setShowMessageModal(false);
                  const messageParam = initialMessage.trim() 
                    ? `?message=${encodeURIComponent(initialMessage.trim())}` 
                    : "";
                  navigate(`/chat/${organizer.id}${messageParam}`);
                  setInitialMessage("");
                }}
                disabled={!initialMessage.trim()}
                className="rounded-xl gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </AppLayout>
    </>
  );
}
