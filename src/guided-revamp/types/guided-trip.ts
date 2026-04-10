export interface Destination {
  id: string;
  name: string;
  country: string;
  created_at: string;
}

export interface GuidedTrip {
  id: string;
  creator_id: string;
  agent_id?: string | null;
  title: string | null;
  description: string | null;
  cover_image_url?: string | null;
  cover_photo_url: string | null;
  trip_duration_days: number | null;
  base_price: number | null;
  deposit_percentage: number | null;
  max_participants: number | null;
  current_participants: number;
  payment_schedule: string | null;
  booking_terms: string | null;
  refund_policy: string | null;
  minimum_booking_days: number | null;
  itinerary_summary: string | null;
  itinerary_document_url: string | null;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  max_installments: number;
  allow_installments: boolean;
}

export interface TripDestination {
  trip_id: string;
  destination_id: string;
}

export interface TripInclusion {
  id: string;
  trip_id: string;
  description: string;
  sort_order: number;
}

export interface TripExclusion {
  id: string;
  trip_id: string;
  description: string;
  sort_order: number;
}

export interface TripGallery {
  id: string;
  trip_id: string;
  image_url: string;
  sort_order: number;
}

export interface TripQRCode {
  id: string;
  trip_id: string;
  qr_code_url: string;
  payment_method: string | null;
  sort_order: number;
}

export interface TripDepartureDate {
  id: string;
  trip_id: string;
  start_date: string;
  end_date: string;
  max_capacity: number;
  booked_pax: number;
  price_per_person: number | null;
  is_available: boolean;
}

export interface Location {
  place_name: string;
  formatted_address: string;
  latitude?: number;
  longitude?: number;
  country?: string;
}

export interface TripLocation {
  id: string;
  trip_id: string;
  place_name: string;
  formatted_address: string;
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  sort_order: number;
  created_at: string;
}

export interface LocationSearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

export interface TripFormData {
  id?: string;
  title: string;
  locations: Location[];
  description: string;
  coverPhoto: File | null;
  coverPhotoUrl: string | null;
  galleryPhotos: File[];
  galleryPhotoUrls: string[];
  bookingTerms: string;
  refundPolicy: string;
  minimumBookingDays: number;
  inclusions: string[];
  exclusions: string[];
  itinerarySummary: string;
  itineraryDocument: File | null;
  itineraryDocumentUrl: string | null;
  qrCodes: File[];
  qrCodeUrls: string[];
  tripDuration: number;
  departureDateRanges: DateRange[];
  basePrice: number;
  depositPercentage: number;
  maxParticipants: number;
  paymentSchedule: PaymentScheduleType;
  status: 'draft' | 'published';
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export type PaymentScheduleType =
  | 'deposit_full_payment'
  | 'deposit_installments'
  | 'full_payment_upfront';

export interface ValidationErrors {
  [key: string]: string;
}

export interface StepValidation {
  isValid: boolean;
  errors: ValidationErrors;
}

export interface CommissionBreakdown {
  depositByAgent: number;
  platformFee: number;
  totalDepositRequired: number;
  totalRevenue: number;
  revenueToAgent: number;
  totalDepositToAgent: number;
}

export interface GuidedTripWithRelations extends GuidedTrip {
  locations?: TripLocation[];
  departures?: TripDepartureDate[];
  inclusions?: TripInclusion[];
  exclusions?: TripExclusion[];
  gallery?: TripGallery[];
  qr_codes?: TripQRCode[];
}

export type PaymentMode = 'full' | 'deposit_installments' | 'deposit_final';
export type BookingStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'payment_failed'
  | 'partially_paid';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';
export type InstallmentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface PaymentInstallment {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: InstallmentStatus;
}

export interface PaymentPlanSnapshot {
  mode: PaymentMode;
  totalAmount: number;
  depositAmount: number;
  depositPercentage: number;
  remainingBalance: number;
  numInstallments: number;
  installments: PaymentInstallment[];
  createdAt: string;
}

export interface Booking {
  id: string;
  booking_reference: string;
  trip_id: string;
  departure_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  num_participants: number;
  total_amount: number;
  payment_mode: PaymentMode;
  payment_plan_snapshot: PaymentPlanSnapshot;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  slots_reserved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentSchedule {
  id: string;
  booking_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  payment_status: InstallmentStatus;
  paid_at: string | null;
  payment_method: string | null;
  transaction_reference: string | null;
  created_at: string;
}
