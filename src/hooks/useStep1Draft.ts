import { useState, useEffect, useCallback } from 'react';
import { autoSaveVisibility, cancelAutoSave, getDraftTripId, initializeDraftTrip } from '@/lib/draftTripStep1';

export function useStep1Draft() {
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existingDraftId = getDraftTripId();
    if (existingDraftId) {
      setDraftId(existingDraftId);
    }
  }, []);

  const handleVisibilityChange = useCallback((newVisibility: 'public' | 'private') => {
    setVisibility(newVisibility);
    setError(null);

    autoSaveVisibility(
      newVisibility,
      () => setIsSaving(true),
      () => {
        setIsSaving(false);
        setLastSaved(new Date());
        const savedDraftId = getDraftTripId();
        if (savedDraftId) {
          setDraftId(savedDraftId);
        }
      },
      (err) => {
        setIsSaving(false);
        setError(err.message);
        console.error('Auto-save failed:', err);
      }
    );
  }, []);

  const createDraftNow = useCallback(async (visibilityChoice: 'public' | 'private') => {
    setIsSaving(true);
    setError(null);

    try {
      cancelAutoSave();
      const tripId = await initializeDraftTrip(visibilityChoice);
      setDraftId(tripId);
      setVisibility(visibilityChoice);
      setLastSaved(new Date());
      return tripId;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelAutoSave();
    };
  }, []);

  return {
    visibility,
    setVisibility: handleVisibilityChange,
    createDraftNow,
    isSaving,
    lastSaved,
    draftId,
    error,
  };
}
