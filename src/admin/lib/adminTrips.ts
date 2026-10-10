import { supabase } from '@/lib/supabase';

export type TripStatus = 'all' | 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';
export type TripVisibility = 'all' | 'public' | 'private';
export type TripType = 'all' | 'community' | 'guided';
export type TripFeatured = 'all' | 'featured' | 'not_featured';
export type TripSort = 'newest' | 'oldest' | 'updated' | 'views' | 'rating' | 'participants' | 'start_date';

export interface AdminTrip {
  id: string;
  title: string | null;
  slug: string | null;
  destination: string | null;
  status: Exclude<TripStatus, 'all'>;
  visibility: string | null;
  trip_type: string | null;
  creator_id: string;
  creator_name: string | null;
  creator_username: string | null;
  creator_avatar: string | null;
  cover_image: string | null;
  start_date: string | null;
  end_date: string | null;
  price: number | null;
  currency: string | null;
  max_participants: number | null;
  current_participants: number | null;
  rating_average: number | null;
  rating_count: number | null;
  view_count: number | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminTripMember {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
  is_admin: boolean;
  joined_at: string | null;
  left_at: string | null;
  status: 'active' | 'left';
}

export interface AdminTripDetails extends AdminTrip {
  creator_is_agent: boolean;
  images: string[] | null;
  description: string | null;
  meeting_point: string | null;
  itinerary: unknown;
  stops: unknown;
  requirements: string[] | null;
  tags: string[] | null;
  travel_styles: string[] | null;
  budget_mode: string | null;
  budget_breakdown: unknown;
  trip_settings: unknown;
  currency_settings: unknown;
  members: AdminTripMember[];
  reviews: Array<{ id: string; user_id: string; full_name: string | null; username: string | null; rating: number; title: string | null; comment: string; verified_booking: boolean; created_at: string }>;
  analytics: Record<string, number>;
  bookings: Array<{ status: string; count: number }>;
  payments: Array<{ status: string; count: number; amount: number | null }>;
  reports: Array<{ id: string; reason: string; status: string; created_at: string; resolution: string | null }>;
}

export interface AdminTripQuery {
  search: string;
  status: TripStatus;
  visibility: TripVisibility;
  tripType: TripType;
  creatorUsername: string;
  createdFrom: string;
  createdTo: string;
  startFrom: string;
  startTo: string;
  featured: TripFeatured;
  sort: TripSort;
  limit: number;
  offset: number;
}

function dateParam(value: string) {
  return value || null;
}

function filterParams(query: AdminTripQuery) {
  return {
    p_search: query.search.trim() || null,
    p_status: query.status,
    p_visibility: query.visibility,
    p_trip_type: query.tripType,
    p_creator_id: null,
    p_created_from: dateParam(query.createdFrom),
    p_created_to: dateParam(query.createdTo),
    p_start_from: dateParam(query.startFrom),
    p_start_to: dateParam(query.startTo),
    p_featured: query.featured,
  };
}

async function getCreatorIdByUsername(username: string) {
  const normalized = username.trim().replace(/^@+/, '');
  if (!normalized) return null;
  const { data, error } = await supabase.rpc('admin_find_trip_creator', { p_username: normalized });
  if (error) throw error;
  return typeof data === 'string' ? data : null;
}

export async function listAdminTrips(query: AdminTripQuery): Promise<AdminTrip[]> {
  const creatorId = await getCreatorIdByUsername(query.creatorUsername);
  if (query.creatorUsername.trim() && !creatorId) return [];
  const { data, error } = await supabase.rpc('admin_list_trips', {
    ...filterParams(query),
    p_creator_id: creatorId,
    p_sort: query.sort,
    p_limit: query.limit,
    p_offset: query.offset,
  });
  if (error) throw error;
  return (data ?? []) as AdminTrip[];
}

export async function countAdminTrips(query: AdminTripQuery): Promise<number> {
  const creatorId = await getCreatorIdByUsername(query.creatorUsername);
  if (query.creatorUsername.trim() && !creatorId) return 0;
  const { data, error } = await supabase.rpc('admin_count_trips', { ...filterParams(query), p_creator_id: creatorId });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function getAdminTrip(tripId: string): Promise<AdminTripDetails | null> {
  const { data, error } = await supabase.rpc('admin_get_trip', { p_trip_id: tripId });
  if (error) throw error;
  if (!data) return null;

  const details = data as AdminTripDetails & { type?: string | null };
  return {
    ...details,
    trip_type: details.trip_type ?? details.type ?? null,
  };
}

export async function setAdminTripFeatured(tripId: string, featured: boolean) {
  const { error } = await supabase.rpc('admin_set_trip_featured', { p_trip_id: tripId, p_featured: featured });
  if (error) throw error;
}

export async function setAdminTripVisibility(tripId: string, visibility: Exclude<TripVisibility, 'all'>, reason?: string) {
  const { error } = await supabase.rpc('admin_set_trip_visibility', { p_trip_id: tripId, p_visibility: visibility, p_reason: reason?.trim() || null });
  if (error) throw error;
}

export async function setAdminTripStatus(tripId: string, status: Exclude<TripStatus, 'all'>, reason?: string) {
  const { error } = await supabase.rpc('admin_set_trip_status', { p_trip_id: tripId, p_status: status, p_reason: reason?.trim() || null });
  if (error) throw error;
}
