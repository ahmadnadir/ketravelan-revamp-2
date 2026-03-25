/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
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
    staleTime: 1000 * 10,       // Show cached list instantly; re-fetch in background after 10s
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
    ...options,
  });
}

export function useUnreadChatCount(userId: string | undefined): number {
  const { data: participants = [] } = useConversations(userId);
  return useMemo(() => {
    return participants.reduce((total: number, p: any) => total + (p.unreadCount || 0), 0);
  }, [participants]);
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
    staleTime: 1000 * 30,       // Show cached messages instantly; background-refresh after 30s
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,      // Cache-then-network handled in ChatPage directly
    ...options,
  });
}
