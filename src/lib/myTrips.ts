/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';

export async function fetchUserTrips(userId: string) {
  // Fetch trips created by user (select only essential fields)
  const { data: createdTrips, error: createdError } = await supabase
    .from('trips')
    .select('id, title, destination, cover_image, start_date, end_date, price, currency, max_participants, current_participants, tags, status, type, slug, created_at')
    .eq('creator_id', userId);

  if (createdError) {
    console.error('Error fetching created trips:', createdError);
  }

  // Fetch trips where user is a member
  const { data: memberTrips, error: memberError } = await supabase
    .from('trip_members')
    .select(`
      trip_id,
      trip:trips(
        id, title, destination, cover_image, start_date, end_date, 
        price, currency, max_participants, current_participants, 
        tags, status, type, slug, created_at
      )
    `)
    .eq('user_id', userId)
    .is('left_at', null);

  if (memberError) {
    console.error('Error fetching member trips:', memberError);
  }

  // Flatten memberTrips to just trips (ensure only objects, not arrays)
  const memberTripsList = Array.isArray(memberTrips)
    ? memberTrips
        .map((tm: any) => tm.trip)
        .filter((t: any) => t && typeof t === 'object' && !Array.isArray(t) && 'id' in t)
    : [];

  // Merge and deduplicate by trip.id
  const allTrips = [
    ...(Array.isArray(createdTrips) ? createdTrips.filter((ct: any) => ct && typeof ct === 'object' && 'id' in ct) : []),
    ...memberTripsList.filter(
      (mt: any) => !(Array.isArray(createdTrips)
        ? createdTrips.some((ct: any) => ct && typeof ct === 'object' && 'id' in ct && ct.id === mt.id)
        : false)
    ),
  ];

  return allTrips;
}
