import { GuidedTripWithRelations, TripFormData } from '../types/guided-trip';

export function convertTripToFormData(trip: GuidedTripWithRelations): TripFormData {
  return {
    title: trip.title || '',
    locations: trip.locations || [],
    description: trip.description || '',
    coverPhoto: null,
    coverPhotoUrl: trip.cover_photo_url || trip.cover_image_url || null,
    galleryPhotos: [],
    galleryPhotoUrls: trip.gallery?.map(g => g.image_url) || [],
    bookingTerms: trip.booking_terms || '',
    refundPolicy: trip.refund_policy || '',
    minimumBookingDays: trip.minimum_booking_days || 14,
    inclusions: trip.inclusions?.map(i => i.description) || [],
    exclusions: trip.exclusions?.map(e => e.description) || [],
    itinerarySummary: trip.itinerary_summary || '',
    itineraryDocument: null,
    itineraryDocumentUrl: trip.itinerary_document_url || null,
    qrCodes: [],
    qrCodeUrls: trip.qr_codes?.map(q => q.qr_code_url) || [],
    tripDuration: trip.trip_duration_days || 7,
    departureDateRanges: trip.departures?.map(d => ({
      startDate: d.start_date || '',
      endDate: d.end_date || '',
    })) || [],
    basePrice: trip.base_price || 0,
    depositPercentage: trip.deposit_percentage || 20,
    maxParticipants: trip.max_participants || 10,
    paymentSchedule: trip.payment_schedule || 'deposit_full_payment',
    status: trip.status || 'draft',
  };
}
