/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchTrips, fetchTripDetails, fetchJoinRequestStatus, type TripFilters } from '@/lib/trips';
import { fetchUserTrips } from '@/lib/myTrips';

export interface Trip {
  id: string;
  title: string;
  destination: string;
  cover_image?: string;
  start_date?: string;
  end_date?: string;
  price?: number;
  currency?: string;
  max_participants?: number;
  current_participants?: number;
  tags?: string[];
  type?: 'community' | 'guided';
  slug?: string;
  created_at?: string;
  creator?: {
    id: string;
    username?: string;
    avatar_url?: string;
  };
}

export function useTrips(
  filters?: TripFilters,
  options?: Omit<UseQueryOptions<Trip[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Trip[], Error>({
    queryKey: ['trips', filters],
    queryFn: async () => {
      const trips = await fetchTrips(filters);
      // Ensure creator is an object, not an array
      return trips.map((trip: any) => ({
        ...trip,
        creator: Array.isArray(trip.creator) ? trip.creator[0] : trip.creator,
      }));
    },
    staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
    gcTime: 1000 * 60 * 10, // Cache for 10 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
}

export function useTripDetails(
  tripIdOrSlug: string | undefined,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<any, Error>({
    queryKey: ['trip', tripIdOrSlug],
    queryFn: () => fetchTripDetails(tripIdOrSlug!),
    enabled: !!tripIdOrSlug,
    staleTime: 1000 * 60 * 3, // Data stays fresh for 3 minutes
    gcTime: 1000 * 60 * 10, // Cache for 10 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
}

export function useJoinRequestStatus(
  tripId: string | undefined,
  userId: string | undefined,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<any, Error>({
    queryKey: ['joinRequest', tripId, userId],
    queryFn: () => fetchJoinRequestStatus(tripId!, userId!),
    enabled: !!tripId && !!userId,
    staleTime: 1000 * 60 * 2, // Data stays fresh for 2 minutes
    gcTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch to get latest status
    ...options,
  });
}

// Hook for fetching user's own trips (created + member trips)
export function useUserTrips(
  userId: string | undefined,
  options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<any[], Error>({
    queryKey: ['userTrips', userId],
    queryFn: () => fetchUserTrips(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 3, // Data stays fresh for 3 minutes
    gcTime: 1000 * 60 * 10, // Cache for 10 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
}
