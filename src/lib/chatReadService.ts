import type { QueryClient } from '@tanstack/react-query';
import { updateLastRead } from '@/lib/conversations';

type ConversationParticipantRow = {
  conversation?: { id?: string };
  last_read_at?: string | null;
  unreadCount?: number;
  [key: string]: unknown;
};

const inFlightMarkRead = new Map<string, Promise<void>>();

function getInFlightKey(userId: string, conversationId: string) {
  return `${userId}:${conversationId}`;
}

export function markConversationReadOptimistically(params: {
  queryClient: QueryClient;
  userId?: string;
  conversationId: string;
  onError?: (error: unknown) => void;
}) {
  const { queryClient, userId, conversationId, onError } = params;
  if (!userId || !conversationId) return;

  const inFlightKey = getInFlightKey(userId, conversationId);
  if (inFlightMarkRead.has(inFlightKey)) return;

  const queryKey = ['conversations', userId] as const;
  const nowIso = new Date().toISOString();

  let snapshot: Pick<ConversationParticipantRow, 'last_read_at' | 'unreadCount'> | null = null;

  queryClient.setQueryData(queryKey, (old: ConversationParticipantRow[] | undefined) => {
    if (!Array.isArray(old)) return old;

    return old.map((row) => {
      if (row?.conversation?.id !== conversationId) return row;
      snapshot = {
        last_read_at: row.last_read_at ?? null,
        unreadCount: typeof row.unreadCount === 'number' ? row.unreadCount : 0,
      };

      return {
        ...row,
        last_read_at: nowIso,
        unreadCount: 0,
      };
    });
  });

  const request = updateLastRead(conversationId)
    .catch((error) => {
      if (snapshot) {
        queryClient.setQueryData(queryKey, (old: ConversationParticipantRow[] | undefined) => {
          if (!Array.isArray(old)) return old;
          return old.map((row) => {
            if (row?.conversation?.id !== conversationId) return row;
            return {
              ...row,
              last_read_at: snapshot?.last_read_at ?? null,
              unreadCount: snapshot?.unreadCount ?? 0,
            };
          });
        });
      }
      onError?.(error);
      throw error;
    })
    .then(async () => {
      // After marking conversation as read, mark chat notifications as read too
      // This removes the badge count when user opens a chat
      try {
        const { markChatNotificationsAsReadForConversation } = await import("@/lib/notifications");
        await markChatNotificationsAsReadForConversation(conversationId);
      } catch (err) {
        console.warn("[notifications] Failed to mark chat notifications as read", err);
      }
      
      // Sync the badge count with backend - now includes proper notification read status
      try {
        const { syncBadgeWithUnreadCount } = await import("@/lib/notifications");
        await syncBadgeWithUnreadCount();
      } catch (err) {
        console.warn("[badge] Failed to sync badge after marking conversation read", err);
      }
    })
    .finally(() => {
      inFlightMarkRead.delete(inFlightKey);
    });

  inFlightMarkRead.set(inFlightKey, request);
}
