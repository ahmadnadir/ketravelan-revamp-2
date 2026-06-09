import { buildPublicUrl, buildTripShareUrl, getPublicBaseUrl } from "@/lib/publicUrl";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
  ZoomOut,
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
import { ModerationMenu } from "@/components/moderation/ModerationMenu";
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
import { createJoinRequest, fetchJoinRequests, createTripInvite, cancelTrip, deleteDraftTrip } from "@/lib/trips";
import { useAuth } from "@/contexts/AuthContext";
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
import { getLoadErrorFeedback } from "@/lib/requestErrors";

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

// Helper to format date as DDMMYY
const formatDateDDMMYY = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return "";
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[dateObj.getMonth()];
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();
  
  return `${month} ${day}, ${year}`;
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
  // Split by newlines to preserve the user's intended line breaks
  const lines = description.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);
  return lines.length > 0 ? lines : [description];
};

import { getExpectationIcon, getExpectationLabel } from "@/lib/expectationUtils";

const DEFAULT_TRIP_IMAGE = "/default-trip-photo.jpeg";

export default function TripDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
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
  const isSimulatedLoading = useSimulatedLoading(700);
  const { data: dbTrip, isLoading: dbTripLoading, isFetching: dbTripFetching, error } = useTripDetails(id);
  // Show skeleton while either the minimum polish delay OR the real request is still in flight
  const isLoading = isSimulatedLoading || dbTripLoading;
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

      const dbBudgetType = (dbTrip.budget_breakdown && typeof dbTrip.budget_breakdown === 'object' && !Array.isArray(dbTrip.budget_breakdown) && 'total' in dbTrip.budget_breakdown && Array.isArray((dbTrip.budget_breakdown as any).categories)) ? 'rough' : 'detailed';

      return {
        id: dbTrip.id,
        title: dbTrip.title,
        destination: dbTrip.destination,
        description: dbTrip.description || `A trip to ${dbTrip.destination}`,
        tags: travelStyleTags.map((styleId: string) => categoryLookup[styleId]?.label || styleId),
        requirements: expectationTags,
        budgetBreakdown,
        budgetType: dbBudgetType,
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
        budgetType: publishedTrip.budgetType || 'detailed',
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


  // Handle errors — in useEffect to avoid toast being called on every render
  useEffect(() => {
    if (error) {
      console.error('Error loading trip:', error);
      const feedback = getLoadErrorFeedback('trip details', error);
      toast({
        title: feedback.title,
        description: feedback.description,
        variant: "destructive",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

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
  const isDraftTrip = isDbTrip && String(dbTrip?.status || '').toLowerCase() === 'draft';

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
  const slotsStatusText = isTripFull ? 'Full' : urgencyText;
  const itineraryNotes = useMemo(() => {
    if (!tripData?.simpleNotes) return [];
    return tripData.simpleNotes
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  }, [tripData?.simpleNotes]);

  const images = useMemo(() => {
    const rawImages = (tripData && Array.isArray(tripData.galleryImages) ? tripData.galleryImages : [])
      .map(normalizeImageSrc)
      .filter((src) => Boolean(String(src || '').trim()));

    return rawImages.length > 0 ? rawImages : [DEFAULT_TRIP_IMAGE];
  }, [tripData]);

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Photo lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxAnimating, setLightboxAnimating] = useState(false);
  const [lightboxDirection, setLightboxDirection] = useState<1 | -1>(1);
  const [lightboxScale, setLightboxScale] = useState(1);
  const [mobileImageIndex, setMobileImageIndex] = useState(0);
  
  // Booking calendar state
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const SWIPE_THRESHOLD_PX = 42;
  const SWIPE_MAX_VERTICAL_DRIFT_PX = 56;
  const MIN_LIGHTBOX_SCALE = 1;
  const MAX_LIGHTBOX_SCALE = 3;

  const clampLightboxScale = (value: number) =>
    Math.min(MAX_LIGHTBOX_SCALE, Math.max(MIN_LIGHTBOX_SCALE, value));

  const resetLightboxZoom = useCallback(() => {
    setLightboxScale(1);
    pinchStartDistanceRef.current = null;
    pinchStartScaleRef.current = 1;
  }, []);

  const nextLightboxImage = () => {
    if (images.length <= 1) return;
    setLightboxDirection(1);
    setLightboxAnimating(true);
    setLightboxIndex((prev) => (prev + 1) % images.length);
  };

  const prevLightboxImage = () => {
    if (images.length <= 1) return;
    resetLightboxZoom();
    setLightboxDirection(-1);
    setLightboxAnimating(true);
    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  useEffect(() => {
    if (!lightboxAnimating) return;
    const timeout = window.setTimeout(() => setLightboxAnimating(false), 220);
    return () => window.clearTimeout(timeout);
  }, [lightboxAnimating, lightboxIndex]);

  const handleSwipeStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    swipeStartXRef.current = touch.clientX;
    swipeStartYRef.current = touch.clientY;
  };

  const handleSwipeEnd = (
    event: React.TouchEvent,
    onSwipeLeft: () => void,
    onSwipeRight: () => void,
  ) => {
    const startX = swipeStartXRef.current;
    const startY = swipeStartYRef.current;
    const touch = event.changedTouches[0];

    swipeStartXRef.current = null;
    swipeStartYRef.current = null;

    if (startX == null || startY == null || !touch) return;

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (Math.abs(deltaY) > SWIPE_MAX_VERTICAL_DRIFT_PX) return;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;

    if (deltaX < 0) {
      onSwipeLeft();
      return;
    }

    onSwipeRight();
  };

  useEffect(() => {
    if (images.length === 0) {
      setMobileImageIndex(0);
      return;
    }
    setMobileImageIndex((prev) => Math.min(prev, images.length - 1));
  }, [images.length]);

  const nextMobileImage = () => {
    if (images.length <= 1) return;
    setMobileImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevMobileImage = () => {
    if (images.length <= 1) return;
    setMobileImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const openLightboxAt = (index: number) => {
    resetLightboxZoom();
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return null;
    const [firstTouch, secondTouch] = [touches[0], touches[1]];
    if (!firstTouch || !secondTouch) return null;
    const deltaX = firstTouch.clientX - secondTouch.clientX;
    const deltaY = firstTouch.clientY - secondTouch.clientY;
    return Math.hypot(deltaX, deltaY);
  };

  const handleLightboxTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length === 2) {
      const distance = getTouchDistance(event.touches);
      if (distance != null) {
        pinchStartDistanceRef.current = distance;
        pinchStartScaleRef.current = lightboxScale;
      }
      swipeStartXRef.current = null;
      swipeStartYRef.current = null;
      return;
    }

    if (lightboxScale > 1.02) return;
    handleSwipeStart(event);
  };

  const handleLightboxTouchMove = (event: React.TouchEvent) => {
    if (event.touches.length !== 2 || pinchStartDistanceRef.current == null) return;

    const currentDistance = getTouchDistance(event.touches);
    if (currentDistance == null || pinchStartDistanceRef.current === 0) return;

    event.preventDefault();
    const nextScale = pinchStartScaleRef.current * (currentDistance / pinchStartDistanceRef.current);
    setLightboxScale(clampLightboxScale(nextScale));
  };

  const handleLightboxTouchEnd = (event: React.TouchEvent) => {
    if (pinchStartDistanceRef.current != null) {
      if (event.touches.length < 2) {
        pinchStartDistanceRef.current = null;
        pinchStartScaleRef.current = lightboxScale;
      }
      return;
    }

    if (lightboxScale > 1.02) {
      swipeStartXRef.current = null;
      swipeStartYRef.current = null;
      return;
    }

    handleSwipeEnd(event, nextLightboxImage, prevLightboxImage);
  };

  const handleLightboxWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const step = event.deltaY < 0 ? 0.12 : -0.12;
    setLightboxScale((prev) => clampLightboxScale(prev + step));
  };

  const zoomInLightbox = () => {
    setLightboxScale((prev) => clampLightboxScale(prev + 0.25));
  };

  const zoomOutLightbox = () => {
    setLightboxScale((prev) => clampLightboxScale(prev - 0.25));
  };

  const toggleLightboxZoom = () => {
    setLightboxScale((prev) => (prev > 1.3 ? 1 : 2));
  };

  useEffect(() => {
    if (!lightboxOpen) {
      resetLightboxZoom();
    }
  }, [lightboxOpen, resetLightboxZoom]);

  const renderCollage = () => {
    if (images.length === 0) return null;

    const collageHeightClass = "h-[18.5rem] sm:h-[21rem] md:h-[24rem] lg:h-[25rem]";

    if (images.length === 1) {
      return (
        <button
          type="button"
          onClick={() => openLightboxAt(0)}
          className={cn(
            "group relative block w-full overflow-hidden rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            collageHeightClass
          )}
          aria-label="Open trip photo"
        >
          <img
            src={images[0]}
            alt={`${tripData.title} photo`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />
          <div className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-white/85 p-2.5 text-foreground opacity-0 shadow-sm backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
            <ZoomIn className="h-4 w-4" />
          </div>
        </button>
      );
    }

    if (images.length === 2) {
      return (
        <div className={cn("grid grid-cols-2 gap-2 md:gap-3", collageHeightClass)}>
          {images.slice(0, 2).map((img, index) => (
            <button
              key={index}
              type="button"
              onClick={() => openLightboxAt(index)}
              className="group relative block h-full overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Open photo ${index + 1}`}
            >
              <img
                src={img}
                alt={`${tripData.title} photo ${index + 1}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      );
    }

    if (images.length === 3) {
      return (
        <div className={cn("grid grid-cols-1 gap-2 md:grid-cols-5 md:grid-rows-2 md:gap-3", collageHeightClass)}>
          <button
            type="button"
            onClick={() => openLightboxAt(0)}
            className="group relative block h-full min-h-[12rem] overflow-hidden rounded-2xl md:col-span-3 md:row-span-2 md:min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Open photo 1"
          >
            <img
              src={images[0]}
              alt={`${tripData.title} photo 1`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>

          <button
            type="button"
            onClick={() => openLightboxAt(1)}
            className="group relative block h-full min-h-[8rem] overflow-hidden rounded-2xl md:col-span-2 md:min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Open photo 2"
          >
            <img
              src={images[1]}
              alt={`${tripData.title} photo 2`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>

          <button
            type="button"
            onClick={() => openLightboxAt(2)}
            className="group relative block h-full min-h-[8rem] overflow-hidden rounded-2xl md:col-span-2 md:min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Open photo 3"
          >
            <img
              src={images[2]}
              alt={`${tripData.title} photo 3`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        </div>
      );
    }

    const visibleCount = Math.min(images.length, 5);
    const hiddenCount = Math.max(images.length - visibleCount, 0);

    return (
      <div className={cn("grid grid-cols-2 gap-2 md:grid-cols-4 md:grid-rows-2 md:gap-3", collageHeightClass)}>
        <button
          type="button"
          onClick={() => openLightboxAt(0)}
          className="group relative col-span-2 row-span-2 block h-full overflow-hidden rounded-2xl md:col-span-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Open photo 1"
        >
          <img
            src={images[0]}
            alt={`${tripData.title} photo 1`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </button>

        {images.slice(1, visibleCount).map((img, idx) => {
          const imageIndex = idx + 1;
          const isLastVisible = imageIndex === visibleCount - 1;

          return (
            <button
              key={imageIndex}
              type="button"
              onClick={() => openLightboxAt(imageIndex)}
              className="group relative block h-full min-h-[7.75rem] overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary md:min-h-0"
              aria-label={`Open photo ${imageIndex + 1}`}
            >
              <img
                src={img}
                alt={`${tripData.title} photo ${imageIndex + 1}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {hiddenCount > 0 && isLastVisible && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
                  +{hiddenCount}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const tripUrl = buildPublicUrl(`/trip/${id}`);
  const shareTripId = dbTrip?.id || String(id || "");
  const shareTripSlug = dbTrip?.slug || (dbTrip?.id ? "" : String(id || ""));
  const tripShareUrl = buildTripShareUrl({
    tripId: shareTripId,
    slug: shareTripSlug,
    title: tripData?.title,
    description: tripData?.description,
  });
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
          url: tripShareUrl,
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
      await navigator.clipboard.writeText(tripShareUrl);
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
      onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText + " " + tripShareUrl)}`, "_blank"),
    },
    {
      name: "Facebook",
      icon: () => (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      color: "bg-blue-600",
      onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(tripShareUrl)}`, "_blank"),
    },
    {
      name: "Twitter",
      icon: () => (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      color: "bg-black dark:bg-white dark:text-black",
      onClick: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(tripShareUrl)}`, "_blank"),
    },
    {
      name: "Telegram",
      icon: () => (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      color: "bg-sky-500",
      onClick: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(tripShareUrl)}&text=${encodeURIComponent(shareText)}`, "_blank"),
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
      } else if (error.code === '42501' && error.message?.includes('join_requests')) {
        toast({
          title: "Join Request Temporarily Unavailable",
          description: "Database permissions for join requests are not fully applied yet. Please run the latest hotfix SQL and try again.",
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
    navigate(`/chat/new/${memberId}`);
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

  const handleDiscardDraftTrip = async () => {
    if (!dbTrip?.id) return;
    try {
      setIsCancellingTrip(true);
      await deleteDraftTrip(dbTrip.id);
      toast({ title: "Draft discarded", description: "Your draft trip has been removed." });
      navigate("/my-trips?tab=draft");
    } catch (error) {
      toast({
        title: "Discard failed",
        description: error instanceof Error ? error.message : "Could not discard draft trip.",
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
  // Only show "not found" when we are fully done loading AND there is genuinely no data.
  // This prevents the blank screen flash on slow networks where dbTripLoading
  // finishes after the simulated delay.
  if (!tripData && !dbTripLoading && !dbTripFetching) {
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
  // While a background refetch is running (stale data + new fetch in flight),
  // keep rendering the existing trip data — just fall through to the main return.
  if (!tripData) {
    return <TripDetailsSkeleton />;
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
              url: dbTrip?.organizer_id ? buildPublicUrl(`/user/${dbTrip.organizer_id}`) : undefined,
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
              { name: "Home", url: getPublicBaseUrl() },
              { name: "Explore", url: buildPublicUrl("/explore") },
              { name: tripData.destination, url: `${buildPublicUrl("/explore")}?destination=${encodeURIComponent(tripData.destination)}` },
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
          <div
            className="relative w-full h-full flex items-center justify-center"
            onTouchStart={handleLightboxTouchStart}
            onTouchMove={handleLightboxTouchMove}
            onTouchEnd={handleLightboxTouchEnd}
            onWheel={handleLightboxWheel}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
            
            {images.length > 1 && (
              <>
                <button
                  onClick={prevLightboxImage}
                  className="absolute left-4 top-1/2 z-50 h-12 w-12 -translate-y-1/2 rounded-full border border-white/35 bg-black/35 backdrop-blur-md shadow-lg flex items-center justify-center hover:bg-black/50 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  onClick={nextLightboxImage}
                  className="absolute right-4 top-1/2 z-50 h-12 w-12 -translate-y-1/2 rounded-full border border-white/35 bg-black/35 backdrop-blur-md shadow-lg flex items-center justify-center hover:bg-black/50 transition-colors"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              </>
            )}
            
            <img
              src={images[lightboxIndex]}
              alt={`Gallery image ${lightboxIndex + 1}`}
              onDoubleClick={toggleLightboxZoom}
              className={cn(
                "max-w-full max-h-full object-contain transition-all duration-300 ease-out",
                lightboxAnimating
                  ? (lightboxDirection === 1 ? "opacity-0 translate-x-6" : "opacity-0 -translate-x-6")
                  : "opacity-100 translate-x-0"
              )}
              style={{ transform: `scale(${lightboxScale})` }}
            />

            <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2">
              <button
                type="button"
                onClick={zoomOutLightbox}
                className="h-10 w-10 rounded-full border border-white/35 bg-black/35 backdrop-blur-md shadow-lg flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={zoomInLightbox}
                className="h-10 w-10 rounded-full border border-white/35 bg-black/35 backdrop-blur-md shadow-lg flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
            </div>
            
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
              <DialogTitle>{isDraftTrip ? "Discard this draft?" : "Cancel this trip?"}</DialogTitle>
              <DialogDescription>
                {isDraftTrip
                  ? "This will permanently delete this draft trip."
                  : "This will notify all participants and remove the trip from listings."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1"
              >
                {isDraftTrip ? "Keep Draft" : "Keep Trip"}
              </Button>
              <Button
                variant="destructive"
                onClick={isDraftTrip ? handleDiscardDraftTrip : handleCancelTrip}
                disabled={isCancellingTrip}
                className="flex-1"
              >
                {isCancellingTrip ? (isDraftTrip ? "Discarding..." : "Cancelling...") : (isDraftTrip ? "Discard Trip" : "Cancel Trip")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AppLayout wideLayout>
        <div className="pb-36">
        {images.length > 0 && (
          <>
            {/* Mobile hero - full bleed like the reference screenshot */}
            <div className="-mx-5 overflow-hidden md:hidden sm:-mx-6">
              <div
                className="relative isolate"
                onTouchStart={handleSwipeStart}
                onTouchEnd={(event) => handleSwipeEnd(event, nextMobileImage, prevMobileImage)}
              >
                <button
                  type="button"
                  onClick={() => openLightboxAt(mobileImageIndex)}
                  className="group relative block h-[18.5rem] w-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Open trip photo"
                >
                  <img
                    src={images[mobileImageIndex]}
                    alt={`${tripData.title} photo`}
                    className="h-full w-full object-cover transition-transform duration-500 group-active:scale-[1.02]"
                  />
                </button>

                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 via-black/20 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/55 via-black/25 to-transparent" />

                {images.length > 1 && (
                  <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-white/35 bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                    {mobileImageIndex + 1} / {images.length}
                  </div>
                )}

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevMobileImage}
                      className="absolute left-3 top-1/2 z-20 -translate-y-1/2 h-11 w-11 rounded-full border border-white/40 bg-black/30 shadow-lg backdrop-blur-md flex items-center justify-center"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="h-5 w-5 text-white" />
                    </button>
                    <button
                      type="button"
                      onClick={nextMobileImage}
                      className="absolute right-3 top-1/2 z-20 -translate-y-1/2 h-11 w-11 rounded-full border border-white/40 bg-black/30 shadow-lg backdrop-blur-md flex items-center justify-center"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="h-5 w-5 text-white" />
                    </button>
                  </>
                )}

                <Link
                  to={backLink}
                  className="absolute top-3 left-3 z-20 h-10 w-10 rounded-full border border-white/40 bg-black/30 backdrop-blur-md shadow-lg flex items-center justify-center"
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </Link>

                {!isDraftTrip && (
                  <div className="absolute top-3 right-3 z-20 flex gap-1.5">
                    <button
                      onClick={handleShare}
                      className="h-10 w-10 rounded-full border border-white/40 bg-black/30 backdrop-blur-md shadow-lg flex items-center justify-center transition-transform active:scale-95"
                    >
                      <Share2 className="h-5 w-5 text-white" />
                    </button>
                    <button
                      onClick={handleFavourite}
                      className={`h-10 w-10 rounded-full border border-white/40 bg-black/30 backdrop-blur-md shadow-lg flex items-center justify-center transition-all duration-300 ${isAnimating ? 'scale-125' : ''}`}
                    >
                      <Heart
                        className={`h-5 w-5 transition-all duration-300 ${
                          isFavourited
                            ? 'fill-destructive text-destructive scale-110'
                            : 'fill-transparent text-white'
                        }`}
                      />
                    </button>
                    {isDbTrip && !isOrganizer && dbTrip?.creator_id && (
                      <ModerationMenu
                        reportType="TRIP"
                        targetId={String(dbTrip.id)}
                        reportedUserId={String(dbTrip.creator_id)}
                        targetLabel="Trip"
                        reportLabel="Report Trip"
                        trigger={
                          <button
                            type="button"
                            className="h-10 w-10 rounded-full border border-white/40 bg-black/30 backdrop-blur-md shadow-lg flex items-center justify-center transition-transform active:scale-95 text-white"
                            aria-label="Trip actions"
                          >
                            <MoreVertical className="h-5 w-5 text-white" strokeWidth={2.5} />
                          </button>
                        }
                      />
                    )}
                    {isDbTrip && isOrganizer && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="h-10 w-10 rounded-full border border-white/40 bg-black/30 backdrop-blur-md shadow-lg flex items-center justify-center transition-transform active:scale-95"
                            aria-label="Trip actions"
                          >
                            <MoreVertical className="h-6 w-6 text-white scale-125" strokeWidth={3} />
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
                )}

                {images.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 w-[84%] overflow-x-auto">
                    <div className="mx-auto flex w-max items-center gap-1.5 rounded-2xl border border-white/35 bg-black/30 px-1.5 py-1.5 shadow-2xl backdrop-blur-md">
                      {images.map((img, index) => (
                        <button
                          key={`mobile-trip-thumb-${index}`}
                          type="button"
                          onClick={() => setMobileImageIndex(index)}
                          className={cn(
                            "relative h-10 w-[4.3rem] overflow-hidden rounded-lg border transition-all",
                            mobileImageIndex === index
                              ? "border-white ring-2 ring-white/90"
                              : "border-white/35 opacity-90"
                          )}
                          aria-label={`View photo ${index + 1}`}
                        >
                          <img
                            src={img}
                            alt={`${tripData.title} thumbnail ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop/tablet collage */}
            <div className="hidden md:block lg:px-[14rem] xl:px-[16rem]">
              <div className="relative">
                {renderCollage()}

                {/* Back Button */}
                <Link
                  to={backLink}
                  className="absolute top-3 left-3 h-9 w-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center sm:top-4 sm:left-4 sm:h-10 sm:w-10"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                </Link>

                {/* Actions */}
                {!isDraftTrip && (
                  <div className="absolute top-3 right-3 flex gap-1.5 sm:top-4 sm:right-4 sm:gap-2">
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
                    {isDbTrip && !isOrganizer && dbTrip?.creator_id && (
                      <ModerationMenu
                        reportType="TRIP"
                        targetId={String(dbTrip.id)}
                        reportedUserId={String(dbTrip.creator_id)}
                        targetLabel="Trip"
                        reportLabel="Report Trip"
                        trigger={
                          <button
                            type="button"
                            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-95 text-foreground"
                            aria-label="Trip actions"
                          >
                            <MoreVertical className="h-5 w-5 sm:h-5 sm:w-5 text-foreground" strokeWidth={2.5} />
                          </button>
                        }
                      />
                    )}
                    {isDbTrip && isOrganizer && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-95"
                            aria-label="Trip actions"
                          >
                            <MoreVertical className="h-6 w-6 sm:h-7 sm:w-7 text-foreground scale-125" strokeWidth={3} />
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
                )}
              </div>
            </div>
          </>
        )}

        <div className="mb-2 pt-3 px-0 sm:mb-4 sm:pt-5 lg:px-[14rem] xl:px-[16rem]">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{tripData.title}</h1>
        </div>

        {/* Content */}
        <div className="px-0 pt-1 sm:pt-4 lg:px-[14rem] xl:px-[16rem] space-y-4 sm:space-y-6">
          {/* Title & Location */}
          <div className="space-y-1.5 sm:space-y-3">
            <div className="flex items-start justify-end gap-2">
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
              {/* Date Display - DDMMYY Format */}
              {((isPublishedTrip && tripData.dateType === 'exact' && tripData.startDate) || (dbTrip?.start_date)) && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm font-medium">
                    {(() => {
                      const startDate = dbTrip?.start_date || tripData.startDate;
                      const endDate = dbTrip?.end_date || tripData.endDate;
                      
                      if (startDate) {
                        const formattedStart = formatDateDDMMYY(startDate);
                        if (endDate) {
                          const formattedEnd = formatDateDDMMYY(endDate);
                          return `${formattedStart} - ${formattedEnd}`;
                        }
                        return formattedStart;
                      }
                      return "";
                    })()}
                  </span>
                </div>
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
                const icon = category?.icon || getExpectationIcon(tag);
                return (
                  <span
                    key={tag}
                    className="px-3 py-2 text-sm rounded-full border bg-white border-border text-muted-foreground flex items-center gap-2"
                  >
                    {icon && <span>{icon}</span>}
                    {getExpectationLabel(tag)}
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
              {/* Description */}
              <Card className="p-3 sm:p-4 border-border/50">
                <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">About This Trip</h3>
                <div className="space-y-1.5 sm:space-y-2">
                  {parseDescriptionToBullets(tripData.description).map((line, index) => (
                    <p key={index} className="text-xs sm:text-sm text-muted-foreground">{line}</p>
                  ))}
                </div>
              </Card>

              {/* Requirements */}
              {tripData.requirements.length > 0 && (
                <Card className="p-3 sm:p-4 border-border/50">
                  <h3 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">What to Expect</h3>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {tripData.requirements.map((req, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs sm:text-sm text-muted-foreground"
                      >
                        <span>{getExpectationIcon(req)}</span>
                        <span>{getExpectationLabel(req)}</span>
                      </span>
                    ))}
                  </div>
                </Card>
              )}


              {/* Budget Breakdown */}
              {tripData.budgetBreakdown.length > 0 && (() => {
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
                const currencyToDisplay = homeCurrency || "MYR";
                const totalDisplay = `${getCurrencySymbol(currencyToDisplay)} ${Math.round(convertedTotalPrice || tripData.price).toLocaleString()}`;

                if ((tripData as any).budgetType === 'rough') {
                  return (
                    <Card className="p-3 sm:p-4 border-border/50">
                      <h3 className="font-semibold text-foreground mb-1 text-sm sm:text-base">Rough Budget</h3>
                      <p className="text-2xl sm:text-3xl font-bold text-foreground">{totalDisplay}</p>
                      <p className="text-xs text-muted-foreground mb-3">Per person (estimated)</p>
                      <p className="text-xs sm:text-sm text-foreground font-medium mb-2">This budget may cover:</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {tripData.budgetBreakdown.map((item) => {
                          const emoji = categoryEmojiMap[item.category] || categoryEmojiMap[item.icon] || '📦';
                          return (
                            <span
                              key={item.category}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-foreground bg-background"
                            >
                              <span>{emoji}</span>
                              <span>{item.category}</span>
                            </span>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        This is an estimated amount to prepare, not a fixed cost or payment to the organizer. Actual spending may be higher or lower depending on bookings, preferences, and shared expenses during the trip.
                      </p>
                    </Card>
                  );
                }

                return (
                  <Card className="p-3 sm:p-4 border-border/50">
                    <h3 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">Budget Breakdown</h3>
                    <div className="space-y-2 sm:space-y-3">
                      {tripData.budgetBreakdown.map((item) => {
                        const convertedItem = convertedBudgetBreakdown.find(c =>
                          c.category === item.category ||
                          c.category.toLowerCase() === item.category.toLowerCase()
                        );
                        const displayAmount = convertedItem?.amount ?? item.amount;
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
                              {getCurrencySymbol(currencyToDisplay)} {Math.round(displayAmount).toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                      <div className="pt-2 sm:pt-3 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground text-sm sm:text-base">Total per person</span>
                          <span className="text-base sm:text-lg font-bold text-primary">
                            {totalDisplay}
                          </span>
                        </div>
                        <div className="mt-2 p-2 bg-secondary/50 rounded-lg">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="font-medium text-foreground">Estimated shared expenses.</span> This is the amount you should be prepared to spend during the trip. You don't pay this to the organizer — expenses are tracked and split transparently in the group.
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })()}

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
        <div className="fixed bottom-above-nav lg:bottom-0 left-0 lg:left-60 right-0 z-40 bg-background border-t border-border/50">
          <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              {isDraftTrip ? (
                <>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full rounded-xl text-sm sm:text-base gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    <X className="h-4 w-4" />
                    Discard Trip
                  </Button>
                  <Button
                    size="lg"
                    className="w-full rounded-xl text-sm sm:text-base gap-2 bg-black text-white hover:bg-neutral-800 border-none"
                    variant="default"
                    onClick={handleEditTrip}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Trip
                  </Button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sticky CTA Bar */}
      {isDbTrip && !isOrganizer && (
        <div
          className={cn(
            "fixed bottom-above-nav lg:bottom-0 left-0 right-0 z-40 bg-background border-t border-border/50",
            user ? "lg:left-60" : "lg:left-0"
          )}
        >
          <div
            className={cn(
              "mx-auto px-4 py-3",
              user
                ? "container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl"
                : "w-full px-16 sm:px-32 lg:px-[14rem] xl:px-[16rem]"
            )}
          >
            <div
              className={cn(
                "grid gap-3",
                joinRequestStatus === 'member' && isDraftTrip ? "grid-cols-1" : "grid-cols-2",
                !user && "mx-auto w-full max-w-4xl"
              )}
            >
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
              {joinRequestStatus === 'member' && !isDraftTrip ? (
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
        <DialogContent className="max-w-md w-[calc(100%-1rem)] sm:w-full rounded-2xl p-0 max-h-[min(92dvh,720px)] overflow-hidden [&>button]:hidden">
          <div className="flex max-h-[min(92dvh,720px)] flex-col">
          <DialogHeader className="p-5 pb-4 border-b border-border/50 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-2xl sm:text-[30px] leading-tight tracking-tight">Request to Join Trip</DialogTitle>
              <button 
                onClick={() => setShowJoinConfirmModal(false)}
                aria-label="Close request modal"
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <DialogDescription className="text-base leading-relaxed pt-1">
              Here's what happens when you request to join
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* What happens next steps */}
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">1</div>
                <p className="text-sm text-foreground/90 leading-snug">Your request is sent to the trip organizer</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">2</div>
                <p className="text-sm text-foreground/90 leading-snug">They'll review your profile and message</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">3</div>
                <p className="text-sm text-foreground/90 leading-snug">You'll be notified when they respond</p>
              </div>
            </div>

            {/* Message input */}
            <div className="space-y-2.5">
              <label htmlFor="join-note" className="text-lg sm:text-xl leading-tight font-semibold tracking-tight">
                Introduce yourself <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                id="join-note"
                value={joinNote}
                onChange={(e) => setJoinNote(e.target.value.slice(0, 300))}
                onFocus={(e) => {
                  setTimeout(() => {
                    e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" });
                  }, 120);
                }}
                placeholder={`Hi! I'd love to join your ${tripData.destination} trip. A bit about me...`}
                className="w-full min-h-[112px] p-4 rounded-xl border border-border/50 bg-background text-base leading-relaxed resize-none focus-visible:outline-none focus-visible:border-primary/50"
                maxLength={300}
              />
              <p className="text-sm text-muted-foreground text-right">
                {joinNote.length}/300
              </p>
            </div>

          </div>

          {/* Action buttons */}
          <div className="shrink-0 border-t border-border/50 bg-background/95 backdrop-blur px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowJoinConfirmModal(false);
                  setJoinNote("");
                }}
                className="rounded-xl h-12 text-base"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendJoinRequest}
                className="rounded-xl h-12 gap-2 text-base"
              >
                <UserPlus className="h-4 w-4" />
                Send Request
              </Button>
            </div>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Organizer Modal */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full rounded-2xl p-0 max-h-[calc(100dvh-1rem)] sm:max-h-[85vh] overflow-y-auto top-[6%] translate-y-0 sm:top-[50%] sm:-translate-y-1/2 [&>button]:hidden">
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
                onFocus={(e) => {
                  setTimeout(() => {
                    e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" });
                  }, 120);
                }}
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
                  navigate(`/chat/new/${organizer.id}${messageParam}`);
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
