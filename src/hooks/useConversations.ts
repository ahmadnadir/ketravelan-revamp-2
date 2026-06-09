/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useEffect } from 'react';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchConversationsWithLastMessages, fetchConversationMessages, fetchConversationWithTripDetails } from '@/lib/conversations';

const conversationsCacheKey = (userId: string) => `ketravelan:conversations:${userId}`;

function readConversationsCache(userId: string | undefined): any[] | undefined {
  if (!userId || typeof window === 'undefined') return undefined;

  try {
    const raw = window.localStorage.getItem(conversationsCacheKey(userId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function writeConversationsCache(userId: string | undefined, data: any[] | undefined) {
  if (!userId || typeof window === 'undefined' || !Array.isArray(data)) return;

  try {
    window.localStorage.setItem(conversationsCacheKey(userId), JSON.stringify(data));
  } catch {
    // Ignore storage write failures (quota/private mode).
  }
}

export function useConversations(
  userId: string | undefined,
  options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>
) {
  const query = useQuery<any[], Error>({
    queryKey: ['conversations', userId],
    queryFn: fetchConversationsWithLastMessages,
    enabled: !!userId,
    initialData: () => readConversationsCache(userId),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 5,        // Fresh for 5s (was 20s) — faster updates on chat list
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchInterval: () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return 60000;
      return 20000;             // Keep fallback freshness while reducing redundant polling traffic.
    },
    refetchIntervalInBackground: false,
    ...options,
  });

  useEffect(() => {
    writeConversationsCache(userId, query.data);
  }, [userId, query.data]);

  return query;
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
