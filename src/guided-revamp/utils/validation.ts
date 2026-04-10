import { TripFormData, ValidationErrors, StepValidation } from '../types/guided-trip';

export const validateStep1 = (data: TripFormData): StepValidation => {
  const errors: ValidationErrors = {};

  if (!data.title || data.title.trim().length === 0) {
    errors.title = 'Trip title is required';
  } else if (data.title.length > 200) {
    errors.title = 'Trip title must be less than 200 characters';
  }

  if (!data.locations || data.locations.length === 0) {
    errors.locations = 'At least one location is required';
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.description = 'Description is required';
  } else if (data.description.length < 50) {
    errors.description = 'Description should be at least 50 characters';
  } else if (data.description.length > 5000) {
    errors.description = 'Description must be less than 5000 characters';
  }

  if (!data.coverPhoto && !data.coverPhotoUrl) {
    errors.coverPhoto = 'Cover photo is required';
  }

  if (!data.galleryPhotos || (data.galleryPhotos.length === 0 && data.galleryPhotoUrls.length === 0)) {
    errors.galleryPhotos = 'At least one gallery photo is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateStep2 = (data: TripFormData): StepValidation => {
  const errors: ValidationErrors = {};

  if (!data.bookingTerms || data.bookingTerms.trim().length === 0) {
    errors.bookingTerms = 'Booking terms are required';
  } else if (data.bookingTerms.length < 20) {
    errors.bookingTerms = 'Booking terms should be at least 20 characters';
  }

  if (!data.refundPolicy || data.refundPolicy.trim().length === 0) {
    errors.refundPolicy = 'Refund & cancellation policy is required';
  } else if (data.refundPolicy.length < 20) {
    errors.refundPolicy = 'Refund policy should be at least 20 characters';
  }

  if (!data.minimumBookingDays || data.minimumBookingDays < 1) {
    errors.minimumBookingDays = 'Minimum booking period must be at least 1 day';
  } else if (data.minimumBookingDays > 365) {
    errors.minimumBookingDays = 'Minimum booking period cannot exceed 365 days';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateStep3 = (data: TripFormData): StepValidation => {
  const errors: ValidationErrors = {};

  if (!data.inclusions || data.inclusions.length === 0) {
    errors.inclusions = 'At least one inclusion is required';
  } else if (data.inclusions.some(inc => !inc.trim())) {
    errors.inclusions = 'All inclusions must have a description';
  }

  if (!data.exclusions || data.exclusions.length === 0) {
    errors.exclusions = 'At least one exclusion is required';
  } else if (data.exclusions.some(exc => !exc.trim())) {
    errors.exclusions = 'All exclusions must have a description';
  }

  if (!data.itinerarySummary || data.itinerarySummary.trim().length === 0) {
    errors.itinerarySummary = 'Itinerary summary is required';
  } else if (data.itinerarySummary.length < 50) {
    errors.itinerarySummary = 'Itinerary summary should be at least 50 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateStep4 = (data: TripFormData): StepValidation => {
  const errors: ValidationErrors = {};

  if (!data.qrCodes || (data.qrCodes.length === 0 && data.qrCodeUrls.length === 0)) {
    errors.qrCodes = 'At least one QR code is required';
  }

  if (!data.tripDuration || data.tripDuration < 1) {
    errors.tripDuration = 'Trip duration must be at least 1 day';
  } else if (data.tripDuration > 365) {
    errors.tripDuration = 'Trip duration cannot exceed 365 days';
  }

  if (!data.departureDateRanges || data.departureDateRanges.length === 0) {
    errors.departureDateRanges = 'At least one departure date range is required';
  } else {
    const invalidRanges = data.departureDateRanges.some(
      range => !range.startDate || !range.endDate || new Date(range.endDate) < new Date(range.startDate)
    );
    if (invalidRanges) {
      errors.departureDateRanges = 'All date ranges must have valid start and end dates';
    }
  }

  if (!data.basePrice || data.basePrice <= 0) {
    errors.basePrice = 'Base price must be greater than 0';
  } else if (data.basePrice > 1000000) {
    errors.basePrice = 'Base price cannot exceed 1,000,000 MYR';
  }

  if (data.depositPercentage === undefined || data.depositPercentage === null || data.depositPercentage < 0) {
    errors.depositPercentage = 'Deposit percentage is required';
  } else if (data.depositPercentage > 100) {
    errors.depositPercentage = 'Deposit percentage cannot exceed 100%';
  }

  if (!data.maxParticipants || data.maxParticipants < 1) {
    errors.maxParticipants = 'Maximum participants must be at least 1';
  } else if (data.maxParticipants > 1000) {
    errors.maxParticipants = 'Maximum participants cannot exceed 1000';
  }

  if (!data.paymentSchedule) {
    errors.paymentSchedule = 'Payment schedule is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateAllSteps = (data: TripFormData): StepValidation => {
  const step1 = validateStep1(data);
  const step2 = validateStep2(data);
  const step3 = validateStep3(data);
  const step4 = validateStep4(data);

  return {
    isValid: step1.isValid && step2.isValid && step3.isValid && step4.isValid,
    errors: {
      ...step1.errors,
      ...step2.errors,
      ...step3.errors,
      ...step4.errors,
    },
  };
};

export const validateFile = (
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
  }
): string | null => {
  const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png'] } = options;

  if (file.size > maxSize) {
    return `File size must be less than ${maxSize / (1024 * 1024)}MB`;
  }

  if (!allowedTypes.includes(file.type)) {
    return `File type must be one of: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`;
  }

  return null;
};

export const validateMultipleFiles = (
  files: File[],
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    maxCount?: number;
  }
): string | null => {
  const { maxCount } = options;

  if (maxCount && files.length > maxCount) {
    return `Maximum ${maxCount} files allowed`;
  }

  for (const file of files) {
    const error = validateFile(file, options);
    if (error) return error;
  }

  return null;
};
