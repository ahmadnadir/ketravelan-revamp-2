/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Lock,
  MapPin,
  Calendar,
  Users,
  Image,
  Check,
  Sparkles,
  Share2,
  Copy,
  CheckCircle2,
  Circle,
  Pencil,
  Wallet,
  Route,
  ClipboardList,
  FileText,
  X,
  Send,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PillChip } from "@/components/shared/PillChip";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useDraftTrip, TripDraft } from "@/hooks/useDraftTrip";
import { DestinationSearch } from "@/components/create-trip/DestinationSearch";
import { RouteBuilder } from "@/components/create-trip/RouteBuilder";
import { BudgetSection } from "@/components/create-trip/BudgetSection";
import { ItinerarySection } from "@/components/create-trip/ItinerarySection";
import { RequirementsSection } from "@/components/create-trip/RequirementsSection";
import { OptionCard } from "@/components/create-trip/OptionCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { toast } from "@/hooks/use-toast";
import { tripCategories } from "@/data/categories";
import { createTrip, updateTrip, fetchTripDetails, deleteDraftTrip } from "@/lib/trips";
import { uploadImageFromDataUrl, isUrl } from "@/lib/imageStorage";
import { supabase } from "@/lib/supabase";
import { scheduleTripReminder } from "@/lib/tripReminders";

const steps = [
  { id: 1, title: "Visibility" },
  { id: 2, title: "Basics" },
  { id: 3, title: "Plan" },
  { id: 4, title: "Review" },
];

export default function CreateTrip() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isPublishing, setIsPublishing] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const editTripId = searchParams.get('edit');
  const { draft, updateDraft, clearDraft, lastSaved, draftId, convertDraftToTripData, setDraft } = useDraftTrip({
    disableAutoSave: Boolean(editTripId),
    suppressAutoSaveToast: true,
  });
  // On mount, if editing, restore draftId from localStorage to ensure updateTrip is called
  useEffect(() => {
    if (editTripId) {
      const storedDraftId = localStorage.getItem('ketravelan-draft-trip-id');
      if (storedDraftId && draftId !== storedDraftId) {
        updateDraft('draftId', storedDraftId);
      }
    }
  }, [editTripId, draftId, updateDraft]);
  const [currentStep, setCurrentStep] = useState(1);
  const [showShareModal, setShowShareModal] = useState(false);
  const [publishedTripId, setPublishedTripId] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isLoadingTrip, setIsLoadingTrip] = useState(false);
  const [tripStatus, setTripStatus] = useState<'draft' | 'published' | null>(null);
  // Store draft snapshot for share modal (since we clear draft before showing modal)
  const draftSnapshotRef = useRef<TripDraft | null>(null);
  // File input ref for gallery images
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedEditTrip = useRef(false);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }, [currentStep]);


  // Wrap loadTripForEdit in useCallback to fix dependency warning
  const loadTripForEdit = useCallback(async (tripId: string) => {
    try {
      setIsLoadingTrip(true);
      const tripData = await fetchTripDetails(tripId);

      // Set trip status from fetched data
      if (tripData?.status) {
        setTripStatus(tripData.status as 'draft' | 'published');
        console.log('[loadTripForEdit] Trip status:', tripData.status);
      } else {
        console.log('[loadTripForEdit] No status found in tripData');
      }

      // Fallback: if visibility not returned, fetch it directly
      if (tripData && (tripData as any).visibility === undefined) {
        const { data: visRow } = await supabase
          .from('trips')
          .select('visibility')
          .eq('id', tripId)
          .maybeSingle();
        if (visRow && (visRow as any).visibility) {
          Object.assign(tripData as any, { visibility: (visRow as any).visibility });
        }
      }

      if (!tripData) {
        toast({
          title: "Error",
          description: "Trip not found",
          variant: "destructive",
        });
        navigate('/create');
        return;
      }

      const parsedStops = tripData.stops ? JSON.parse(tripData.stops) : [];
      // Load travelStyles and expectations from separate fields
      const travelStyleTags = tripData.travel_styles || [];
      const expectationTags = tripData.tags || [];

      const budgetCategories = tripData.budget_breakdown?.categories || [];
      const roughTotal = tripData.budget_breakdown?.total || 0;

      const itineraryData = tripData.itinerary || [];
      const simpleNotes = itineraryData[0]?.notes || '';
      const dayByDayPlan = tripData.itinerary_type === 'dayByDay'
        ? itineraryData.map((item: any) => ({
            day: item.day,
            activities: item.activities || []
          }))
        : [];

      const editDraft: TripDraft = {
        draftId: tripData.id,
        visibility: (tripData as any)?.visibility || 'public',
        title: tripData.title || '',
        description: tripData.description || '',
        primaryDestination: tripData.destination || '',
        additionalStops: parsedStops,
        dateType: tripData.start_date && tripData.end_date ? 'exact' : 'flexible',
        startDate: tripData.start_date || '',
        endDate: tripData.end_date || '',
        travelStyles: travelStyleTags,
        groupSizeType: tripData.max_participants ? 'set' : 'later',
        groupSize: tripData.max_participants || 3,
        galleryImages: tripData.images || [],
        budgetType: tripData.budget_mode || 'skip',
        roughBudgetTotal: roughTotal,
        roughBudgetCategories: budgetCategories,
        detailedBudget: tripData.budget_mode === 'detailed' ? tripData.budget_breakdown : {},
        itineraryType: tripData.itinerary_type || 'skip',
        simpleNotes: simpleNotes,
        dayByDayPlan: dayByDayPlan,
        expectations: expectationTags,
        currency: tripData.currency || 'MYR',
      };

      setDraft(editDraft);
      // Ensure draftId is set in local state and localStorage
      if (editDraft.draftId) {
        // Always persist draftId as tripData.id (UUID) for updateTrip
        localStorage.setItem('ketravelan-draft-trip-id', tripData.id);
      }
      toast({
        title: "Trip loaded",
        description: "You can now edit your trip",
      });
    } catch (error) {
      console.error('Error loading trip for edit:', error);
      toast({
        title: "Error",
        description: "Failed to load trip for editing",
        variant: "destructive",
      });
      navigate('/create');
    } finally {
      setIsLoadingTrip(false);
    }
  }, [navigate, setDraft]);

  // Load existing trip for editing
  useEffect(() => {
    if (editTripId && !hasLoadedEditTrip.current) {
      hasLoadedEditTrip.current = true;
      loadTripForEdit(editTripId);
    }
  }, [editTripId, loadTripForEdit]);

  // Handle gallery image upload
  const handleGalleryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    // Convert to base64 for localStorage storage
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64 && draft.galleryImages.length < 5) {
        updateDraft("galleryImages", [...draft.galleryImages, base64]);
      }
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const canProceedStep2 = () => {
    return (
      draft.title.trim() !== "" &&
      draft.primaryDestination !== "" &&
      draft.travelStyles.length > 0
    );
  };

  const toggleTravelStyle = (styleId: string) => {
    const current = draft.travelStyles;
    if (current.includes(styleId)) {
      updateDraft("travelStyles", current.filter((s) => s !== styleId));
    } else {
      updateDraft("travelStyles", [...current, styleId]);
    }
  };

  const handlePublish = async () => {
    if (isPublishing) return; // prevent double submit
    setIsPublishing(true);

    try {
      /* --------------------------------
      * 1. Resolve trip ID (authoritative)
      * -------------------------------- */
      const resolvedTripId =
        (draft as any)?.draftId ??
        draftId ??
        editTripId ??
        localStorage.getItem('ketravelan-draft-trip-id');

      const isEditMode = Boolean(editTripId);
      const isUpdating = Boolean(resolvedTripId);

      console.log('[handlePublish]', {
        resolvedTripId,
        isEditMode,
        draftId,
        editTripId,
      });

      // HARD STOP: edit UI must NEVER create
      if (isEditMode && !resolvedTripId) {
        throw new Error('Edit mode active but no tripId could be resolved');
      }

      /* -----------------------------
      * 2. Build payload (pure)
      * ----------------------------- */
      const baseTripData = convertDraftToTripData(draft, 'published');

      const payload = {
        ...baseTripData,
        travel_styles: draft.travelStyles ?? [],
        tags: draft.expectations ?? [],
        status: 'published' as const,
      };

      /* --------------------------------------
      * 2.1 Upload images to Storage if needed
      * -------------------------------------- */
      const bucket = (import.meta as any).env?.VITE_TRIP_IMAGES_BUCKET || 'trip-images';
      const tryUploadImages = async (tripIdForFolder: string | null | undefined, data: typeof payload) => {
        const folderPrefix = `trips/${tripIdForFolder || 'new'}`;
        let coverUrl = data.cover_image;
        try {
          if (coverUrl && (!isUrl(coverUrl) || String(coverUrl).startsWith('data:image/'))) {
            coverUrl = await uploadImageFromDataUrl(String(coverUrl), {
              bucket,
              folder: `${folderPrefix}/cover`,
            });
          }
          const gallery = Array.isArray(data.images) ? data.images : [];
          const processedGallery = await Promise.all(
            gallery.map((img) => {
              const s = String(img || '').trim();
              if (!s) return Promise.resolve(s);
              const isData = s.startsWith('data:image/');
              if (isUrl(s) && !isData) return Promise.resolve(s);
              return uploadImageFromDataUrl(s, {
                bucket,
                folder: `${folderPrefix}/gallery`,
                filename: undefined,
              });
            })
          );
          return { cover_image: coverUrl, images: processedGallery };
        } catch (imgErr) {
          console.warn('[handlePublish] image upload skipped:', imgErr);
          return { cover_image: data.cover_image, images: data.images };
        }
      };

      /* -----------------------------
      * 3. Check current trip status (if updating)
      * ----------------------------- */
      let wasAlreadyPublished = false;
      if (isUpdating) {
        const { data: existingTrip } = await supabase
          .from('trips')
          .select('status')
          .eq('id', resolvedTripId!)
          .single();
        
        if (existingTrip?.status === 'published') {
          wasAlreadyPublished = true;
        }
      }

      /* -----------------------------
      * 4. Persist (NO FALLBACK)
      * ----------------------------- */
      let publishedTrip;

      if (isUpdating) {
        // Upload using existing trip id, then update with URLs
        const uploaded = await tryUploadImages(resolvedTripId, payload);
        const nextPayload = { ...payload, ...uploaded };
        publishedTrip = await updateTrip(resolvedTripId as string, nextPayload);

        if (!publishedTrip?.id) {
          throw new Error('Update failed: no row was updated');
        }
      } else {
        // Create first to get the authoritative trip id
        const created = await createTrip({ ...payload, cover_image: null, images: [] });
        if (!created?.id) {
          throw new Error('Create failed');
        }
        // Upload images under trips/<id> then persist URLs
        const uploaded = await tryUploadImages(created.id, payload);
        publishedTrip = await updateTrip(created.id, uploaded);

        // persist for future edits
        localStorage.setItem('ketravelan-draft-trip-id', created.id);
      }

      /* -----------------------------
      * 5. Post-success
      * ----------------------------- */
      setPublishedTripId(publishedTrip.id);
      draftSnapshotRef.current = { ...draft };

      clearDraft();

      // Only clear draftId when updating
      if (isUpdating) {
        localStorage.removeItem('ketravelan-draft-trip-id');
      }

      // Send trip created email ONLY if this is the first time publishing (draft -> published)
      // Don't send if updating an already published trip
      if (!wasAlreadyPublished) {
        try {
          await supabase.functions.invoke('send-trip-created-email', {
            body: { tripId: publishedTrip.id },
          });
          console.log('[handlePublish] Trip created email sent successfully');

          try {
            await supabase.functions.invoke('send-trip-recommendation', {
              body: { tripId: publishedTrip.id },
            });
            console.log('[handlePublish] Trip recommendation sent successfully');
          } catch (recommendationErr) {
            console.warn('[handlePublish] Failed to send trip recommendation', recommendationErr);
          }
          
          // Schedule trip reminder emails (7, 3, 1 days before start)
          try {
            await scheduleTripReminder(publishedTrip.id);
            console.log('[handlePublish] Trip reminders scheduled');
          } catch (reminderErr) {
            console.warn('[handlePublish] Failed to schedule trip reminders', reminderErr);
            // Don't fail the entire publish if reminder fails
          }
        } catch (e) {
          console.warn('[handlePublish] Failed to send trip created email', e);
        }
      } else {
        console.log('[handlePublish] Skipped email - trip was already published');
      }

      toast({
        title: isUpdating ? 'Trip updated!' : 'Trip published!',
        description: isUpdating
          ? 'Your trip has been successfully updated.'
          : 'Your trip is now live and ready for people to join.',
      });

      setTimeout(() => {
        navigate(`/trip/${publishedTrip.id}`);
      }, 800);
    } catch (error) {
      console.error('[handlePublish] failed', error);

      toast({
        title: editTripId ? 'Failed to update' : 'Failed to publish',
        description:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const getCompletionStats = () => {
    const essentials = draft.title && draft.primaryDestination && draft.travelStyles.length > 0;
    const optionalCount = [
      draft.budgetType !== "skip",
      draft.itineraryType !== "skip",
      draft.expectations.length > 0,
    ].filter(Boolean).length;
    return { essentials, optionalCount };
  };

  const { essentials, optionalCount } = getCompletionStats();

  return (
    <AppLayout
      hideHeader={false}
      showBottomNav={true}
      mainClassName="px-4 sm:px-6 pb-28"
    >
      <div ref={topRef} />
      <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto py-4 sm:py-6">
        {/* Page title + step progress under global header */}
        <div className="border-b border-border/50 pb-4 mb-4">
          <div className="flex items-center justify-between h-16 sm:h-18">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {editTripId ? "Edit Trip" : "Create a Trip"}
            </h1>
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Draft saved
              </span>
            )}
          </div>

          <div className="mt-2">
            <div className="relative h-1 bg-secondary rounded-full overflow-hidden mb-4">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                    disabled={step.id > currentStep}
                    className={cn(
                      "h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-300",
                      currentStep >= step.id
                        ? "bg-primary text-primary-foreground scale-100"
                        : "bg-secondary text-muted-foreground scale-90",
                      step.id < currentStep && "cursor-pointer hover:bg-primary/80",
                      currentStep === step.id && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                    )}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    ) : (
                      step.id
                    )}
                  </button>
                  <span
                    className={cn(
                      "text-[10px] sm:text-xs font-medium transition-colors duration-300",
                      currentStep >= step.id ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Step 1: Visibility */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Who can see this trip?
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                You can change this later
              </p>
            </div>
            
            <div className="grid gap-3">
              <OptionCard
                icon={<Globe className="h-6 w-6" />}
                title="Public Trip"
                description={
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="text-primary">•</span>
                      Open to everyone
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">•</span>
                      Discoverable in feed
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">•</span>
                      Anyone can request to join
                    </li>
                  </ul>
                }
                selected={draft.visibility === "public"}
                onClick={() => updateDraft("visibility", "public")}
                iconSize="md"
              />

              <OptionCard
                icon={<Lock className="h-6 w-6" />}
                title="Friends / Private"
                description={
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="text-primary">•</span>
                      Invite-only
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">•</span>
                      Hidden from discovery
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">•</span>
                      Shareable private link
                    </li>
                  </ul>
                }
                selected={draft.visibility === "private"}
                onClick={() => updateDraft("visibility", "private")}
                iconSize="md"
              />
            </div>
          </div>
        )}

        {/* Step 2: Trip Basics */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Trip Basics
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Just the essentials so others understand your trip
              </p>
            </div>

            {/* Trip Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-primary" />
                Trip Title <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Give your trip a name..."
                value={draft.title}
                onChange={(e) => updateDraft("title", e.target.value)}
                className="rounded-xl text-sm"
              />
            </div>

            {/* About This Trip */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                About This Trip
              </label>
              <Textarea
                placeholder="Describe what makes this trip special, what travelers can expect..."
                value={draft.description}
                onChange={(e) => updateDraft("description", e.target.value)}
                className="rounded-xl text-sm min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                This will appear on your trip page to help others understand your trip.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4 text-primary" />
                Primary Destination <span className="text-destructive">*</span>
              </label>
              <DestinationSearch
                value={draft.primaryDestination}
                onChange={(val, locationData) => {
                  updateDraft("primaryDestination", val);
                  if (locationData) {
                    updateDraft("destinationPlace", locationData.place);
                    updateDraft("destinationState", locationData.state);
                    updateDraft("destinationCountry", locationData.country);
                  }
                }}
                helperText="This is the main place your trip is centered around."
              />
              {draft.destinationPlace && (
                <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/30 rounded-lg">
                  <p>📍 <strong>{draft.destinationPlace}</strong>
                    {draft.destinationState && `, ${draft.destinationState}`}
                    {draft.destinationCountry && `, ${draft.destinationCountry}`}
                  </p>
                </div>
              )}
            </div>

            {/* Additional Stops */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1">
                <Route className="h-4 w-4 text-muted-foreground" />
                Route / Additional Stops
              </label>
              <RouteBuilder
                stops={draft.additionalStops}
                onChange={(stops) => updateDraft("additionalStops", stops)}
                onStopsDetailsChange={(details) => updateDraft("additionalStopsDetails", details)}
                primaryDestination={draft.primaryDestination}
              />
            </div>

            {/* Dates */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Dates
              </label>
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                <span className="text-sm text-foreground">
                  {draft.dateType === "flexible" ? "Flexible dates" : "Set exact dates"}
                </span>
                <Switch
                  checked={draft.dateType === "exact"}
                  onCheckedChange={(checked) =>
                    updateDraft("dateType", checked ? "exact" : "flexible")
                  }
                />
              </div>
              {draft.dateType === "exact" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Start</label>
                    <Input
                      type="date"
                      value={draft.startDate}
                      onChange={(e) => updateDraft("startDate", e.target.value)}
                      className="rounded-xl text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">End</label>
                    <Input
                      type="date"
                      value={draft.endDate}
                      onChange={(e) => updateDraft("endDate", e.target.value)}
                      className="rounded-xl text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Travel Style */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Travel Style <span className="text-destructive">*</span>
              </label>
              <p className="text-xs text-muted-foreground -mt-1">
                Helps others understand the vibe. Select at least one.
              </p>
              <div className="flex flex-wrap gap-2">
                {tripCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleTravelStyle(category.id)}
                    className={cn(
                      "px-3 py-2 text-sm rounded-full border transition-all flex items-center gap-2 active:scale-95",
                      draft.travelStyles.includes(category.id)
                        ? "bg-foreground text-background border-foreground font-medium"
                        : "bg-white border-border text-muted-foreground hover:bg-foreground hover:text-background"
                    )}
                  >
                    <span>{category.icon}</span>
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Group Size */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground flex items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                Group Size
              </label>
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                <span className="text-sm text-foreground">
                  {draft.groupSizeType === "later" ? "Decide later" : `${draft.groupSize} people max`}
                </span>
                <Switch
                  checked={draft.groupSizeType === "set"}
                  onCheckedChange={(checked) =>
                    updateDraft("groupSizeType", checked ? "set" : "later")
                  }
                />
              </div>
              {draft.groupSizeType === "set" && (
                <div className="flex items-center justify-center gap-6 py-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => updateDraft("groupSize", Math.max(2, draft.groupSize - 1))}
                    className="rounded-full h-12 w-12 p-0 text-lg font-bold"
                  >
                    −
                  </Button>
                  <span className="text-3xl font-bold text-foreground min-w-[3ch] text-center">
                    {draft.groupSize}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => updateDraft("groupSize", Math.min(50, draft.groupSize + 1))}
                    className="rounded-full h-12 w-12 p-0 text-lg font-bold"
                  >
                    +
                  </Button>
                </div>
              )}
            </div>

            {/* Gallery Images */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1">
                <Image className="h-4 w-4 text-muted-foreground" />
                Trip Gallery (up to 5 photos)
              </label>
              
              {/* Hidden file input */}
              <input
                type="file"
                ref={galleryInputRef}
                accept="image/*"
                onChange={handleGalleryImageUpload}
                className="hidden"
              />
              
              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={index} className="relative">
                    {draft.galleryImages[index] ? (
                      <div className="relative aspect-square rounded-xl overflow-hidden border border-border">
                        <img 
                          src={draft.galleryImages[index]} 
                          alt={`Gallery ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = draft.galleryImages.filter((_, i) => i !== index);
                            updateDraft("galleryImages", updated);
                          }}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {index === 0 && (
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded">
                            Cover
                          </span>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (draft.galleryImages.length < 5) {
                            galleryInputRef.current?.click();
                          }
                        }}
                        disabled={draft.galleryImages.length >= 5}
                        className="w-full"
                      >
                        <Card className="aspect-square border-dashed border-2 border-border/50 hover:border-primary/30 transition-colors cursor-pointer flex items-center justify-center">
                          <div className="flex flex-col items-center gap-1 text-center p-2">
                            <Image className="h-5 w-5 text-muted-foreground" />
                            <p className="text-[10px] text-muted-foreground">
                              {index === 0 ? "Cover" : "Add"}
                            </p>
                          </div>
                        </Card>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                First image will be used as the cover photo
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Plan (Optional) */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Add Details
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                All optional — you can refine later in the group chat
              </p>
            </div>

            {/* Budget */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Budget</h3>
              </div>
              <BudgetSection
                budgetType={draft.budgetType}
                onBudgetTypeChange={(type) => updateDraft("budgetType", type)}
                roughBudgetTotal={draft.roughBudgetTotal}
                onRoughBudgetTotalChange={(val) => updateDraft("roughBudgetTotal", val)}
                roughBudgetCategories={draft.roughBudgetCategories}
                onRoughBudgetCategoriesChange={(cats) => updateDraft("roughBudgetCategories", cats)}
                detailedBudget={draft.detailedBudget}
                onDetailedBudgetChange={(budget) => updateDraft("detailedBudget", budget)}
              />
            </div>

            {/* Itinerary */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Itinerary</h3>
              </div>
              <ItinerarySection
                itineraryType={draft.itineraryType}
                onItineraryTypeChange={(type) => updateDraft("itineraryType", type)}
                simpleNotes={draft.simpleNotes}
                onSimpleNotesChange={(notes) => updateDraft("simpleNotes", notes)}
                dayByDayPlan={draft.dayByDayPlan}
                onDayByDayPlanChange={(plan) => updateDraft("dayByDayPlan", plan)}
                startDate={draft.startDate}
                endDate={draft.endDate}
              />
            </div>

            {/* Requirements / What to Expect */}
            <div className="pt-2">
              <RequirementsSection
                expectations={draft.expectations}
                onChange={(exps) => {
                  // Allow both predefined and custom expectations
                  updateDraft("expectations", exps);
                }}
              />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Review Your Trip
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Make sure everything looks good before publishing
              </p>
            </div>

            {/* Trip Preview Card */}
            <Card className="overflow-hidden border-border/50">
              {/* Cover image or gradient header */}
              {draft.galleryImages[0] ? (
                <div className="h-32 w-full relative">
                  <img
                    src={draft.galleryImages[0]}
                    alt="Cover"
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute top-3 left-3">
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      draft.visibility === "public"
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground"
                    )}>
                      {draft.visibility === "public" ? "🌐 Public" : "🔒 Private"}
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="absolute top-3 right-3 p-1.5 bg-card/80 backdrop-blur-sm rounded-full hover:bg-card transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-accent relative">
                  <div className="absolute top-3 left-3">
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      draft.visibility === "public"
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground"
                    )}>
                      {draft.visibility === "public" ? "🌐 Public" : "🔒 Private"}
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="absolute top-3 right-3 p-1.5 bg-card/80 backdrop-blur-sm rounded-full hover:bg-card transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              )}

              <div className="p-4 space-y-4">
                {/* Title & Destination */}
                <div>
                  <h3 className="font-bold text-lg text-foreground">
                    {draft.title || "Untitled Trip"}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {draft.destinationPlace || draft.primaryDestination || "No destination set"}
                      {draft.destinationState && ` • ${draft.destinationState}`}
                    </span>
                    {draft.additionalStops.length > 0 && (
                      <span className="text-xs">
                        → +{draft.additionalStops.length} stop{draft.additionalStops.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Route summary */}
                {draft.additionalStops.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded-full">
                      {draft.primaryDestination}
                    </span>
                    {draft.additionalStops.map((stop, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="text-muted-foreground">→</span>
                        <span className="px-2 py-1 bg-secondary text-foreground rounded-full">
                          {stop}
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-secondary/50 rounded-xl">
                    <p className="text-xs text-muted-foreground">Dates</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {draft.dateType === "flexible"
                        ? "Flexible"
                        : draft.startDate && draft.endDate
                        ? `${new Date(draft.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(draft.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : "Not set"}
                    </p>
                  </div>
                  <div className="p-3 bg-secondary/50 rounded-xl">
                    <p className="text-xs text-muted-foreground">Group Size</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {draft.groupSizeType === "later"
                        ? "Decide later"
                        : `Up to ${draft.groupSize}`}
                    </p>
                  </div>
                </div>

                {/* Travel Styles */}
                {draft.travelStyles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {draft.travelStyles.map((styleId) => {
                      const category = tripCategories.find((c) => c.id === styleId);
                      return category ? (
                        <span
                          key={styleId}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                        >
                          {category.icon} {category.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                {/* Budget summary */}
                {draft.budgetType !== "skip" && (
                  <div className="p-3 bg-secondary/50 rounded-xl">
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {draft.budgetType === "rough"
                        ? draft.roughBudgetTotal
                          ? `~RM ${draft.roughBudgetTotal.toLocaleString()}`
                          : "Rough estimate"
                        : `RM ${Object.values(draft.detailedBudget).reduce((a, b) => a + b, 0).toLocaleString()}`}
                    </p>
                  </div>
                )}

                {/* Expectations */}
                {draft.expectations.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">What to Expect</p>
                    <div className="flex flex-wrap gap-1.5">
                      {draft.expectations.map((exp, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-secondary text-foreground text-xs rounded-full"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Readiness Indicators */}
            <Card className="p-4 border-border/50 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Readiness</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {essentials ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm text-foreground">Essentials complete</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    ⏳ {optionalCount}/3 optional details added
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                You can always add more details later in the Trip Hub
              </p>
            </Card>

            {/* Edit shortcuts */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(1)}
                className="gap-1.5 rounded-xl"
              >
                <Pencil className="h-3.5 w-3.5" />
                Visibility
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(2)}
                className="gap-1.5 rounded-xl"
              >
                <Pencil className="h-3.5 w-3.5" />
                Basics
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(3)}
                className="gap-1.5 rounded-xl"
              >
                <Pencil className="h-3.5 w-3.5" />
                Plan
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom action bar for Create Trip - sits above bottom nav */}
      <div className="fixed inset-x-0 bottom-16 sm:bottom-20 z-30 bg-background/95 backdrop-blur-sm border-t border-border/50">
        <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-4 pt-3 pb-3">
          <div className="grid grid-cols-2 gap-3">
            {publishedTripId ? (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate(`/trip/${publishedTripId}`)}
                  className="w-full rounded-xl text-sm sm:text-base gap-2"
                >
                  View Trip
                </Button>
                <Button
                  size="lg"
                  onClick={() => setShowShareModal(true)}
                  className="w-full rounded-xl text-sm sm:text-base gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={currentStep === 1 ? () => setShowExitModal(true) : prevStep}
                  className="w-full rounded-xl text-sm sm:text-base gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>

                {currentStep < 4 ? (
                  <Button
                    size="lg"
                    onClick={nextStep}
                    disabled={
                      (currentStep === 1 && !draft.visibility) ||
                      (currentStep === 2 && !canProceedStep2())
                    }
                    className="w-full rounded-xl text-sm sm:text-base gap-2"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="w-full rounded-xl text-sm sm:text-base gap-2"
                  >
                    {isPublishing ? (
                      <>
                        <span className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full" />
                        {editTripId && tripStatus === "draft"
                          ? "Publishing…"
                          : editTripId
                          ? "Updating…"
                          : "Publishing…"}
                      </>
                    ) : (
                      <>
                        {editTripId && tripStatus === "draft" ? (
                          <>
                            <Send className="h-4 w-4" />
                            Publish Trip
                          </>
                        ) : editTripId ? (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Update Trip
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Publish
                          </>
                        )}
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full rounded-2xl p-0 overflow-hidden [&>button]:hidden">
          <DialogHeader className="p-4 pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-center flex-1">
                <span className="text-2xl">🎉</span>
                <br />
                Your trip is live!
              </DialogTitle>
              <button 
                onClick={() => setShowShareModal(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Share it with friends or let others discover it
            </p>
            
            <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl">
              <input
                type="text"
                readOnly
                value={`https://ketravelan.app/trip/${publishedTripId}`}
                className="flex-1 bg-transparent text-sm text-foreground outline-none"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(`https://ketravelan.app/trip/${publishedTripId}`);
                  toast({ title: "Link copied!" });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => {
                  setShowShareModal(false);
                  navigate(`/trip/${publishedTripId}`);
                }}
              >
                View Trip
              </Button>
              <Button
                className="flex-1 rounded-xl gap-2"
                onClick={() => {
                  // Share API or fallback - use snapshot since draft is cleared
                  if (navigator.share && draftSnapshotRef.current) {
                    navigator.share({
                      title: draftSnapshotRef.current.title,
                      url: `https://ketravelan.app/trip/${publishedTripId}`,
                    });
                  }
                }}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Drawer */}
      <Drawer open={showExitModal} onOpenChange={setShowExitModal}>
        <DrawerContent className="pt-[env(safe-area-inset-top)]">
          <DrawerHeader className="text-center">
            <DrawerTitle>Leave trip creation?</DrawerTitle>
            <DrawerDescription>
              Your progress can be saved as a draft, or you can discard this trip.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="gap-3 pb-8">
            <Button
              onClick={async () => {
                // Save as Draft: persist to backend if not already
                try {
                  if (!draft.title.trim()) {
                    toast({
                      title: 'Trip title required',
                      description: 'Please enter a trip title before saving as a draft.',
                      variant: 'destructive',
                    });
                    return;
                  }

                  if (!draftId) {
                    // Create new draft
                    await createTrip(convertDraftToTripData(draft, 'draft'));
                  } else {
                    // Update existing draft
                    await updateTrip(draftId, convertDraftToTripData(draft, 'draft'));
                  }
                  toast({ title: 'Draft saved', description: 'Your trip draft has been saved.' });
                  setShowExitModal(false);
                  navigate('/my-trips?tab=draft');
                } catch (err) {
                  toast({ title: 'Failed to save draft', description: 'Please try again.', variant: 'destructive' });
                }
              }}
              className="rounded-xl h-12"
            >
              Save as Draft
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  if (draftId) {
                    await deleteDraftTrip(draftId);
                  }
                  clearDraft();
                  toast({ title: 'Draft discarded', description: 'Your trip draft has been deleted.' });
                  setShowExitModal(false);
                  navigate('/explore');
                } catch (err) {
                  toast({ title: 'Failed to discard draft', description: 'Please try again.', variant: 'destructive' });
                }
              }}
              className="rounded-xl h-12"
            >
              Discard Trip
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowExitModal(false)}
              className="rounded-xl h-12"
            >
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </AppLayout>
  );
}
