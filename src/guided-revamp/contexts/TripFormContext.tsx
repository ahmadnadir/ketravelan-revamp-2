import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { TripFormData, DateRange, PaymentScheduleType } from '../types/guided-trip';

interface TripFormContextType {
  formData: TripFormData;
  currentStep: number;
  updateFormData: (data: Partial<TripFormData>) => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetForm: () => void;
  saveDraft: () => Promise<boolean>;
  publishTrip: () => Promise<boolean>;
  isLoading: boolean;
  isSaving: boolean;
}

const initialFormData: TripFormData = {
  title: '',
  locations: [],
  description: '',
  coverPhoto: null,
  coverPhotoUrl: null,
  galleryPhotos: [],
  galleryPhotoUrls: [],
  bookingTerms: '',
  refundPolicy: '',
  minimumBookingDays: 14,
  inclusions: [],
  exclusions: [],
  itinerarySummary: '',
  itineraryDocument: null,
  itineraryDocumentUrl: null,
  qrCodes: [],
  qrCodeUrls: [],
  tripDuration: 7,
  departureDateRanges: [],
  basePrice: 0,
  depositPercentage: 20,
  maxParticipants: 10,
  paymentSchedule: 'deposit_full_payment',
  status: 'draft',
};

const TripFormContext = createContext<TripFormContextType | undefined>(undefined);

export const useTripForm = () => {
  const context = useContext(TripFormContext);
  if (!context) {
    throw new Error('useTripForm must be used within a TripFormProvider');
  }
  return context;
};

interface TripFormProviderProps {
  children: React.ReactNode;
  initialData?: Partial<TripFormData>;
  onSave?: (data: TripFormData, status: 'draft' | 'published') => Promise<boolean>;
}

export const TripFormProvider: React.FC<TripFormProviderProps> = ({
  children,
  initialData,
  onSave,
}) => {
  const [formData, setFormData] = useState<TripFormData>({
    ...initialFormData,
    ...initialData,
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const savedDraft = localStorage.getItem('trip-form-draft');
    if (savedDraft && !initialData) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        setFormData({ ...initialFormData, ...parsedDraft });
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, [initialData]);

  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (formData.status === 'draft') {
        localStorage.setItem('trip-form-draft', JSON.stringify(formData));
      }
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [formData]);

  const updateFormData = useCallback((data: Partial<TripFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 5));
  }, []);

  const previousStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setCurrentStep(1);
    localStorage.removeItem('trip-form-draft');
  }, []);

  const saveDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      const success = onSave ? await onSave(formData, 'draft') : true;
      if (success) {
        localStorage.setItem('trip-form-draft', JSON.stringify(formData));
      }
      return success;
    } catch (error) {
      console.error('Failed to save draft:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSave]);

  const publishTrip = useCallback(async () => {
    setIsSaving(true);
    try {
      const success = onSave ? await onSave(formData, 'published') : true;
      if (success) {
        localStorage.removeItem('trip-form-draft');
      }
      return success;
    } catch (error) {
      console.error('Failed to publish trip:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSave]);

  const value: TripFormContextType = {
    formData,
    currentStep,
    updateFormData,
    setCurrentStep,
    nextStep,
    previousStep,
    resetForm,
    saveDraft,
    publishTrip,
    isLoading,
    isSaving,
  };

  return (
    <TripFormContext.Provider value={value}>
      {children}
    </TripFormContext.Provider>
  );
};
