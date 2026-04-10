import { supabase } from '../lib/supabase';
import { TripFormData } from '../types/guided-trip';
import { uploadFile, uploadMultipleFiles, STORAGE_BUCKETS } from '../utils/storage';

export const createTrip = async (formData: TripFormData, status: 'draft' | 'published'): Promise<string | null> => {
  try {
    let user = (await supabase.auth.getUser()).data.user;

    if (!user) {
      const testEmail = 'test-agent@guidedtrips.com';
      const testPassword = 'test-password-123';

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (signInError) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: testEmail,
          password: testPassword,
        });

        if (signUpError) throw signUpError;
        user = signUpData.user;
      } else {
        user = signInData.user;
      }

      if (!user) throw new Error('Failed to authenticate user');
    }

    let coverPhotoUrl = formData.coverPhotoUrl;
    if (formData.coverPhoto) {
      const result = await uploadFile(STORAGE_BUCKETS.COVER_PHOTOS, formData.coverPhoto);
      if (result) coverPhotoUrl = result.url;
    }

    let galleryPhotoUrls = formData.galleryPhotoUrls;
    if (formData.galleryPhotos.length > 0) {
      const results = await uploadMultipleFiles(STORAGE_BUCKETS.GALLERY, formData.galleryPhotos);
      galleryPhotoUrls = results.map(r => r.url);
    }

    let qrCodeUrls = formData.qrCodeUrls;
    if (formData.qrCodes.length > 0) {
      const results = await uploadMultipleFiles(STORAGE_BUCKETS.QR_CODES, formData.qrCodes);
      if (results.length !== formData.qrCodes.length) {
        throw new Error('Some QR code uploads failed. Please retry uploading the QR files.');
      }
      qrCodeUrls = results.map(r => r.url);
    }

    if (status === 'published' && qrCodeUrls.length === 0) {
      throw new Error('At least one agent QR code is required before publishing.');
    }

    let itineraryDocumentUrl = formData.itineraryDocumentUrl;
    if (formData.itineraryDocument) {
      const result = await uploadFile(STORAGE_BUCKETS.DOCUMENTS, formData.itineraryDocument);
      if (result) itineraryDocumentUrl = result.url;
    }

    const { data: trip, error: tripError } = await supabase
      .from('guided_trips')
      .insert({
        creator_id: user.id,
        title: formData.title,
        description: formData.description,
        cover_image_url: coverPhotoUrl,
        cover_photo_url: coverPhotoUrl,
        trip_duration_days: formData.tripDuration,
        base_price: formData.basePrice,
        deposit_percentage: formData.depositPercentage,
        max_participants: formData.maxParticipants,
        payment_schedule: formData.paymentSchedule,
        booking_terms: formData.bookingTerms,
        refund_policy: formData.refundPolicy,
        minimum_booking_days: formData.minimumBookingDays,
        itinerary_summary: formData.itinerarySummary,
        itinerary_document_url: itineraryDocumentUrl,
        status,
      })
      .select()
      .single();

    if (tripError) throw tripError;

    const tripId = trip.id;

    if (formData.locations.length > 0) {
      const tripLocations = formData.locations.map((location, index) => ({
        trip_id: tripId,
        place_name: location.place_name,
        formatted_address: location.formatted_address,
        latitude: location.latitude || null,
        longitude: location.longitude || null,
        country: location.country || null,
        sort_order: index,
      }));
      const { error } = await supabase.from('guided_trip_locations').insert(tripLocations);
      if (error) throw error;
    }

    if (formData.inclusions.length > 0) {
      const inclusions = formData.inclusions.map((desc, index) => ({
        trip_id: tripId,
        description: desc,
        sort_order: index,
      }));
      const { error } = await supabase.from('guided_trip_inclusions').insert(inclusions);
      if (error) throw error;
    }

    if (formData.exclusions.length > 0) {
      const exclusions = formData.exclusions.map((desc, index) => ({
        trip_id: tripId,
        description: desc,
        sort_order: index,
      }));
      const { error } = await supabase.from('guided_trip_exclusions').insert(exclusions);
      if (error) throw error;
    }

    if (galleryPhotoUrls.length > 0) {
      const gallery = galleryPhotoUrls.map((url, index) => ({
        trip_id: tripId,
        image_url: url,
        sort_order: index,
      }));
      const { error } = await supabase.from('guided_trip_gallery').insert(gallery);
      if (error) throw error;
    }

    if (qrCodeUrls.length > 0) {
      const qrCodes = qrCodeUrls.map((url, index) => ({
        trip_id: tripId,
        qr_code_url: url,
        sort_order: index,
      }));
      const { error } = await supabase.from('guided_trip_qr_codes').insert(qrCodes);
      if (error) throw error;
    } else if (status === 'published') {
      throw new Error('No QR code records were written for this trip.');
    }

    if (formData.departureDateRanges.length > 0) {
      const dateRanges = formData.departureDateRanges.map(range => ({
        trip_id: tripId,
        start_date: range.startDate,
        end_date: range.endDate,
        max_capacity: formData.maxParticipants,
        price_per_person: formData.basePrice,
        is_available: true,
      }));
      const { error } = await supabase.from('guided_trip_departure_dates').insert(dateRanges);
      if (error) throw error;
    }

    return tripId;
  } catch (error) {
    console.error('Error creating trip:', error);
    return null;
  }
};

export const updateTrip = async (tripId: string, formData: TripFormData, status: 'draft' | 'published'): Promise<boolean> => {
  try {
    let user = (await supabase.auth.getUser()).data.user;

    if (!user) {
      const testEmail = 'test-agent@guidedtrips.com';
      const testPassword = 'test-password-123';

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (signInError) throw signInError;
      user = signInData.user;

      if (!user) throw new Error('Failed to authenticate user');
    }

    let coverPhotoUrl = formData.coverPhotoUrl;
    if (formData.coverPhoto) {
      const result = await uploadFile(STORAGE_BUCKETS.COVER_PHOTOS, formData.coverPhoto);
      if (result) coverPhotoUrl = result.url;
    }

    let galleryPhotoUrls = formData.galleryPhotoUrls;
    if (formData.galleryPhotos.length > 0) {
      const results = await uploadMultipleFiles(STORAGE_BUCKETS.GALLERY, formData.galleryPhotos);
      galleryPhotoUrls = [...galleryPhotoUrls, ...results.map(r => r.url)];
    }

    let qrCodeUrls = formData.qrCodeUrls;
    if (formData.qrCodes.length > 0) {
      const results = await uploadMultipleFiles(STORAGE_BUCKETS.QR_CODES, formData.qrCodes);
      if (results.length !== formData.qrCodes.length) {
        throw new Error('Some QR code uploads failed. Please retry uploading the QR files.');
      }
      qrCodeUrls = [...qrCodeUrls, ...results.map(r => r.url)];
    }

    if (status === 'published' && qrCodeUrls.length === 0) {
      throw new Error('At least one agent QR code is required before publishing.');
    }

    let itineraryDocumentUrl = formData.itineraryDocumentUrl;
    if (formData.itineraryDocument) {
      const result = await uploadFile(STORAGE_BUCKETS.DOCUMENTS, formData.itineraryDocument);
      if (result) itineraryDocumentUrl = result.url;
    }

    const { data: updatedTrip, error: tripError } = await supabase
      .from('guided_trips')
      .update({
        title: formData.title,
        description: formData.description,
        cover_image_url: coverPhotoUrl,
        cover_photo_url: coverPhotoUrl,
        trip_duration_days: formData.tripDuration,
        base_price: formData.basePrice,
        deposit_percentage: formData.depositPercentage,
        max_participants: formData.maxParticipants,
        payment_schedule: formData.paymentSchedule,
        booking_terms: formData.bookingTerms,
        refund_policy: formData.refundPolicy,
        minimum_booking_days: formData.minimumBookingDays,
        itinerary_summary: formData.itinerarySummary,
        itinerary_document_url: itineraryDocumentUrl,
        status,
      })
      .eq('id', tripId)
      .eq('creator_id', user.id)
      .select('id')
      .maybeSingle();

    if (tripError) throw tripError;
    if (!updatedTrip) throw new Error('Trip not found or you do not have permission to update it');

    {
      const { error } = await supabase.from('guided_trip_locations').delete().eq('trip_id', tripId);
      if (error) throw error;
    }
    if (formData.locations.length > 0) {
      const tripLocations = formData.locations.map((location, index) => ({
        trip_id: tripId,
        place_name: location.place_name,
        formatted_address: location.formatted_address,
        latitude: location.latitude || null,
        longitude: location.longitude || null,
        country: location.country || null,
        sort_order: index,
      }));
      const { error } = await supabase.from('guided_trip_locations').insert(tripLocations);
      if (error) throw error;
    }

    {
      const { error } = await supabase.from('guided_trip_inclusions').delete().eq('trip_id', tripId);
      if (error) throw error;
    }
    if (formData.inclusions.length > 0) {
      const inclusions = formData.inclusions.map((desc, index) => ({
        trip_id: tripId,
        description: desc,
        sort_order: index,
      }));
      const { error } = await supabase.from('guided_trip_inclusions').insert(inclusions);
      if (error) throw error;
    }

    {
      const { error } = await supabase.from('guided_trip_exclusions').delete().eq('trip_id', tripId);
      if (error) throw error;
    }
    if (formData.exclusions.length > 0) {
      const exclusions = formData.exclusions.map((desc, index) => ({
        trip_id: tripId,
        description: desc,
        sort_order: index,
      }));
      const { error } = await supabase.from('guided_trip_exclusions').insert(exclusions);
      if (error) throw error;
    }

    {
      const { error } = await supabase.from('guided_trip_gallery').delete().eq('trip_id', tripId);
      if (error) throw error;
    }
    if (galleryPhotoUrls.length > 0) {
      const gallery = galleryPhotoUrls.map((url, index) => ({
        trip_id: tripId,
        image_url: url,
        sort_order: index,
      }));
      const { error } = await supabase.from('guided_trip_gallery').insert(gallery);
      if (error) throw error;
    }

    {
      const { error } = await supabase.from('guided_trip_qr_codes').delete().eq('trip_id', tripId);
      if (error) throw error;
    }
    if (qrCodeUrls.length > 0) {
      const qrCodes = qrCodeUrls.map((url, index) => ({
        trip_id: tripId,
        qr_code_url: url,
        sort_order: index,
      }));
      const { error } = await supabase.from('guided_trip_qr_codes').insert(qrCodes);
      if (error) throw error;
    } else if (status === 'published') {
      throw new Error('No QR code records were written for this trip.');
    }

    {
      const { error } = await supabase.from('guided_trip_departure_dates').delete().eq('trip_id', tripId);
      if (error) throw error;
    }
    if (formData.departureDateRanges.length > 0) {
      const dateRanges = formData.departureDateRanges.map(range => ({
        trip_id: tripId,
        start_date: range.startDate,
        end_date: range.endDate,
        max_capacity: formData.maxParticipants,
        price_per_person: formData.basePrice,
        is_available: true,
      }));
      const { error } = await supabase.from('guided_trip_departure_dates').insert(dateRanges);
      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Error updating trip:', error);
    return false;
  }
};

export const getTripById = async (tripId: string) => {
  try {
    const { data: trip, error } = await supabase
      .from('guided_trips')
      .select(`
        *,
        locations:guided_trip_locations (*),
        inclusions:guided_trip_inclusions (*),
        exclusions:guided_trip_exclusions (*),
        gallery:guided_trip_gallery (*),
        qr_codes:guided_trip_qr_codes (*),
        departures:guided_trip_departure_dates (*)
      `)
      .eq('id', tripId)
      .single();

    if (error) throw error;
    return trip;
  } catch (error) {
    console.error('Error fetching trip:', error);
    return null;
  }
};

export const deleteTrip = async (tripId: string): Promise<boolean> => {
  try {
    let user = (await supabase.auth.getUser()).data.user;

    if (!user) {
      const testEmail = 'test-agent@guidedtrips.com';
      const testPassword = 'test-password-123';

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (signInError) throw signInError;
      user = signInData.user;

      if (!user) throw new Error('Failed to authenticate user');
    }

    const { data: deletedTrip, error } = await supabase
      .from('guided_trips')
      .delete()
      .eq('id', tripId)
      .eq('creator_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!deletedTrip) throw new Error('Trip not found or you do not have permission to delete it');
    return true;
  } catch (error) {
    console.error('Error deleting trip:', error);
    return false;
  }
};
