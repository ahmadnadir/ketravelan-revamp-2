import { supabase } from '../lib/supabase';
import { GuidedTripWithRelations } from '../types/guided-trip';

export async function getTripById(tripId: string): Promise<GuidedTripWithRelations> {
  const { data, error } = await supabase
    .from('guided_trips')
    .select(`
      *,
      locations:guided_trip_locations(
        id,
        place_name,
        formatted_address,
        latitude,
        longitude,
        country,
        sort_order
      ),
      departures:guided_trip_departure_dates(
        id,
        start_date,
        end_date,
        max_capacity,
        booked_pax,
        price_per_person,
        is_available
      ),
      inclusions:guided_trip_inclusions(
        id,
        description,
        sort_order
      ),
      exclusions:guided_trip_exclusions(
        id,
        description,
        sort_order
      ),
      gallery:guided_trip_gallery(
        id,
        image_url,
        sort_order
      ),
      qr_codes:guided_trip_qr_codes(
        id,
        qr_code_url,
        payment_method,
        sort_order
      )
    `)
    .eq('id', tripId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch trip: ${error.message}`);
  }

  if (!data) {
    throw new Error('Trip not found');
  }

  if (data.locations) {
    data.locations = data.locations.sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    );
  }

  if (data.departures) {
    data.departures = data.departures.sort(
      (a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
  }

  if (data.inclusions) {
    data.inclusions = data.inclusions.sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    );
  }

  if (data.exclusions) {
    data.exclusions = data.exclusions.sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    );
  }

  if (data.gallery) {
    data.gallery = data.gallery.sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    );
  }

  if (data.qr_codes) {
    data.qr_codes = data.qr_codes.sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    );
  }

  return data as GuidedTripWithRelations;
}

export async function getPublishedTrips(): Promise<GuidedTripWithRelations[]> {
  const { data, error } = await supabase
    .from('guided_trips')
    .select(`
      *,
      locations:guided_trip_locations(
        id,
        place_name,
        formatted_address,
        latitude,
        longitude,
        country,
        sort_order
      ),
      departures:guided_trip_departure_dates(
        id,
        start_date,
        end_date,
        max_capacity,
        booked_pax,
        price_per_person,
        is_available
      ),
      gallery:guided_trip_gallery(
        id,
        image_url,
        sort_order
      )
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch trips: ${error.message}`);
  }

  return (data || []).map((trip: any) => {
    if (trip.locations) {
      trip.locations = trip.locations.sort(
        (a: any, b: any) => a.sort_order - b.sort_order
      );
    }
    if (trip.departures) {
      trip.departures = trip.departures.sort(
        (a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
    }
    if (trip.gallery) {
      trip.gallery = trip.gallery.sort(
        (a: any, b: any) => a.sort_order - b.sort_order
      );
    }
    return trip as GuidedTripWithRelations;
  });
}
