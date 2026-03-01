import { supabase } from './supabase';
import { createTrip } from './trips';

const DRAFT_ID_KEY = 'ketravelan-draft-trip-id';
const AUTO_SAVE_DELAY = 800;

let autoSaveTimeout: NodeJS.Timeout | null = null;

export interface Step1Data {
  visibility: 'public' | 'private';
}

export async function initializeDraftTrip(visibility: 'public' | 'private'): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User must be authenticated to create a draft trip');
  }

  const existingDraftId = localStorage.getItem(DRAFT_ID_KEY);

  if (existingDraftId) {
    const { data: existingDraft } = await supabase
      .from('trips')
      .select('id, status')
      .eq('id', existingDraftId)
      .eq('creator_id', user.id)
      .eq('status', 'draft')
      .maybeSingle();

    if (existingDraft) {
      await supabase
        .from('trips')
        .update({
          visibility,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDraftId)
        .eq('creator_id', user.id);

      return existingDraftId;
    } else {
      localStorage.removeItem(DRAFT_ID_KEY);
    }
  }

  const tripData = {
    type: 'community' as const,
    status: 'draft' as const,
    title: 'Untitled Trip',
    destination: 'TBD',
    visibility,
  };

  const newTrip = await createTrip(tripData);

  localStorage.setItem(DRAFT_ID_KEY, newTrip.id);

  return newTrip.id;
}

export async function updateDraftVisibility(tripId: string, visibility: 'public' | 'private'): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User must be authenticated');
  }

  const { error } = await supabase
    .from('trips')
    .update({
      visibility,
      updated_at: new Date().toISOString()
    })
    .eq('id', tripId)
    .eq('creator_id', user.id);

  if (error) throw error;
}

export function autoSaveVisibility(
  visibility: 'public' | 'private',
  onSaveStart: () => void,
  onSaveComplete: () => void,
  onSaveError: (error: Error) => void
): void {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }

  autoSaveTimeout = setTimeout(async () => {
    try {
      onSaveStart();

      const existingDraftId = localStorage.getItem(DRAFT_ID_KEY);

      if (existingDraftId) {
        await updateDraftVisibility(existingDraftId, visibility);
      } else {
        await initializeDraftTrip(visibility);
      }

      onSaveComplete();
    } catch (error) {
      onSaveError(error as Error);
    }
  }, AUTO_SAVE_DELAY);
}

export function cancelAutoSave(): void {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = null;
  }
}

export function getDraftTripId(): string | null {
  return localStorage.getItem(DRAFT_ID_KEY);
}

export function clearDraftTripId(): void {
  localStorage.removeItem(DRAFT_ID_KEY);
}
