import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { ChevronLeft, Check, Clock, ArrowDown, ChevronDown, Pencil, Trash2, Undo2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ChatComposer, type TripMember } from "@/components/chat/ChatComposer";
import type { ChatAttachment } from "@/lib/conversations";
import { MessageAttachments } from "@/components/chat/MessageAttachments";
import { fetchConversationMessages, subscribeToMessages, sendMessage, editOwnMessage, unsendOwnMessage, deleteOwnMessage } from "@/lib/conversations";
import { parseMessageForDisplay } from "@/lib/chatMentions";
import { supabase } from "@/lib/supabase";
import { markConversationReadOptimistically } from "@/lib/chatReadService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { REPORT_REASON_OPTIONS, submitReport, blockUserViaApi, type ReportReasonValue } from "@/lib/moderation";

export interface ChatPageMessage {
  id: string;
  content: string;
  sender_id: string;
  sender?: { full_name?: string; username?: string; avatar_url?: string };
  created_at: string;
  client_id?: string;
  status?: 'sending' | 'sent' | 'failed';
  attachments?: ChatAttachment[];
  is_edited?: boolean;
  edited_at?: string | null;
  type?: 'user' | 'system';
  systemData?: { action: string; details?: string };
}

interface ChatPageProps {
  conversationId: string;
  ensureConversationId?: () => Promise<string>;
  headerTitle?: string;
  headerSubtitle?: string;
  headerImageUrl?: string;
  headerImageFallback?: string;
  headerActions?: ReactNode;
  onHeaderClick?: () => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
  isLoadingHeader?: boolean;
  currentUserId?: string;
  showSenderInfo?: boolean;
  tripMembers?: TripMember[];
  tripId?: string;
  canSend?: boolean;
  blockedMessage?: string;
  messageReportType?: 'TRIP_CHAT' | 'DIRECT_CHAT';
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

export function ChatPage({
  conversationId,
  ensureConversationId,
  headerTitle = "Chat",
  headerSubtitle,
  headerImageUrl,
  headerImageFallback,
  headerActions,
  onHeaderClick,
  showBackButton = true,
  onBackClick,
  isLoadingHeader = false,
  currentUserId,
  showSenderInfo = true,
  tripMembers = [],
  tripId,
  canSend = true,
  blockedMessage,
  messageReportType,
  scrollContainerRef,
}: ChatPageProps) {
  const MESSAGE_ACTION_WINDOW_MS = 60 * 1000;
  const LONG_PRESS_MS = 450;

  const canUseMessageActions = (message: ChatPageMessage): boolean => {
    if (message.sender_id !== currentUserId) return false;
    if (message.type === 'system') return false;
    if (message.status === 'sending') return false;
    const createdAt = new Date(message.created_at).getTime();
    if (!Number.isFinite(createdAt)) return false;
    return Date.now() - createdAt <= MESSAGE_ACTION_WINDOW_MS;
  };

  const isUnsentMessage = (message: ChatPageMessage): boolean => {
    return message.content === 'This message was unsent';
  };

  const formatSystemMessageContent = (content: string): string => {
    return content.replace(/\b(RM|[A-Z]{3})\s+(\d[\d,]*(?:\.\d+)?)/g, (_, code: string, rawAmount: string) => {
      const parsed = Number(rawAmount.replace(/,/g, ""));
      if (!Number.isFinite(parsed)) return `${code} ${rawAmount}`;

      const hasMeaningfulDecimals = rawAmount.includes(".") && !/\.0+$/.test(rawAmount);
      const formatted = parsed.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      return `${code} ${formatted}`;
    });
  };

  const [confirmedMessages, setConfirmedMessages] = useState<ChatPageMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ChatPageMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [actionMenu, setActionMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: 'unsend' | 'delete'; messageId: string } | null>(null);
  const [reportTarget, setReportTarget] = useState<{ messageId: string; reportedUserId: string } | null>(null);
  const [reportReason, setReportReason] = useState<ReportReasonValue>('spam');
  const [reportDescription, setReportDescription] = useState('');
  const [confirmReport, setConfirmReport] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(conversationId);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const pollInFlightRef = useRef(false);
  const latestSnapshotRef = useRef<string>('');
  const lastRealtimeAtRef = useRef(0);
  const longPressTimerRef = useRef<number | null>(null);
  const mentionUserIdByUsername = useMemo(() => {
    const map = new Map<string, string>();
    tripMembers.forEach((member) => {
      if (member.username) {
        map.set(member.username.toLowerCase(), member.id);
      }
    });
    return map;
  }, [tripMembers]);

  useEffect(() => {
    setActiveConversationId(conversationId);
  }, [conversationId]);

  // Combine messages for display (confirmed + pending)
  const allMessages = useMemo(() => [...confirmedMessages, ...pendingMessages], [confirmedMessages, pendingMessages]);
  const actionMessage = useMemo(
    () => (actionMenu ? allMessages.find((msg) => msg.id === actionMenu.messageId) || null : null),
    [actionMenu, allMessages],
  );

  // Memoize avatar URLs per user to prevent re-generation and blinking
  const avatarCache = useRef<Map<string, string>>(new Map());
  
  const getDefaultAvatar = (userId: string) => {
    if (!avatarCache.current.has(userId)) {
      avatarCache.current.set(userId, `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}`);
    }
    return avatarCache.current.get(userId)!;
  };

  const normalizeMessages = (msgs: unknown[]): ChatPageMessage[] =>
    msgs.map((msg) => {
      const normalized = msg as Record<string, unknown>;
      return {
        ...normalized,
        sender: Array.isArray(normalized.sender) ? normalized.sender[0] : normalized.sender,
        status: 'sent' as const,
      } as ChatPageMessage;
    });

  const mergeById = (prev: ChatPageMessage[], incoming: ChatPageMessage[]) => {
    const map = new Map<string, ChatPageMessage>();
    prev.forEach((m) => map.set(m.id, m));
    incoming.forEach((m) => map.set(m.id, m));
    return Array.from(map.values()).sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  };

  const getSnapshot = (messages: ChatPageMessage[]) => {
    const last = messages[messages.length - 1];
    return `${messages.length}:${last?.id || 'none'}:${last?.created_at || 'none'}`;
  };

  const applyServerMessages = (incomingRaw: unknown[]) => {
    const normalizedMsgs = normalizeMessages(incomingRaw);
    const nextSnapshot = getSnapshot(normalizedMsgs);
    if (nextSnapshot === latestSnapshotRef.current) return false;

    latestSnapshotRef.current = nextSnapshot;
    setConfirmedMessages((prev) => mergeById(prev, normalizedMsgs));
    queryClient.setQueryData(['messages', activeConversationId], normalizedMsgs);
    return true;
  };

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;
    const onScroll = () => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollBtn(distFromBottom > 120);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [scrollContainerRef, isLoading]);

  useEffect(() => {
    const closeMenu = () => setActionMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, []);

  // Scroll to bottom helper
  const scrollToBottom = (instant = false) => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
    });
  };

  // Initialize: fetch messages and setup realtime subscription
  useEffect(() => {
    if (!activeConversationId) {
      setIsLoading(false);
      setConfirmedMessages([]);
      setPendingMessages([]);
      latestSnapshotRef.current = '';
      return;
    }

    let isMounted = true;

    const setupChat = async () => {
      try {
        // Cache-then-network: show cached messages instantly, skip skeleton on revisit
        const cached = queryClient.getQueryData<ChatPageMessage[]>(['messages', activeConversationId]);
        if (cached && cached.length > 0) {
          setConfirmedMessages(cached);
          latestSnapshotRef.current = getSnapshot(cached);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }

        // Start subscription immediately in parallel — don't await
        subscribeToMessages(activeConversationId, (newMsg: ChatPageMessage) => {
          if (!isMounted) return;
          lastRealtimeAtRef.current = Date.now();

          const normalizedIncoming: ChatPageMessage = {
            ...newMsg,
            sender: Array.isArray(newMsg.sender) ? (newMsg.sender as unknown[])[0] as ChatPageMessage["sender"] : newMsg.sender,
            status: 'sent',
          };

          setPendingMessages((prev) =>
            prev.filter(m => {
              if (normalizedIncoming.client_id && m.client_id) {
                return m.client_id !== normalizedIncoming.client_id;
              }
              return !(m.content === normalizedIncoming.content && m.sender_id === normalizedIncoming.sender_id && m.status === 'sending');
            })
          );

          setConfirmedMessages((prev) => {
            const merged = mergeById(prev, [normalizedIncoming]);
            latestSnapshotRef.current = getSnapshot(merged);
            queryClient.setQueryData(['messages', activeConversationId], merged);
            return merged;
          });

          setTimeout(() => scrollToBottom(), 50);
        }).then(unsub => {
          if (isMounted) unsubscribeRef.current = unsub;
          else unsub();
        });

        // Fetch fresh messages
        const msgs = await fetchConversationMessages(activeConversationId);
        if (!isMounted) return;
        applyServerMessages(msgs as unknown[]);
      } catch (err) {
        console.error('Error setting up chat:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    setupChat();

    return () => {
      isMounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [activeConversationId]);

  // Mark conversation as read optimistically so unread badges disappear instantly.
  useEffect(() => {
    if (!activeConversationId || !currentUserId) return;

    markConversationReadOptimistically({
      queryClient,
      userId: currentUserId,
      conversationId: activeConversationId,
    });
  }, [activeConversationId, currentUserId, queryClient]);

  useEffect(() => {
    if (!activeConversationId) return;

    const interval = setInterval(async () => {
      if (pollInFlightRef.current) return;
      // Skip polling when realtime has been active recently.
      if (Date.now() - lastRealtimeAtRef.current < 20000) return;

      try {
        pollInFlightRef.current = true;
        const msgs = await fetchConversationMessages(activeConversationId);
        applyServerMessages(msgs as unknown[]);
      } catch (err) {
        console.error('Polling messages failed:', err);
      } finally {
        pollInFlightRef.current = false;
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [activeConversationId]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (!isLoading && confirmedMessages.length > 0) {
      setTimeout(() => scrollToBottom(true), 0);
      setTimeout(() => scrollToBottom(true), 100);
      setTimeout(() => scrollToBottom(true), 300);
    }
  }, [confirmedMessages.length, isLoading]);

  // Auto-scroll when pending messages change
  useEffect(() => {
    if (pendingMessages.length > 0) {
      setTimeout(() => scrollToBottom(), 50);
    }
  }, [pendingMessages.length]);

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const openActionMenu = (messageId: string, x: number, y: number) => {
    setActionMenu({
      messageId,
      x: Math.max(12, Math.min(window.innerWidth - 180, x)),
      y: Math.max(12, Math.min(window.innerHeight - 180, y)),
    });
  };

  const handleMessageContextMenu = (event: React.MouseEvent, message: ChatPageMessage) => {
    const canOpen = canUseMessageActions(message) || (!canUseMessageActions(message) && message.sender_id !== currentUserId && Boolean(messageReportType));
    if (!canOpen) return;
    event.preventDefault();
    event.stopPropagation();
    openActionMenu(message.id, event.clientX, event.clientY);
  };

  const openActionMenuNearElement = (messageId: string, anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    openActionMenu(messageId, rect.right - 8, rect.bottom + 8);
  };

  const sortConversationsByLatest = (items: any[]) => {
    return [...items].sort((a: any, b: any) => {
      const aTime = a.lastMessage?.created_at
        ? new Date(a.lastMessage.created_at).getTime()
        : new Date(a.created_at ?? a.conversation?.created_at ?? 0).getTime();
      const bTime = b.lastMessage?.created_at
        ? new Date(b.lastMessage.created_at).getTime()
        : new Date(b.created_at ?? b.conversation?.created_at ?? 0).getTime();
      return bTime - aTime;
    });
  };

  const updateConversationListPreview = (message: ChatPageMessage, targetConversationId?: string) => {
    const conversationIdToUpdate = targetConversationId || activeConversationId;
    if (!currentUserId || !conversationIdToUpdate) return;

    queryClient.setQueryData(['conversations', currentUserId], (oldData: any[] | undefined) => {
      if (!Array.isArray(oldData) || oldData.length === 0) return oldData;

      let foundConversation = false;
      const nextData = oldData.map((participant: any) => {
        if (participant?.conversation?.id !== conversationIdToUpdate) return participant;

        foundConversation = true;
        return {
          ...participant,
          lastMessage: {
            id: message.id,
            sender_id: message.sender_id,
            content: message.content,
            attachments: message.attachments || [],
            created_at: message.created_at,
            type: message.type || 'user',
            sender: message.sender || participant.lastMessage?.sender || { id: message.sender_id },
          },
          unreadCount: 0,
        };
      });

      if (!foundConversation) return oldData;
      return sortConversationsByLatest(nextData);
    });
  };

  const refreshConversationListInBackground = () => {
    if (!currentUserId) return;

    void queryClient.refetchQueries({
      queryKey: ['conversations', currentUserId],
      type: 'all',
    });
  };

  const refreshMessagesInBackground = () => {
    if (!activeConversationId) return;

    void queryClient.refetchQueries({
      queryKey: ['messages', activeConversationId],
      type: 'all',
    });
  };

  const updateMessageThreadCache = (updater: (messages: ChatPageMessage[]) => ChatPageMessage[]) => {
    if (!activeConversationId) return;

    queryClient.setQueryData(['messages', activeConversationId], (oldData: ChatPageMessage[] | undefined) => {
      if (!Array.isArray(oldData)) return oldData;
      return updater(oldData);
    });
  };

  const removeConversationListPreviewForMessage = (messageId: string) => {
    if (!currentUserId || !activeConversationId) return;

    queryClient.setQueryData(['conversations', currentUserId], (oldData: any[] | undefined) => {
      if (!Array.isArray(oldData) || oldData.length === 0) return oldData;

      return oldData.map((participant: any) => {
        if (participant?.conversation?.id !== activeConversationId) return participant;
        if (participant?.lastMessage?.id !== messageId) return participant;

        return {
          ...participant,
          lastMessage: null,
        };
      });
    });
  };

  const handleMessageTouchStart = (event: React.TouchEvent, message: ChatPageMessage) => {
    const canOpen = canUseMessageActions(message) || (!canUseMessageActions(message) && message.sender_id !== currentUserId && Boolean(messageReportType));
    if (!canOpen) return;
    const touch = event.touches[0];
    if (!touch) return;

    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      openActionMenu(message.id, touch.clientX, touch.clientY);
    }, LONG_PRESS_MS);
  };

  const submitReportAction = async () => {
    if (!reportTarget || !messageReportType) return;
    setIsSubmittingAction(true);
    try {
      await submitReport({
        reportType: messageReportType,
        targetId: reportTarget.messageId,
        reportedUserId: reportTarget.reportedUserId,
        reason: reportReason,
        description: reportDescription,
      });
      toast.success('Thank you. This report has been submitted.');
      setConfirmReport(false);
      setReportTarget(null);
      setReportReason('spam');
      setReportDescription('');
    } catch (error) {
      console.error('Failed to report message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit report');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const blockUserFromMessage = async (targetUserId: string) => {
    setIsSubmittingAction(true);
    try {
      await blockUserViaApi(targetUserId);
      toast.success('User blocked');
      setActionMenu(null);
    } catch (error) {
      console.error('Failed to block user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to block user');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const beginEditMessage = (message: ChatPageMessage | null) => {
    if (!message) return;
    if (!canUseMessageActions(message)) {
      toast.error('You can only edit within 1 minute');
      return;
    }
    if (Array.isArray(message.attachments) && message.attachments.length > 0) {
      toast.error('Editing attachment messages is not supported');
      return;
    }
    if (isUnsentMessage(message)) {
      toast.error('You cannot edit an unsent message');
      return;
    }

    setEditingMessageId(message.id);
    setEditingValue(message.content);
    setActionMenu(null);
  };

  const submitEditMessage = async () => {
    if (!editingMessageId) return;
    const nextContent = editingValue.trim();
    if (!nextContent) {
      toast.error('Message cannot be empty');
      return;
    }

    const existingMessage = allMessages.find((message) => message.id === editingMessageId);

    setIsSubmittingAction(true);
    try {
      const updated = await editOwnMessage(editingMessageId, nextContent);
      const nextEditedAt = updated?.edited_at || new Date().toISOString();
      const nextMessagesUpdater = (messages: ChatPageMessage[]) =>
        messages.map((msg) =>
          msg.id === editingMessageId
            ? {
                ...msg,
                content: updated?.content || nextContent,
                is_edited: true,
                edited_at: nextEditedAt,
              }
            : msg,
        );

      setConfirmedMessages(nextMessagesUpdater);
      updateMessageThreadCache(nextMessagesUpdater);
      updateConversationListPreview({
        id: editingMessageId,
        content: updated?.content || nextContent,
        sender_id: existingMessage?.sender_id || currentUserId || '',
        sender: existingMessage?.sender,
        created_at: existingMessage?.created_at || new Date().toISOString(),
        attachments: existingMessage?.attachments || [],
        is_edited: true,
        edited_at: nextEditedAt,
      });
      refreshMessagesInBackground();
      refreshConversationListInBackground();
      setEditingMessageId(null);
      setEditingValue('');
      toast.success('Message edited');
    } catch (error) {
      console.error('Failed to edit message:', error);
      toast.error(error instanceof Error ? error.message : 'Unable to edit message');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const runConfirmAction = async () => {
    if (!confirmAction) return;

    setIsSubmittingAction(true);
    try {
      if (confirmAction.type === 'unsend') {
        const existingMessage = allMessages.find((message) => message.id === confirmAction.messageId);
        const updated = await unsendOwnMessage(confirmAction.messageId);
        const nextMessagesUpdater = (messages: ChatPageMessage[]) =>
          messages.map((msg) =>
            msg.id === confirmAction.messageId
              ? {
                  ...msg,
                  content: updated?.content || 'This message was unsent',
                  attachments: [],
                  is_edited: false,
                  edited_at: null,
                }
              : msg,
          );

        setConfirmedMessages(nextMessagesUpdater);
        updateMessageThreadCache(nextMessagesUpdater);
        updateConversationListPreview({
          id: confirmAction.messageId,
          content: updated?.content || 'This message was unsent',
          sender_id: existingMessage?.sender_id || currentUserId || '',
          sender: existingMessage?.sender,
          created_at: existingMessage?.created_at || new Date().toISOString(),
          attachments: [],
          is_edited: false,
          edited_at: null,
        });
        refreshMessagesInBackground();
        refreshConversationListInBackground();
        toast.success('Message unsent');
      } else {
        await deleteOwnMessage(confirmAction.messageId);
        setConfirmedMessages((prev) => prev.filter((msg) => msg.id !== confirmAction.messageId));
        setPendingMessages((prev) => prev.filter((msg) => msg.id !== confirmAction.messageId));
        updateMessageThreadCache((messages) => messages.filter((msg) => msg.id !== confirmAction.messageId));
        removeConversationListPreviewForMessage(confirmAction.messageId);
        refreshMessagesInBackground();
        refreshConversationListInBackground();
        toast.success('Message deleted');
      }
    } catch (error) {
      console.error('Message action failed:', error);
      toast.error(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setIsSubmittingAction(false);
      setConfirmAction(null);
    }
  };

  // Handle sending messages
  const handleSend = async (message: string, atts?: ChatAttachment[], mentionedUserIds?: string[]) => {
    if (!currentUserId) return;

    let targetConversationId = activeConversationId;
    if (!targetConversationId) {
      if (!ensureConversationId) {
        toast.error('Unable to start chat. Please try again.');
        return;
      }
      try {
        targetConversationId = await ensureConversationId();
        if (!targetConversationId) {
          toast.error('Unable to start chat. Please try again.');
          return;
        }
        setActiveConversationId(targetConversationId);
      } catch (err) {
        console.error('Failed to create conversation:', err);
        toast.error(err instanceof Error ? err.message : 'Unable to start chat');
        return;
      }
    }

    // Generate a client_id for optimistic UI
    const clientId = window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now();
    const tempId = `temp-${clientId}`;

    // Create optimistic message with clock status
    const optimisticMessage: ChatPageMessage = {
      id: tempId,
      content: message,
      sender_id: currentUserId,
      sender: { full_name: "You" },
      created_at: new Date().toISOString(),
      client_id: clientId,
      status: "sending",
      attachments: atts || []
    };

    // Add to pending immediately
    setPendingMessages((prev) => [...prev, optimisticMessage]);
    updateConversationListPreview(optimisticMessage, targetConversationId);

    // Send in background - subscription will move it from pending to confirmed
    try {
      const saved = await sendMessage(targetConversationId, message, clientId, atts || []);
      const normalizedSaved: ChatPageMessage = {
        ...(saved as ChatPageMessage),
        sender: Array.isArray(saved?.sender) ? (saved.sender as unknown[])[0] as ChatPageMessage["sender"] : saved?.sender,
        status: 'sent',
      };

      setPendingMessages((prev) => prev.filter(m => m.client_id !== clientId && m.id !== tempId));
      setConfirmedMessages((prev) => mergeById(prev, [normalizedSaved]));
      queryClient.setQueryData(['messages', targetConversationId], (oldData: ChatPageMessage[] | undefined) => {
        if (!Array.isArray(oldData)) return [normalizedSaved];
        return mergeById(oldData, [normalizedSaved]);
      });
      updateConversationListPreview(normalizedSaved, targetConversationId);
      refreshConversationListInBackground();

      // Send mention notifications if there are mentioned users and trip context
      if (mentionedUserIds && mentionedUserIds.length > 0 && tripId && normalizedSaved.id) {
        try {
          const currentUser = await supabase.auth.getUser();
          const senderName = currentUser.data?.user?.user_metadata?.full_name || "Someone";
          
          await supabase.functions.invoke("send-chat-mention", {
            body: {
              tripId,
              messageId: normalizedSaved.id,
              senderId: currentUserId,
              senderName,
              messageContent: message,
              mentionedUserIds,
            },
          });
        } catch (err) {
          console.warn("Failed to send mention notification:", err);
          // Don't fail the message send if notification fails
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      // Mark as failed
      setPendingMessages((prev) =>
        prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m)
      );
      refreshConversationListInBackground();
    }
  };

  // Header component
  const headerContent = (
    <header className="h-full glass border-b border-border/50 safe-x">
      <div className="h-[var(--safe-top)]" />
      <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-3 h-[var(--header-height)]">
          {showBackButton && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onBackClick}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <button
            onClick={onHeaderClick}
            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left disabled:opacity-50"
            disabled={isLoadingHeader}
          >
            {isLoadingHeader ? (
              <>
                <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                </div>
              </>
            ) : (
              <>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={String(headerImageUrl || '')} alt={headerTitle} />
                  <AvatarFallback>{headerImageFallback || headerTitle.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 flex flex-col gap-0">
                  <h1 className="font-semibold text-foreground truncate text-base sm:text-lg">
                    {headerTitle}
                  </h1>
                  {headerSubtitle && (
                    <p className="text-xs text-muted-foreground truncate">
                      {headerSubtitle}
                    </p>
                  )}
                </div>
              </>
            )}
          </button>
          {headerActions}
        </div>
      </div>
    </header>
  );

  // Footer component
  const footerContent = (
    <div className="bg-background/95 backdrop-blur-sm border-t border-border/50 w-full">
      <ChatComposer
        onSend={handleSend}
        tripMembers={tripMembers}
        disabled={!canSend}
        placeholder={canSend ? "Type a message..." : (blockedMessage || "Messaging is disabled for this user")}
      />
    </div>
  );

  // Render messages
  const skeletonMessages = [
    { isOwn: false, bubbleW: "w-52", bubbleH: "h-10", nameW: "w-20" },
    { isOwn: false, bubbleW: "w-64", bubbleH: "h-16", nameW: "w-24" },
    { isOwn: true,  bubbleW: "w-44", bubbleH: "h-10", nameW: null },
    { isOwn: false, bubbleW: "w-56", bubbleH: "h-10", nameW: "w-16" },
    { isOwn: true,  bubbleW: "w-60", bubbleH: "h-16", nameW: null },
    { isOwn: true,  bubbleW: "w-36", bubbleH: "h-10", nameW: null },
    { isOwn: false, bubbleW: "w-48", bubbleH: "h-16", nameW: "w-20" },
    { isOwn: true,  bubbleW: "w-52", bubbleH: "h-10", nameW: null },
  ];

  const messagesContent = isLoading ? (
    <div className="space-y-3 animate-pulse">
      {skeletonMessages.map((s, i) => (
        <div key={i} className={cn("flex gap-2 py-1", s.isOwn ? "justify-end" : "justify-start")}>
          {/* Avatar placeholder for other users */}
          {!s.isOwn && (
            <div className="h-6 w-6 rounded-full bg-muted shrink-0 mt-5" />
          )}

          <div className={cn("flex flex-col gap-1", s.isOwn ? "items-end" : "items-start")}>
            {/* Sender name placeholder */}
            {!s.isOwn && s.nameW && (
              <div className={cn("h-3 rounded bg-muted", s.nameW)} />
            )}
            {/* Bubble */}
            <div
              className={cn(
                "rounded-2xl bg-muted",
                s.bubbleW,
                s.bubbleH,
                s.isOwn ? "rounded-br-sm" : "rounded-bl-sm"
              )}
            />
            {/* Timestamp placeholder */}
            <div className="h-2.5 w-10 rounded bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  ) : allMessages.length === 0 ? (
    <div className="flex items-center justify-center py-12">
      <div className="text-muted-foreground text-center">
        <p>No messages yet</p>
        <p className="text-sm">Start the conversation!</p>
      </div>
    </div>
  ) : (
    <>
      {allMessages.map((msg) => {
        const isOwn = msg.sender_id === currentUserId;
        const isSystem = msg.type === 'system';
        const canOpenMenuForMessage = canUseMessageActions(msg) || (msg.sender_id !== currentUserId && Boolean(messageReportType));
        const timeLabel = msg.created_at
          ? new Date(String(msg.created_at)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "";
        
        // Get sender info for group chats
        const senderName = msg.sender?.full_name || msg.sender?.username || "Unknown";
        const senderAvatar = msg.sender?.avatar_url;

        // Render system messages
        if (isSystem) {
          return (
            <div key={String(msg.id)} className="flex justify-center py-3">
              <p className="text-xs sm:text-sm text-muted-foreground text-center px-4">
                {formatSystemMessageContent(msg.content)}
              </p>
            </div>
          );
        }

        return (
          <div
            key={String(msg.id)}
            className={cn("flex gap-2 py-1.0", isOwn ? "justify-end" : "justify-start")}
            onMouseEnter={() => setHoveredMessageId(String(msg.id))}
            onMouseLeave={() => setHoveredMessageId((current) => (current === String(msg.id) ? null : current))}
          >
            {/* Avatar for other users' messages (left side) */}
            {!isOwn && showSenderInfo && (
              <Avatar className="h-6 w-6 shrink-0 mt-5 bg-white border border-border">
                <AvatarImage 
                  src={senderAvatar || getDefaultAvatar(msg.sender_id)} 
                  alt={senderName} 
                />
                <AvatarFallback className="text-[8px] bg-white">
                  {senderName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className="flex items-start gap-1.5" style={{ maxWidth: isOwn ? "75%" : "75%" }}>
              <div className={cn("flex flex-col gap-0.5", isOwn ? "items-end" : "items-start")}>
                {!isOwn && showSenderInfo && (
                  <span className="text-xs font-medium text-foreground">{senderName}</span>
                )}

                <div
                  className={cn(
                    "relative px-4 py-2 rounded-2xl border shadow-sm",
                    isOwn
                      ? "bg-black text-white border-black rounded-br-sm"
                      : "bg-white text-foreground border-border rounded-bl-sm"
                  )}
                  style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                  onContextMenu={(event) => handleMessageContextMenu(event, msg)}
                  onTouchStart={(event) => handleMessageTouchStart(event, msg)}
                  onTouchMove={clearLongPress}
                  onTouchEnd={clearLongPress}
                  onTouchCancel={clearLongPress}
                >
                  {canOpenMenuForMessage && (
                    <button
                      type="button"
                      aria-label="Message actions"
                      className={cn(
                        "absolute right-1.5 top-1.5 hidden h-5 w-5 items-center justify-center rounded-full transition md:flex",
                        hoveredMessageId === String(msg.id) ? "opacity-100" : "opacity-0 pointer-events-none",
                        isOwn
                          ? "text-white/75 hover:bg-white/15 hover:text-white"
                          : "text-muted-foreground hover:bg-black/10 hover:text-foreground"
                      )}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        openActionMenuNearElement(String(msg.id), event.currentTarget);
                      }}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <div className={cn(
                    "pr-5 text-sm sm:text-base leading-snug whitespace-pre-wrap",
                    isUnsentMessage(msg) && "italic opacity-80"
                  )}>
                    {(() => {
                      const parts = parseMessageForDisplay(msg.content);
                      return parts.map((part, idx) =>
                        part.type === 'mention' ? (() => {
                          const mentionUserId = part.username
                            ? mentionUserIdByUsername.get(part.username.toLowerCase())
                            : undefined;
                          const mentionClassName = cn(
                            "font-semibold text-emerald-400",
                            mentionUserId ? "hover:underline" : ""
                          );
                          return mentionUserId ? (
                            <Link key={idx} to={`/user/${mentionUserId}`} className="cursor-pointer">
                              <span className={mentionClassName}>{part.value}</span>
                            </Link>
                          ) : (
                            <span key={idx} className={mentionClassName}>{part.value}</span>
                          );
                        })() : (
                          <span key={idx}>{part.value}</span>
                        )
                      );
                    })()}
                  </div>
                  {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                    <MessageAttachments attachments={msg.attachments} isOwn={isOwn} />
                  )}
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-[10px] sm:text-[11px] px-2 mt-0.5",
                  isOwn ? "justify-end text-muted-foreground/80" : "text-muted-foreground/80"
                )}>
                  {msg.is_edited && !isUnsentMessage(msg) && <span>Edited</span>}
                  <span>{timeLabel}</span>
                  {isOwn && (
                    <>
                      {msg.status === "sending" && <Clock className="h-3 w-3" />}
                      {(msg.status === "sent" || !msg.status) && <Check className="h-3 w-3" />}
                      {msg.status === "failed" && <span className="text-red-500">!</span>}
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })}

      {actionMenu && actionMessage && (
        <div
          className="fixed z-[70] min-w-[164px] rounded-xl border border-border bg-popover p-1.5 shadow-2xl"
          style={{ left: actionMenu.x, top: actionMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {canUseMessageActions(actionMessage) ? (
            <>
              {!isUnsentMessage(actionMessage) && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => beginEditMessage(actionMessage)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              )}
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setConfirmAction({ type: 'unsend', messageId: actionMessage.id });
                  setActionMenu(null);
                }}
              >
                <Undo2 className="h-4 w-4" />
                Unsend
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-accent"
                onClick={() => {
                  setConfirmAction({ type: 'delete', messageId: actionMessage.id });
                  setActionMenu(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </>
          ) : (
            actionMessage.sender_id !== currentUserId && messageReportType && (
              <>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    setReportTarget({
                      messageId: String(actionMessage.id),
                      reportedUserId: String(actionMessage.sender_id),
                    });
                    setActionMenu(null);
                  }}
                >
                  Report Message
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-accent"
                  onClick={() => void blockUserFromMessage(String(actionMessage.sender_id))}
                  disabled={isSubmittingAction}
                >
                  Block User
                </button>
              </>
            )
          )}
        </div>
      )}

      <Dialog
        open={Boolean(editingMessageId)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingMessageId(null);
            setEditingValue('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit message</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={editingValue}
              onChange={(event) => setEditingValue(event.target.value)}
              placeholder="Update your message"
              autoFocus
              maxLength={2000}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingMessageId(null);
                  setEditingValue('');
                }}
                disabled={isSubmittingAction}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void submitEditMessage()}
                disabled={isSubmittingAction || !editingValue.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reportTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setReportTarget(null);
            setReportReason('spam');
            setReportDescription('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={reportReason} onValueChange={(value) => setReportReason(value as ReportReasonValue)}>
              {REPORT_REASON_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem id={`reason-${option.value}`} value={option.value} />
                  <Label htmlFor={`reason-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
            <Textarea
              value={reportDescription}
              onChange={(event) => setReportDescription(event.target.value)}
              placeholder="Add details (optional)"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReportTarget(null);
                  setReportReason('spam');
                  setReportDescription('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => setConfirmReport(true)}
                disabled={isSubmittingAction}
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReport} onOpenChange={setConfirmReport}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to report this content?</AlertDialogTitle>
            <AlertDialogDescription>
              This report will be submitted to moderators for review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submitReportAction()} disabled={isSubmittingAction}>
              Submit Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'unsend' ? 'Unsend this message?' : 'Delete this message?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'unsend'
                ? 'This will replace it with an unsent notice for everyone in this chat.'
                : 'This will remove the message from this chat for everyone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void runConfirmAction()} disabled={isSubmittingAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return {
    headerContent,
    messagesContent,
    footerContent,
    messagesEndRef,
    scrollToBottom,
    scrollToBottomButton: showScrollBtn ? (
      <button
        type="button"
        onClick={() => scrollToBottom()}
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.2rem)] right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_22px_rgba(0,0,0,0.28)] ring-2 ring-white/70 hover:brightness-95 active:scale-95 transition"
        aria-label="Scroll to bottom"
      >
        <ArrowDown className="h-5 w-5" />
      </button>
    ) : null,
  };
}
