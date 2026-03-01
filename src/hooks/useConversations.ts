/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchConversationsWithLastMessages, fetchConversationMessages, fetchConversationWithTripDetails } from '@/lib/conversations';

export function useConversations(
  userId: string | undefined,
  options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<any[], Error>({
    queryKey: ['conversations', userId],
    queryFn: fetchConversationsWithLastMessages,
    enabled: !!userId,
    staleTime: 0, // always considered stale
    gcTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // periodic refresh
    ...options,
  });
}

// Hook for fetching conversation with trip details (for TripHub)
export function useConversationWithTrip(
  conversationId: string | undefined,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<any, Error>({
    queryKey: ['conversation-with-trip', conversationId],
    queryFn: () => fetchConversationWithTripDetails(conversationId!),
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 3, // Fresh for 3 minutes
    gcTime: 1000 * 60 * 10, // Cache for 10 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
}

export function useMessages(
  conversationId: string | undefined,
  limit?: number,
  options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<any[], Error>({
    queryKey: ['messages', conversationId, limit],
    queryFn: () => fetchConversationMessages(conversationId!, limit),
    enabled: !!conversationId,
    // Always fetch fresh on mount / page entry
    staleTime: 0,
    gcTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    ...options,
  });
}
