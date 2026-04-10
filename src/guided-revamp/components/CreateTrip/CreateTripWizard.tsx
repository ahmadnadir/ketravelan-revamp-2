import React from 'react';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { TripFormProvider, useTripForm } from '../../contexts/TripFormContext';
import { Step1TripDetails } from './Step1TripDetails';
import { Step2BookingTerms } from './Step2BookingTerms';
import { Step3InclusionsExclusions } from './Step3InclusionsExclusions';
import { Step4DatesPricing } from './Step4DatesPricing';
import { Step5Preview } from './Step5Preview';
import {
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  validateAllSteps,
} from '../../utils/validation';
import { createTrip, updateTrip } from '../../services/tripService';
import { TripFormData } from '../../types/guided-trip';

const STEPS = [
  { number: 1, title: 'Trip Details', component: Step1TripDetails },
  { number: 2, title: 'Booking Terms', component: Step2BookingTerms },
  { number: 3, title: 'Inclusions & Exclusions', component: Step3InclusionsExclusions },
  { number: 4, title: 'Dates & Pricing', component: Step4DatesPricing },
  { number: 5, title: 'Preview', component: Step5Preview },
];

interface WizardContentProps {
  onComplete?: () => void;
  isEditMode?: boolean;
  tripId?: string;
}

const WizardContent: React.FC<WizardContentProps> = ({ onComplete, isEditMode, tripId }) => {
  const { currentStep, setCurrentStep, nextStep, previousStep, formData, saveDraft, publishTrip, isSaving } = useTripForm();

  const CurrentStepComponent = STEPS[currentStep - 1].component;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return validateStep1(formData).isValid;
      case 2:
        return validateStep2(formData).isValid;
      case 3:
        return validateStep3(formData).isValid;
      case 4:
        return validateStep4(formData).isValid;
      case 5:
        return validateAllSteps(formData).isValid;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed()) {
      nextStep();
    }
  };

  const handleSaveDraft = async () => {
    const success = await saveDraft();
    if (success) {
      alert('Draft saved successfully!');
    } else {
      alert('Failed to save draft. Please try again.');
    }
  };

  const handlePublish = async () => {
    if (!validateAllSteps(formData).isValid) {
      alert('Please fix all validation errors before publishing.');
      return;
    }

    const success = await publishTrip();
    if (success) {
      alert('Trip published successfully!');
      if (onComplete) {
        onComplete();
      }
    } else {
      alert('Failed to publish trip. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {isEditMode ? 'Edit Guided Trip' : 'Create a Guided Trip'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {isEditMode ? 'Update your guided trip details.' : 'Follow the steps to create your guided trip experience.'}
          </p>
        </div>

        <div className="mb-6 sm:mb-8 overflow-x-auto">
          <div className="flex items-center justify-between min-w-max sm:min-w-0">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.number}>
                <button
                  onClick={() => setCurrentStep(step.number)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all flex-shrink-0 ${
                    currentStep === step.number
                      ? 'bg-black text-white'
                      : currentStep > step.number
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-white text-gray-500 border border-gray-300'
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                      currentStep === step.number
                        ? 'bg-white text-black'
                        : currentStep > step.number
                        ? 'bg-gray-400 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step.number}
                  </span>
                  <span className="hidden lg:inline text-sm font-medium">{step.title}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-1 sm:mx-2 min-w-[20px] ${currentStep > step.number ? 'bg-gray-400' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="mb-6 sm:mb-8">
          <CurrentStepComponent />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 sticky bottom-0 bg-gray-50 py-4 sm:py-0 sm:relative">
          <button
            onClick={previousStep}
            disabled={currentStep === 1}
            className={`flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 border rounded-lg transition-colors ${
              currentStep === 1
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm sm:text-base">Previous</span>
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span className="text-sm sm:text-base">{isSaving ? 'Saving...' : 'Save Draft'}</span>
            </button>

            {currentStep < 5 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-2.5 rounded-lg transition-colors ${
                  canProceed()
                    ? 'bg-black text-white hover:bg-gray-800 active:bg-gray-900'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span className="text-sm sm:text-base">Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={!validateAllSteps(formData).isValid || isSaving}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-2.5 rounded-lg transition-colors ${
                  validateAllSteps(formData).isValid && !isSaving
                    ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span className="text-sm sm:text-base">
                  {isSaving ? (isEditMode ? 'Updating...' : 'Publishing...') : (isEditMode ? 'Update' : 'Publish')}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface CreateTripWizardProps {
  onComplete?: () => void;
  tripId?: string;
  initialData?: Partial<TripFormData>;
}

export const CreateTripWizard: React.FC<CreateTripWizardProps> = ({ onComplete, tripId, initialData }) => {
  const isEditMode = !!tripId;

  const handleSave = async (data: TripFormData, status: 'draft' | 'published'): Promise<boolean> => {
    try {
      if (isEditMode && tripId) {
        const success = await updateTrip(tripId, data, status);
        if (success) {
          console.log(`Trip ${status} successfully`);
          return true;
        }
        return false;
      } else {
        const newTripId = await createTrip(data, status);
        if (newTripId) {
          console.log(`Trip ${status} successfully with ID:`, newTripId);
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('Error saving trip:', error);
      return false;
    }
  };

  return (
    <TripFormProvider onSave={handleSave} initialData={initialData}>
      <WizardContent onComplete={onComplete} isEditMode={isEditMode} tripId={tripId} />
    </TripFormProvider>
  );
};
