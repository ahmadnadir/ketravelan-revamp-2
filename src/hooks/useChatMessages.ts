import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchConversationMessages, subscribeToMessages, sendMessage, type ChatAttachment } from '@/lib/conversations';

export interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  sender?: { full_name?: string; username?: string; avatar_url?: string };
  created_at: string;
  status?: 'sending' | 'sent' | 'failed';
  attachments?: ChatAttachment[];
}

export interface UseChatMessagesOptions {
  conversationId: string;
  currentUserId: string | undefined;
}

export function useChatMessages({ conversationId, currentUserId }: UseChatMessagesOptions) {
  const [confirmedMessages, setConfirmedMessages] = useState<ChatMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize and setup subscriptions
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const setupChat = async () => {
      try {
        setIsLoading(true);

        // Fetch initial messages
        const msgs = await fetchConversationMessages(conversationId);
        // Normalize sender field - handle both array and object formats
        const normalizedMsgs = (msgs as unknown[]).map((msg) => {
          const normalized = msg as Record<string, unknown>;
          return {
            ...normalized,
            sender: Array.isArray(normalized.sender) ? normalized.sender[0] : normalized.sender,
            status: 'sent' as const,
          };
        });
        setConfirmedMessages(normalizedMsgs as ChatMessage[]);

        // Subscribe to realtime updates
        unsubscribeRef.current = await subscribeToMessages(conversationId, (newMsg: ChatMessage) => {
          // Remove matching pending message
          setPendingMessages((prev) =>
            prev.filter(m => !(m.content === newMsg.content && m.sender_id === newMsg.sender_id))
          );

          // Add confirmed message if not already present
          setConfirmedMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        });
      } catch (err) {
        console.error('Error setting up chat:', err);
      } finally {
        setIsLoading(false);
      }
    };

    setupChat();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [conversationId, currentUserId]);

  // Send message - optimistic UI
  const sendMessageOptimistic = useCallback(
    async (message: string, attachments?: ChatAttachment[]) => {
      if (!conversationId || !currentUserId) return;

      // Generate unique ID for this pending message
      const clientId = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now();
      const tempId = `temp-${clientId}`;

      // Add to pending immediately (shows clock icon)
      const optimisticMessage: ChatMessage = {
        id: tempId,
        content: message,
        sender_id: currentUserId,
        sender: { full_name: 'You' },
        created_at: new Date().toISOString(),
        status: 'sending',
        attachments: attachments || [],
      };
      setPendingMessages((prev) => [...prev, optimisticMessage]);

      // Send in background - subscription will move it to confirmed
      try {
        await sendMessage(conversationId, message, clientId, attachments || []);
      } catch (err) {
        console.error('Failed to send message:', err);
        // Mark as failed
        setPendingMessages((prev) =>
          prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m)
        );
      }
    },
    [conversationId, currentUserId]
  );

  // Combine both message arrays for display
  const allMessages = [...confirmedMessages, ...pendingMessages];

  return {
    messages: allMessages,
    confirmedMessages,
    pendingMessages,
    isLoading,
    sendMessage: sendMessageOptimistic,
  };
}
