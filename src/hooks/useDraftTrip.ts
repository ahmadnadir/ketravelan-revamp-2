/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadImageFromDataUrl, isUrl } from '@/lib/imageStorage';
import { createTrip, updateTrip } from '@/lib/trips';
import { initializeDraftTrip } from '@/lib/draftTripStep1';
import { toast } from '@/hooks/use-toast';

const DRAFT_KEY = 'ketravelan-draft-trip';
const DRAFT_ID_KEY = 'ketravelan-draft-trip-id';
const DEBOUNCE_MS = 1000;

export interface TripDraft {
  // Step 1
  visibility: 'public' | 'private';

  // Step 2 - Basics
  title: string;
  description: string;
  primaryDestination: string;
  destinationPlace?: string; // Display name of place (e.g., "Bali")
  destinationState?: string; // State/region (e.g., "Indonesia")
  destinationCountry?: string; // Country from API
  additionalStops: string[];
  additionalStopsDetails?: Array<{ name: string; place?: string; state?: string; country?: string }>; // Store location API data for stops
  dateType: 'flexible' | 'exact';
  startDate: string;
  endDate: string;
  travelStyles: string[];
  groupSizeType: 'later' | 'set';
  groupSize: number;
  galleryImages: string[];

  // Step 3 - Plan
  budgetType: 'skip' | 'rough' | 'detailed';
  roughBudgetTotal: number;
  roughBudgetCategories: string[];
  detailedBudget: Record<string, number>;

  itineraryType: 'skip' | 'notes' | 'dayByDay';
  simpleNotes: string;
  dayByDayPlan: { day: number; activities: string[] }[];

  expectations: string[];

  // Meta
  lastSaved?: number;
  draftId?: string;
  currency?: string;
}

export const getDefaultDraft = (): TripDraft => ({
  visibility: 'public',
  title: '',
  description: '',
  primaryDestination: '',
  destinationPlace: '',
  destinationState: '',
  destinationCountry: '',
  additionalStops: [],
  additionalStopsDetails: [],
  dateType: 'flexible',
  startDate: '',
  endDate: '',
  travelStyles: [],
  groupSizeType: 'later',
  groupSize: 3,
  galleryImages: [],
  budgetType: 'skip',
  roughBudgetTotal: 0,
  roughBudgetCategories: [],
  detailedBudget: {},
  itineraryType: 'skip',
  simpleNotes: '',
  dayByDayPlan: [],
  expectations: [],
  currency: 'MYR',
});

function convertDraftToTripData(draft: TripDraft, status: 'draft' | 'published' = 'draft') {
    // Debug log to inspect split
    console.log('[convertDraftToTripData] travel_styles:', draft.travelStyles);
    console.log('[convertDraftToTripData] expectations:', draft.expectations);
  // Explicit lists for travel styles and expectations
  const travelStyleIds = [
    'nature-outdoor', 'beach', 'city-urban', 'adventure', 'culture', 'food', 'cross-border'
  ];
  const expectationTags = [
    'Shared accommodation', 'Passport / Visa required', 'Budget-friendly',
    'Some hiking involved', 'Early mornings', 'Able to swim',
    'Photography-focused', 'Vegetarian-friendly'
  ];

  // travel_styles: only travel style ids selected
  const travel_styles = draft.travelStyles.filter(id => travelStyleIds.includes(id));
  // tags: only expectation tags selected
  const tags = draft.expectations.filter(tag => expectationTags.includes(tag));

  const budgetBreakdown = draft.budgetType === 'detailed'
    ? draft.detailedBudget
    : draft.budgetType === 'rough' && draft.roughBudgetTotal > 0
    ? {
        total: draft.roughBudgetTotal,
        categories: draft.roughBudgetCategories
      }
    : null;

  // Build itinerary, filtering out empty activities and empty days
  const filteredDayByDay = draft.dayByDayPlan
    .map(day => ({
      day: day.day,
      activities: (day.activities || [])
        .map(a => (typeof a === 'string' ? a.trim() : ''))
        .filter(a => !!a),
    }))
    .filter(day => day.activities.length > 0);

  const itinerary = draft.itineraryType === 'dayByDay'
    ? filteredDayByDay
    : draft.itineraryType === 'notes' && draft.simpleNotes
    ? [{ notes: draft.simpleNotes }]
    : undefined;

  let price: number | undefined = undefined;
  // Always use budget_breakdown.total for rough mode if available
  if (draft.budgetType === 'rough') {
    if (draft.roughBudgetTotal > 0) {
      price = draft.roughBudgetTotal;
    } else if (
      draft.detailedBudget &&
      typeof draft.detailedBudget === 'object' &&
      (draft.detailedBudget as any).total
    ) {
      price = (draft.detailedBudget as any).total;
    }
  } else if (draft.budgetType === 'detailed' && draft.detailedBudget && typeof draft.detailedBudget === 'object') {
    price = Object.values(draft.detailedBudget).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
  }

  // Build destination in "Place, Country" format for consistency
  const destination = draft.destinationCountry
    ? `${draft.primaryDestination}, ${draft.destinationCountry}`
    : draft.primaryDestination;

  const payload = {
    type: 'community' as const,
    status,
    title: draft.title,
    description: draft.description || undefined,
    destination: destination,
    cover_image: draft.galleryImages[0] || undefined,
    images: draft.galleryImages.length > 0 ? draft.galleryImages : undefined,
    start_date:
      draft.dateType === 'exact'
        ? draft.startDate || null
        : null,
    end_date:
      draft.dateType === 'exact'
        ? draft.endDate || null
        : null,
    max_participants: draft.groupSizeType === 'set' ? draft.groupSize : 5,
    visibility: draft.visibility,
    tags,
    travel_styles,
    stops: draft.additionalStops.length > 0 ? JSON.stringify(draft.additionalStops) : undefined,
    budget_mode: draft.budgetType !== 'skip' ? draft.budgetType : undefined,
    budget_breakdown: budgetBreakdown,
    itinerary_type: draft.itineraryType !== 'skip' ? draft.itineraryType : undefined,
    // For dayByDay, always send the array (possibly empty) to overwrite stale entries
    itinerary:
      draft.itineraryType === 'dayByDay'
        ? filteredDayByDay
        : itinerary,
    currency: draft.currency || 'MYR',
    price,
  };
  console.log('[convertDraftToTripData] travel_styles:', travel_styles);
  console.log('[convertDraftToTripData] tags:', tags);
  console.log('[convertDraftToTripData] payload:', payload);
  return payload;
}

export function useDraftTrip(options?: { disableAutoSave?: boolean; suppressAutoSaveToast?: boolean }) {
  const disableAutoSave = options?.disableAutoSave ?? false;
  const suppressAutoSaveToast = options?.suppressAutoSaveToast ?? false;
  const [draft, setDraft] = useState<TripDraft>(getDefaultDraft);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const draftIdRef = useRef<string | null>(null);

  const loadDraft = useCallback(async () => {
    try {
      const savedDraftId = localStorage.getItem(DRAFT_ID_KEY);
      const localDraft = localStorage.getItem(DRAFT_KEY);

      if (savedDraftId) {
        const { data: dbDraft } = await supabase
          .from('trips')
          .select('*')
          .eq('id', savedDraftId)
          .eq('status', 'draft')
          .maybeSingle();

        if (dbDraft) {
          const parsedStops = dbDraft.stops ? JSON.parse(dbDraft.stops) : [];
          // Use travel_styles and tags directly from dbDraft
          const travelStyleTags = dbDraft.travel_styles || [];
          const expectationTags = dbDraft.tags || [];

          const budgetCategories = dbDraft.budget_breakdown?.categories || [];
          const roughTotal = dbDraft.budget_breakdown?.total || 0;

          const itineraryData = dbDraft.itinerary || [];
          const simpleNotes = itineraryData[0]?.notes || '';
          const dayByDayPlan = dbDraft.itinerary_type === 'dayByDay'
            ? itineraryData.map((item: any) => ({
                day: item.day,
                activities: item.activities || []
              }))
            : [];

          const loadedDraft: TripDraft = {
            draftId: dbDraft.id,
            visibility: dbDraft.visibility,
            title: dbDraft.title || '',
            description: dbDraft.description || '',
            primaryDestination: dbDraft.destination || '',
            additionalStops: parsedStops,
            dateType: dbDraft.start_date && dbDraft.end_date ? 'exact' : 'flexible',
            startDate: dbDraft.start_date || '',
            endDate: dbDraft.end_date || '',
            travelStyles: travelStyleTags,
            groupSizeType: dbDraft.max_participants ? 'set' : 'later',
            groupSize: dbDraft.max_participants || 3,
            galleryImages: dbDraft.images || [],
            budgetType: dbDraft.budget_mode || 'skip',
            roughBudgetTotal: roughTotal,
            roughBudgetCategories: budgetCategories,
            detailedBudget: dbDraft.budget_mode === 'detailed' ? dbDraft.budget_breakdown : {},
            itineraryType: dbDraft.itinerary_type || 'skip',
            simpleNotes: simpleNotes,
            dayByDayPlan: dayByDayPlan,
            expectations: expectationTags,
            lastSaved: new Date(dbDraft.updated_at).getTime(),
          };

          setDraft(loadedDraft);
          setHasDraft(true);
          setLastSaved(new Date(dbDraft.updated_at));
          draftIdRef.current = loadedDraft.draftId || dbDraft.id;
          return;
        }
      }

      if (localDraft) {
        const parsed = JSON.parse(localDraft) as TripDraft;
        setDraft(parsed);
        setHasDraft(true);
        if (parsed.lastSaved) {
          setLastSaved(new Date(parsed.lastSaved));
        }
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
    }
  }, []);

  // Load draft on mount
  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const saveDraft = useCallback(
    (data: TripDraft, skipValidation = false) => {
      // HARD STOP: never auto-save in edit mode
      if (disableAutoSave) {
        return;
      }

      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(async () => {
        // Extra safety in case state changed during debounce
        if (disableAutoSave) return;

        /* --------------------------------
        * 1. Lightweight save (visibility only)
        * -------------------------------- */
        const hasMinimumFields = Boolean(data.title && data.primaryDestination);

        if (!skipValidation && !hasMinimumFields) {
          if (!draftIdRef.current || !data.visibility) return;

          setIsSaving(true);
          try {
            const { data: auth } = await supabase.auth.getUser();
            if (!auth?.user) return;

            await supabase
              .from('trips')
              .update({
                visibility: data.visibility,
                updated_at: new Date().toISOString(),
              })
              .eq('id', draftIdRef.current)
              .eq('creator_id', auth.user.id);

            setLastSaved(new Date());
            setHasDraft(true);
          } catch (err) {
            console.error('[saveDraft] Failed to update visibility', err);
          } finally {
            setIsSaving(false);
          }

          return;
        }

        /* --------------------------------
        * 2. Full draft save
        * -------------------------------- */
        setIsSaving(true);

        try {
          // Persist locally first (instant UX)
          const localDraft = { ...data, lastSaved: Date.now() };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(localDraft));

          const { data: auth } = await supabase.auth.getUser();
          if (!auth?.user) return;

          // Upload images for draft to Storage (avoid repeated base64 autosaves)
          const bucket = (import.meta as any).env?.VITE_TRIP_IMAGES_BUCKET || 'trip-images';
          const currentId = draftIdRef.current || localStorage.getItem(DRAFT_ID_KEY) || 'draft';
          const folderPrefix = `trips/${currentId}`;

          const updatedGallery = await Promise.all(
            (data.galleryImages || []).map(async (img, idx) => {
              const s = String(img || '').trim();
              if (!s) return s;
              const isData = s.startsWith('data:image/');
              if (isUrl(s) && !isData) return s;
              try {
                const targetFolder = idx === 0 ? `${folderPrefix}/cover` : `${folderPrefix}/gallery`;
                const url = await uploadImageFromDataUrl(s, {
                  bucket,
                  folder: targetFolder,
                });
                return url;
              } catch (e) {
                console.warn('[autosave] upload failed, keep original base64', e);
                return s;
              }
            })
          );

          const dataWithUrls: TripDraft = { ...data, galleryImages: updatedGallery };
          // Reflect URLs in local state so subsequent autosaves don't re-upload
          setDraft(prev => ({ ...prev, galleryImages: updatedGallery }));

          const tripData = convertDraftToTripData(dataWithUrls, 'draft');

          if (draftIdRef.current) {
            // UPDATE existing draft
            await updateTrip(draftIdRef.current, tripData);
          } else {
            // CREATE new draft (new trip flow only)
            const created = await createTrip(tripData);

            if (!created?.id) {
              throw new Error('Draft creation failed');
            }

            draftIdRef.current = created.id;
            localStorage.setItem(DRAFT_ID_KEY, created.id);

            setDraft(prev => ({
              ...prev,
              draftId: created.id,
            }));
          }

          setLastSaved(new Date());
          setHasDraft(true);

          if (!suppressAutoSaveToast) {
            toast({
              title: 'Draft saved',
              description: 'Your trip draft has been saved automatically.',
              duration: 2000,
            });
          }
        } catch (err) {
          console.error('[saveDraft] Failed to save draft', err);

          toast({
            title: 'Failed to save draft',
            description: 'Could not save your changes. Please try again.',
            variant: 'destructive',
            duration: 3000,
          });
        } finally {
          setIsSaving(false);
        }
      }, DEBOUNCE_MS);
    },
    [
      disableAutoSave,
      setDraft,
      suppressAutoSaveToast,
    ]
  );

  const updateDraft = useCallback(<K extends keyof TripDraft>(
    field: K,
    value: TripDraft[K]
  ) => {
    setDraft(prev => {
      const updated = { ...prev, [field]: value };
      saveDraft(updated);
      return updated;
    });
  }, [saveDraft]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_ID_KEY);
      setDraft(getDefaultDraft());
      setHasDraft(false);
      setLastSaved(null);
      draftIdRef.current = null;
    } catch (e) {
      console.error('Failed to clear draft:', e);
    }
  }, []);

  const resetDraft = useCallback(() => {
    const fresh = getDefaultDraft();
    setDraft(fresh);
    draftIdRef.current = null;
    localStorage.removeItem(DRAFT_ID_KEY);
    saveDraft(fresh);
  }, [saveDraft]);

  const initializeWithVisibility = useCallback(async (visibility: 'public' | 'private') => {
    try {
      const tripId = await initializeDraftTrip(visibility);
      draftIdRef.current = tripId;

      setDraft(prev => ({
        ...prev,
        visibility,
        draftId: tripId,
      }));

      setHasDraft(true);
      setLastSaved(new Date());

      return tripId;
    } catch (e) {
      console.error('Failed to initialize draft trip:', e);
      throw e;
    }
  }, []);

  return {
    draft,
    setDraft,
    updateDraft,
    saveDraft,
    clearDraft,
    resetDraft,
    initializeWithVisibility,
    hasDraft,
    lastSaved,
    isSaving,
    draftId: draftIdRef.current,
    convertDraftToTripData,
  };
}
