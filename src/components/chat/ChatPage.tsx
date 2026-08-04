import { useState, useEffect, useRef, useMemo, useLayoutEffect, type ReactNode } from "react";
import { ChevronLeft, Check, Clock, ArrowDown, ChevronDown, Pencil, Trash2, Undo2, Reply, Pin, PinOff, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ChatComposer, type TripMember } from "@/components/chat/ChatComposer";
import type { ChatAttachment } from "@/lib/conversations";
import { MessageAttachments } from "@/components/chat/MessageAttachments";
import { fetchConversationById, fetchConversationMessages, fetchConversationMessagesAfter, fetchMessageById, setConversationPinnedMessage, subscribeToMessages, sendMessage, editOwnMessage, unsendOwnMessage, deleteOwnMessage } from "@/lib/conversations";
import { parseMessageForDisplay } from "@/lib/chatMentions";
import { supabase } from "@/lib/supabase";
import { markConversationReadOptimistically } from "@/lib/chatReadService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { REPORT_REASON_OPTIONS, submitReport, blockUserViaApi, type ReportReasonValue } from "@/lib/moderation";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import type { RealtimeChannel } from "@supabase/supabase-js";

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

type ConversationWithPinnedMessage = {
  pinned_message_id?: string | null;
  pinned_message?: ChatPageMessage | null;
} | null;

type ConversationListItem = {
  created_at?: string;
  unreadCount?: number;
  conversation?: {
    id?: string;
    created_at?: string;
  };
  lastMessage?: {
    id?: string;
    created_at?: string;
    sender?: { id?: string; full_name?: string; username?: string; avatar_url?: string };
  };
  [key: string]: unknown;
};

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
  const MAX_RENDERED_MESSAGES = 220;
  const LOAD_MORE_STEP = 120;
  const REFRESH_THROTTLE_MS = 30000;
  const LONG_PRESS_MS = 450;
  const MAX_SWIPE_REPLY_X = 88;
  const SWIPE_REPLY_X_THRESHOLD = 56;
  const SWIPE_REPLY_Y_TOLERANCE = 24;

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

  const getLocalDayKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const parseMessageDate = (value: string | null | undefined): Date | null => {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;

    let parsed = new Date(raw);
    if (Number.isFinite(parsed.getTime())) return parsed;

    // Fallback for SQL-style timestamps like "2026-05-21 18:20:00+00"
    if (raw.includes(" ")) {
      parsed = new Date(raw.replace(" ", "T"));
      if (Number.isFinite(parsed.getTime())) return parsed;
    }

    return null;
  };

  const getWeekStart = (date: Date): Date => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const localeName = Intl.DateTimeFormat().resolvedOptions().locale;
    const localeObj = typeof Intl.Locale === "function"
      ? (new Intl.Locale(localeName) as unknown as { weekInfo?: { firstDay?: number } })
      : null;
    const firstDay = localeObj?.weekInfo?.firstDay ?? 1;
    const currentDay = start.getDay();
    const normalizedFirstDay = firstDay % 7;
    const daysSinceWeekStart = (currentDay - normalizedFirstDay + 7) % 7;
    start.setDate(start.getDate() - daysSinceWeekStart);
    return start;
  };

  const formatDateSeparatorLabel = (isoDate: string): string => {
    const messageDate = parseMessageDate(isoDate);
    if (!messageDate) return "";

    const today = new Date();
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const messageDayKey = getLocalDayKey(messageDay);
    const todayKey = getLocalDayKey(todayDay);
    if (messageDayKey === todayKey) return "Today";

    const yesterday = new Date(todayDay);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDayKey === getLocalDayKey(yesterday)) return "Yesterday";

    const messageWeekStart = getWeekStart(messageDay).getTime();
    const currentWeekStart = getWeekStart(todayDay).getTime();
    if (messageWeekStart === currentWeekStart) {
      return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(messageDate);
    }

    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(messageDate);
  };

  const renderDateSeparator = (label: string, isFirst: boolean) => {
    if (!label) return null;
    return (
      <div
        data-date-label={label}
        className={cn("relative z-10 flex justify-center pointer-events-none", isFirst ? "mt-2 mb-4" : "my-3")}
      >
        <span className="rounded-full border border-[#d6d6d6] bg-white px-3 py-0.5 text-[11px] font-medium tracking-[0.01em] text-[#111b21] shadow-[0_1px_2px_rgba(11,20,26,0.12)]">
          {label}
        </span>
      </div>
    );
  };

  const [confirmedMessages, setConfirmedMessages] = useState<ChatPageMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ChatPageMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [scrollDateLabel, setScrollDateLabel] = useState("");
  const scrollDateTimeoutRef = useRef<number | null>(null);
  const [actionMenu, setActionMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: 'unsend' | 'delete'; messageId: string } | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatPageMessage | null>(null);
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [fetchedPinnedMessage, setFetchedPinnedMessage] = useState<ChatPageMessage | null>(null);
  const [mobileActionMessageId, setMobileActionMessageId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ messageId: string; reportedUserId: string } | null>(null);
  const [reportReason, setReportReason] = useState<ReportReasonValue>('spam');
  const [reportDescription, setReportDescription] = useState('');
  const [confirmReport, setConfirmReport] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [jumpHighlightMessageId, setJumpHighlightMessageId] = useState<string | null>(null);
  const [swipePreview, setSwipePreview] = useState<{ messageId: string; offset: number; dragging: boolean } | null>(null);
  const [visibleCount, setVisibleCount] = useState(MAX_RENDERED_MESSAGES);
  const [activeConversationId, setActiveConversationId] = useState(conversationId);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const conversationChannelRef = useRef<RealtimeChannel | null>(null);
  const pollInFlightRef = useRef(false);
  const latestSnapshotRef = useRef<string>('');
  const lastRealtimeAtRef = useRef(0);
  const lastSyncCreatedAtRef = useRef<string | null>(null);
  const lastListRefreshAtRef = useRef(0);
  const lastThreadRefreshAtRef = useRef(0);
  const longPressTimerRef = useRef<number | null>(null);
  const swipeReplyRef = useRef<{
    messageId: string;
    startX: number;
    startY: number;
    triggered: boolean;
    cancelled: boolean;
  } | null>(null);
  const messageElementRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const menuOpenedByTouchRef = useRef(false);
  const replyJumpHandledRef = useRef(false);
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
    setVisibleCount(MAX_RENDERED_MESSAGES);
    setActiveConversationId(conversationId);
  }, [conversationId]);

  // Combine messages for display (confirmed + pending)
  const allMessages = useMemo(() => [...confirmedMessages, ...pendingMessages], [confirmedMessages, pendingMessages]);
  const pinnedMessage = useMemo(() => {
    if (!pinnedMessageId) return null;
    return allMessages.find((message) => message.id === pinnedMessageId) || fetchedPinnedMessage || null;
  }, [allMessages, pinnedMessageId, fetchedPinnedMessage]);
  const renderedMessages = useMemo(
    () => (allMessages.length > visibleCount ? allMessages.slice(-visibleCount) : allMessages),
    [allMessages, visibleCount],
  );
  const hiddenMessagesCount = Math.max(0, allMessages.length - renderedMessages.length);
  const actionMessage = useMemo(
    () => (actionMenu ? allMessages.find((msg) => msg.id === actionMenu.messageId) || null : null),
    [actionMenu, allMessages],
  );
  const mobileActionMessage = useMemo(
    () => (mobileActionMessageId ? allMessages.find((msg) => msg.id === mobileActionMessageId) || null : null),
    [mobileActionMessageId, allMessages],
  );

  const isMobileLikePointer = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  };


  const triggerLongPressHaptic = () => {
    void Haptics.impact({ style: ImpactStyle.Medium })
      .catch(() => Haptics.selectionChanged())
      .catch(() => {
        if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
        navigator.vibrate(12);
      });
  };

  useEffect(() => {
    if (!pinnedMessageId) {
      setFetchedPinnedMessage(null);
      return;
    }

    const existingMessage = allMessages.find((message) => message.id === pinnedMessageId);
    if (existingMessage) {
      setFetchedPinnedMessage(existingMessage);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const message = await fetchMessageById(pinnedMessageId);
        if (!cancelled) {
          setFetchedPinnedMessage((message as ChatPageMessage | null) || null);
        }
      } catch (error) {
        console.error('Failed to fetch pinned message:', error);
        if (!cancelled) setFetchedPinnedMessage(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allMessages, pinnedMessageId]);

  const scrollToMessage = (messageId: string) => {
    const target = messageElementRefs.current.get(messageId);
    if (!target) return false;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  };

  const summarizeMessage = (message: ChatPageMessage) => {
    const cleaned = (message.content || '').trim().replace(/\s+/g, ' ');
    if (!cleaned && Array.isArray(message.attachments) && message.attachments.length > 0) {
      return 'Attachment';
    }
    return cleaned || 'Message';
  };

  const getReplyAttachment = (attachments?: ChatAttachment[]) => {
    if (!Array.isArray(attachments)) return null;
    const candidate = attachments.find((attachment) => attachment.type === 'reply');
    if (!candidate) return null;
    return {
      messageId: candidate.messageId || '',
      senderName: candidate.senderName || 'Unknown',
      preview: candidate.preview || '',
    };
  };

  const getRenderableAttachments = (attachments?: ChatAttachment[]) => {
    if (!Array.isArray(attachments)) return [];
    return attachments.filter((attachment) => attachment.type !== 'reply');
  };

  const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const copyMessageContent = async (message: ChatPageMessage) => {
    const text = (message.content || '').trim();
    if (!text) {
      toast.error('No text to copy');
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast.success('Message copied');
    } catch {
      toast.error('Unable to copy message');
    }
  };

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

  const normalizeMessage = (message: unknown): ChatPageMessage => normalizeMessages([message])[0];

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
    if (normalizedMsgs.length > 0) {
      const newest = normalizedMsgs[normalizedMsgs.length - 1];
      if (newest?.created_at) {
        lastSyncCreatedAtRef.current = newest.created_at;
      }
    }
    const nextSnapshot = getSnapshot(normalizedMsgs);
    if (nextSnapshot === latestSnapshotRef.current) return false;

    latestSnapshotRef.current = nextSnapshot;
    setConfirmedMessages((prev) => mergeById(prev, normalizedMsgs));
    queryClient.setQueryData(['messages', activeConversationId], normalizedMsgs);
    return true;
  };

  const showJumpHighlight = (messageId: string) => {
    setJumpHighlightMessageId(messageId);
    window.setTimeout(() => {
      setJumpHighlightMessageId((current) => (current === messageId ? null : current));
    }, 1600);
  };

  const handleReplyJump = (messageId: string, event?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (replyJumpHandledRef.current) return;
    replyJumpHandledRef.current = true;

    void jumpToMessage(messageId);

    window.setTimeout(() => {
      replyJumpHandledRef.current = false;
    }, 350);
  };

  const ensureMessageVisibleInWindow = (messageId: string) => {
    const index = allMessages.findIndex((message) => message.id === messageId);
    if (index === -1) return false;

    const requiredVisibleCount = allMessages.length - index;
    if (requiredVisibleCount > visibleCount) {
      setVisibleCount((prev) => Math.max(prev, requiredVisibleCount));
    }

    return true;
  };

  const jumpToMessage = async (messageId: string) => {
    if (!messageId) return;

    const tryScrollWithRetry = (attemptsLeft = 8) => {
      if (scrollToMessage(messageId)) {
        showJumpHighlight(messageId);
        return;
      }

      if (attemptsLeft <= 0) {
        toast.error('Message not found in current history');
        return;
      }

      window.setTimeout(() => tryScrollWithRetry(attemptsLeft - 1), 80);
    };

    if (ensureMessageVisibleInWindow(messageId)) {
      tryScrollWithRetry();
      return;
    }

    if (!activeConversationId) return;

    try {
      const deepHistory = await fetchConversationMessages(activeConversationId, 500);
      applyServerMessages(deepHistory as unknown[]);
      setVisibleCount((prev) => Math.max(prev, 500));

      window.setTimeout(() => {
        ensureMessageVisibleInWindow(messageId);
        tryScrollWithRetry();
      }, 100);
    } catch (error) {
      console.error('Failed to load deeper history for jump:', error);
      toast.error('Unable to load older messages');
    }
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

  // WhatsApp-style: show sticky date chip at top while scrolling
  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;

    const onScroll = () => {
      const separators = container.querySelectorAll<HTMLElement>('[data-date-label]');
      if (!separators.length) return;

      const containerTop = container.getBoundingClientRect().top;
      let activeLabel = "";

      separators.forEach((el) => {
        const elTop = el.getBoundingClientRect().top;
        if (elTop <= containerTop + 56) {
          activeLabel = el.dataset.dateLabel || "";
        }
      });

      // If no separator has scrolled past yet, show the first one
      if (!activeLabel) {
        activeLabel = (separators[0] as HTMLElement)?.dataset?.dateLabel || "";
      }

      setScrollDateLabel(activeLabel);

      if (scrollDateTimeoutRef.current) clearTimeout(scrollDateTimeoutRef.current);
      scrollDateTimeoutRef.current = window.setTimeout(() => {
        setScrollDateLabel("");
      }, 1500);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      if (scrollDateTimeoutRef.current) clearTimeout(scrollDateTimeoutRef.current);
    };
  }, [scrollContainerRef, isLoading]);

  useEffect(() => {
    const closeMenu = () => {
      if (menuOpenedByTouchRef.current) return;
      setActionMenu(null);
    };
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', () => setActionMenu(null), true);
    window.addEventListener('resize', () => setActionMenu(null));
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', () => setActionMenu(null), true);
      window.removeEventListener('resize', () => setActionMenu(null));
    };
  }, []);

  useEffect(() => {
    if (!actionMenu) {
      setActionMenuPosition(null);
      return;
    }
    setActionMenuPosition({ x: actionMenu.x, y: actionMenu.y });
  }, [actionMenu]);

  useLayoutEffect(() => {
    if (!actionMenu || !actionMenuRef.current) return;

    const rect = actionMenuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 12;

    const nextX = Math.min(
      Math.max(actionMenu.x, padding),
      Math.max(padding, viewportWidth - rect.width - padding),
    );
    const nextY = Math.min(
      Math.max(actionMenu.y, padding),
      Math.max(padding, viewportHeight - rect.height - padding),
    );

    if (!actionMenuPosition || actionMenuPosition.x !== nextX || actionMenuPosition.y !== nextY) {
      setActionMenuPosition({ x: nextX, y: nextY });
    }
  }, [actionMenu, actionMenuPosition]);

  useEffect(() => {
    if (!mobileActionMessageId) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileActionMessageId]);

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
        const conversation = await fetchConversationById(activeConversationId);
        if (isMounted) {
          const conversationData = conversation as ConversationWithPinnedMessage;
          setPinnedMessageId(conversationData?.pinned_message_id || null);
          setFetchedPinnedMessage(conversationData?.pinned_message ? normalizeMessage(conversationData.pinned_message) : null);
        }

        if (conversationChannelRef.current) {
          conversationChannelRef.current.unsubscribe();
          conversationChannelRef.current = null;
        }

        const conversationChannel = supabase
          .channel(`conversation-pin-${activeConversationId}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations',
            filter: `id=eq.${activeConversationId}`,
          }, (payload) => {
            const nextPinned = (payload.new as { pinned_message_id?: string | null } | null)?.pinned_message_id || null;
            setPinnedMessageId(nextPinned);
            if (!nextPinned) setFetchedPinnedMessage(null);
          })
          .subscribe();

        conversationChannelRef.current = conversationChannel;

        // Cache-then-network: show cached messages instantly, skip skeleton on revisit
        const cached = queryClient.getQueryData<ChatPageMessage[]>(['messages', activeConversationId]);
        if (cached && cached.length > 0) {
          lastSyncCreatedAtRef.current = cached[cached.length - 1]?.created_at || null;
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
            lastSyncCreatedAtRef.current = merged[merged.length - 1]?.created_at || lastSyncCreatedAtRef.current;
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
      if (conversationChannelRef.current) {
        conversationChannelRef.current.unsubscribe();
        conversationChannelRef.current = null;
      }
    };
  }, [activeConversationId]);
  const togglePinnedMessage = async (messageId: string) => {
    if (!activeConversationId) return;

    const targetMessage = allMessages.find((message) => message.id === messageId);
    if (!targetMessage) {
      toast.error('Message not found');
      return;
    }

    if (targetMessage.status === 'sending' || targetMessage.status === 'failed') {
      toast.error('Please wait until the message is sent before pinning');
      return;
    }

    if (!isUuid(targetMessage.id)) {
      toast.error('This message is not ready to be pinned yet');
      return;
    }

    const nextPinned = pinnedMessageId === messageId ? null : messageId;
    const previousPinned = pinnedMessageId;
    const previousPinnedMessage = fetchedPinnedMessage;
    setPinnedMessageId(nextPinned);
    setFetchedPinnedMessage(nextPinned ? normalizeMessage(targetMessage) : null);

    try {
      const updatedConversation = await setConversationPinnedMessage(activeConversationId, nextPinned);
      const updatedData = updatedConversation as ConversationWithPinnedMessage;
      setPinnedMessageId(updatedData?.pinned_message_id || null);
      setFetchedPinnedMessage(updatedData?.pinned_message ? normalizeMessage(updatedData.pinned_message) : null);
      toast.success(nextPinned ? 'Message pinned' : 'Message unpinned');
    } catch (error: unknown) {
      setPinnedMessageId(previousPinned);
      setFetchedPinnedMessage(previousPinnedMessage);

      const message = error instanceof Error ? error.message : 'Failed to update pinned message';
      const lower = message.toLowerCase();

      if (lower.includes('pinned_message_id') || lower.includes('column') || lower.includes('schema cache')) {
        toast.error('Pinned message backend is not ready yet. Please run the latest Supabase migration.');
        return;
      }

      if (lower.includes('must belong to the same conversation')) {
        toast.error('Only messages from this chat can be pinned.');
        return;
      }

      toast.error(message);
    }
  };


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
        const after = lastSyncCreatedAtRef.current;
        if (!after) {
          const msgs = await fetchConversationMessages(activeConversationId);
          applyServerMessages(msgs as unknown[]);
          return;
        }

        const delta = await fetchConversationMessagesAfter(activeConversationId, after, 120);
        if (delta.length > 0) {
          applyServerMessages(delta as unknown[]);
        }
      } catch (err) {
        console.error('Polling messages failed:', err);
      } finally {
        pollInFlightRef.current = false;
      }
    }, 35000);

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
    const canOpen = message.type !== 'system';
    if (!canOpen) return;
    event.preventDefault();
    event.stopPropagation();
    openActionMenu(message.id, event.clientX, event.clientY);
  };

  const openActionMenuNearElement = (messageId: string, anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    openActionMenu(messageId, rect.right - 8, rect.bottom + 8);
  };

  const sortConversationsByLatest = (items: ConversationListItem[]) => {
    return [...items].sort((a, b) => {
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

    queryClient.setQueryData(['conversations', currentUserId], (oldData: ConversationListItem[] | undefined) => {
      if (!Array.isArray(oldData) || oldData.length === 0) return oldData;

      let foundConversation = false;
      const nextData = oldData.map((participant) => {
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

    const now = Date.now();
    if (now - lastListRefreshAtRef.current < REFRESH_THROTTLE_MS) return;
    lastListRefreshAtRef.current = now;

    void queryClient.invalidateQueries({
      queryKey: ['conversations', currentUserId],
      type: 'all',
    });
  };

  const refreshMessagesInBackground = () => {
    if (!activeConversationId) return;

    const now = Date.now();
    if (now - lastThreadRefreshAtRef.current < REFRESH_THROTTLE_MS) return;
    lastThreadRefreshAtRef.current = now;

    void queryClient.invalidateQueries({
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

    queryClient.setQueryData(['conversations', currentUserId], (oldData: ConversationListItem[] | undefined) => {
      if (!Array.isArray(oldData) || oldData.length === 0) return oldData;

      return oldData.map((participant) => {
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
    const canOpen = message.type !== 'system';
    if (!canOpen) return;
    const touch = event.touches[0];
    if (!touch) return;

    // Prevent text selection and native context menu
    event.preventDefault();

    swipeReplyRef.current = {
      messageId: message.id,
      startX: touch.clientX,
      startY: touch.clientY,
      triggered: false,
      cancelled: false,
    };
    setSwipePreview({ messageId: message.id, offset: 0, dragging: true });

    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      if (isMobileLikePointer()) {
        triggerLongPressHaptic();
        setMobileActionMessageId(message.id);
      } else {
        menuOpenedByTouchRef.current = true;
        openActionMenu(message.id, touch.clientX, touch.clientY);
        window.setTimeout(() => {
          menuOpenedByTouchRef.current = false;
        }, 50);
      }
    }, LONG_PRESS_MS);
  };

  const handleMessageTouchMove = (event: React.TouchEvent, message: ChatPageMessage) => {
    const swipeState = swipeReplyRef.current;
    const touch = event.touches[0];
    if (!swipeState || !touch || swipeState.messageId !== message.id || swipeState.cancelled) return;

    // Prevent text selection during swipe
    event.preventDefault();

    const deltaX = touch.clientX - swipeState.startX;
    const deltaY = Math.abs(touch.clientY - swipeState.startY);

    // Cancel gesture if user is clearly scrolling vertically.
    if (deltaY > SWIPE_REPLY_Y_TOLERANCE) {
      swipeState.cancelled = true;
      clearLongPress();
      setSwipePreview((current) => {
        if (!current || current.messageId !== message.id) return current;
        return { ...current, offset: 0, dragging: false };
      });
      return;
    }

    const nextOffset = Math.max(0, Math.min(deltaX, MAX_SWIPE_REPLY_X));
    setSwipePreview((current) => {
      if (!current || current.messageId !== message.id) {
        return { messageId: message.id, offset: nextOffset, dragging: true };
      }
      if (current.offset === nextOffset && current.dragging) return current;
      return { ...current, offset: nextOffset, dragging: true };
    });

    // Any deliberate horizontal move should stop long-press menu activation.
    if (deltaX > 18) {
      clearLongPress();
    }

    if (swipeState.triggered || deltaX < SWIPE_REPLY_X_THRESHOLD) return;

    swipeState.triggered = true;
    clearLongPress();
    if (isMobileLikePointer()) {
      void Haptics.selectionChanged().catch(() => {});
    }

    setReplyTarget(message);
    setActionMenu(null);
    setMobileActionMessageId(null);
    event.preventDefault();
  };

  const handleMessageTouchEnd = (event: React.TouchEvent) => {
    event.preventDefault();
    clearLongPress();
    setSwipePreview((current) => {
      if (!current) return null;
      return { ...current, offset: 0, dragging: false };
    });
    window.setTimeout(() => {
      setSwipePreview((current) => (current && current.dragging ? current : null));
    }, 180);
    swipeReplyRef.current = null;
  };

  const handleMessageTouchCancel = (event: React.TouchEvent) => {
    event.preventDefault();
    clearLongPress();
    setSwipePreview((current) => {
      if (!current) return null;
      return { ...current, offset: 0, dragging: false };
    });
    window.setTimeout(() => {
      setSwipePreview((current) => (current && current.dragging ? current : null));
    }, 180);
    swipeReplyRef.current = null;
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
    const hasNonReplyAttachments = getRenderableAttachments(message.attachments).length > 0;
    if (hasNonReplyAttachments) {
      toast.error('Editing media/document messages is not supported');
      return;
    }
    if (isUnsentMessage(message)) {
      toast.error('You cannot edit an unsent message');
      return;
    }

    setEditingMessageId(message.id);
    setEditingValue(message.content);
    setReplyTarget(null);
    setActionMenu(null);
    setMobileActionMessageId(null);
    setTimeout(() => scrollToBottom(), 50);
  };

  const submitEditMessage = async (nextRawValue?: string) => {
    if (!editingMessageId) return;
    const nextContent = (nextRawValue ?? editingValue).trim();
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
        if (replyTarget?.id === confirmAction.messageId) {
          setReplyTarget(null);
        }
        if (pinnedMessageId === confirmAction.messageId) {
          setPinnedMessageId(null);
        }
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

    if (editingMessageId) {
      const nextContent = message.trim();
      if (!nextContent) return;
      setEditingValue(nextContent);
      await submitEditMessage(nextContent);
      return;
    }

    const activeReply = replyTarget;
    setReplyTarget(null);

    const replyMetadata: ChatAttachment[] = activeReply
      ? [{
          type: 'reply',
          messageId: activeReply.id,
          senderName: activeReply.sender?.full_name || activeReply.sender?.username || (activeReply.sender_id === currentUserId ? 'You' : 'Unknown'),
          preview: summarizeMessage(activeReply).slice(0, 140),
        }]
      : [];
    const outgoingAttachments = [...replyMetadata, ...(atts || [])];

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
      attachments: outgoingAttachments
    };

    // Add to pending immediately
    setPendingMessages((prev) => [...prev, optimisticMessage]);
    updateConversationListPreview(optimisticMessage, targetConversationId);

    // Send in background - subscription will move it from pending to confirmed
    try {
      const saved = await sendMessage(targetConversationId, message, clientId, outgoingAttachments);
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
      const isPolicyError = err instanceof Error && err.name === 'FamiliesPolicyError';
      if (isPolicyError) {
        setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
      } else {
        // Mark as failed
        setPendingMessages((prev) =>
          prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m)
        );
      }
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
      refreshConversationListInBackground();
    }
  };

  // Header component
  const headerContent = (
    <header className="h-full glass border-b border-border/50 safe-x">
      <div className="h-[var(--safe-top)]" />
      <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8">
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
      {pinnedMessage && (
        <div className="w-full bg-white px-3 py-1.5 sm:px-4 lg:px-6 xl:px-8">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-0 text-left"
            onClick={() => void jumpToMessage(pinnedMessage.id)}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#cfd3d7] bg-[#f5f7f8] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <Pin className="h-3.5 w-3.5 text-[#3e4a56]" />
            </div>
            <div className="min-w-0">
              <p className="line-clamp-1 text-[13px] leading-5 text-[#111b21]">{summarizeMessage(pinnedMessage)}</p>
            </div>
          </button>
        </div>
      )}
    </header>
  );

  const mobileActionSheet = mobileActionMessage ? (
    <div className="fixed inset-0 z-[140] md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        onClick={() => setMobileActionMessageId(null)}
        aria-label="Close message actions"
      />

      <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-hidden rounded-t-2xl border border-border bg-background shadow-2xl">
        <div className="mx-auto mb-3 mt-2 h-1.5 w-10 rounded-full bg-muted" />
        <div className="max-h-[calc(80vh-22px)] overflow-y-auto px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] select-none">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm"
            onClick={() => {
              setReplyTarget(mobileActionMessage);
              setMobileActionMessageId(null);
            }}
          >
            <Reply className="h-4 w-4" />
            Reply
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm"
            onClick={() => {
              void copyMessageContent(mobileActionMessage);
              setMobileActionMessageId(null);
            }}
          >
            <Copy className="h-4 w-4" />
            Copy
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm"
            onClick={() => {
              void togglePinnedMessage(mobileActionMessage.id);
              setMobileActionMessageId(null);
            }}
          >
            {pinnedMessageId === mobileActionMessage.id ? (
              <><PinOff className="h-4 w-4" />Unpin</>
            ) : (
              <><Pin className="h-4 w-4" />Pin message</>
            )}
          </button>

          {canUseMessageActions(mobileActionMessage) && (
            <>
              <div className="my-1 h-px bg-border" />
              {!isUnsentMessage(mobileActionMessage) && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm"
                  onClick={() => {
                    beginEditMessage(mobileActionMessage);
                    setMobileActionMessageId(null);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              )}

              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm"
                onClick={() => {
                  setConfirmAction({ type: 'unsend', messageId: mobileActionMessage.id });
                  setMobileActionMessageId(null);
                }}
              >
                <Undo2 className="h-4 w-4" />
                Unsend
              </button>

              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm text-destructive"
                onClick={() => {
                  setConfirmAction({ type: 'delete', messageId: mobileActionMessage.id });
                  setMobileActionMessageId(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </>
          )}

          {mobileActionMessage.sender_id !== currentUserId && messageReportType && (
            <>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setReportTarget({
                    messageId: String(mobileActionMessage.id),
                    reportedUserId: String(mobileActionMessage.sender_id),
                  });
                  setMobileActionMessageId(null);
                }}
              >
                Report Message
              </button>

              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm text-destructive hover:bg-accent"
                onClick={() => {
                  void blockUserFromMessage(String(mobileActionMessage.sender_id));
                  setMobileActionMessageId(null);
                }}
                disabled={isSubmittingAction}
              >
                Block User
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  ) : null;

  // Footer component
  const footerContent = (
    <>
      <div className="bg-background/95 backdrop-blur-sm border-t border-border/50 w-full">
        <ChatComposer
          onSend={handleSend}
          tripMembers={tripMembers}
          disabled={!canSend}
          placeholder={canSend ? "Type a message..." : (blockedMessage || "Messaging is disabled for this user")}
          replyTo={replyTarget ? {
            senderName: replyTarget.sender?.full_name || replyTarget.sender?.username || (replyTarget.sender_id === currentUserId ? 'You' : 'Unknown'),
            content: summarizeMessage(replyTarget),
          } : undefined}
          onCancelReply={() => setReplyTarget(null)}
          editState={editingMessageId ? {
            active: true,
            value: editingValue,
            onChange: setEditingValue,
            onCancel: () => {
              setEditingMessageId(null);
              setEditingValue('');
            },
          } : undefined}
        />
      </div>
      {mobileActionSheet}
    </>
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
      {/* Show sticky date only when available so it doesn't reserve extra gap */}
      {scrollDateLabel && (
        <div
          className="sticky top-2 z-10 flex justify-center pointer-events-none"
        >
          <span className="rounded-full border border-[#d6d6d6] bg-white px-3 py-0.5 text-[11px] font-medium tracking-[0.01em] text-[#111b21] shadow-[0_1px_2px_rgba(11,20,26,0.12)] transition-opacity duration-300 opacity-100">
            {scrollDateLabel}
          </span>
        </div>
      )}

      {hiddenMessagesCount > 0 && (
        <div className="mb-3 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_STEP)}
          >
            Load earlier messages ({hiddenMessagesCount})
          </Button>
        </div>
      )}

      {renderedMessages.map((msg, index) => {
        const previous = index > 0 ? renderedMessages[index - 1] : null;
        const currentDate = parseMessageDate(msg.created_at);
        const previousDate = parseMessageDate(previous?.created_at);
        const currentDayKey = currentDate ? getLocalDayKey(currentDate) : "";
        const previousDayKey = previousDate ? getLocalDayKey(previousDate) : "";
        const showDateSeparator = index === 0 || currentDayKey !== previousDayKey;
        const dateSeparatorLabel = msg.created_at ? formatDateSeparatorLabel(String(msg.created_at)) : "";
        const isOwn = msg.sender_id === currentUserId;
        const isSystem = msg.type === 'system';
        const isPinnedChatMessage = pinnedMessageId === msg.id;
        const canOpenMenuForMessage = canUseMessageActions(msg) || (msg.sender_id !== currentUserId && Boolean(messageReportType));
        const timeLabel = currentDate
          ? currentDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "";
        
        // Get sender info for group chats
        const senderName = msg.sender?.full_name || msg.sender?.username || "Unknown";
        const senderAvatar = msg.sender?.avatar_url;

        // Render system messages
        if (isSystem) {
          return (
            <div key={String(msg.id)}>
              {showDateSeparator && dateSeparatorLabel && (
                renderDateSeparator(dateSeparatorLabel, index === 0)
              )}
              <div className="flex justify-center py-3">
                <p className="text-xs sm:text-sm text-muted-foreground text-center px-4">
                  {formatSystemMessageContent(msg.content)}
                </p>
              </div>
            </div>
          );
        }

        const replyMeta = getReplyAttachment(msg.attachments);
        const renderableAttachments = getRenderableAttachments(msg.attachments);

        return (
          <div
            key={String(msg.id)}
            ref={(element) => {
              if (element) messageElementRefs.current.set(String(msg.id), element);
              else messageElementRefs.current.delete(String(msg.id));
            }}
          >
            {showDateSeparator && dateSeparatorLabel && (
              renderDateSeparator(dateSeparatorLabel, index === 0)
            )}

            <div
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
                      "relative px-4 py-2 rounded-2xl border shadow-sm select-none will-change-transform",
                      swipePreview?.messageId === String(msg.id) && !swipePreview.dragging && "transition-transform duration-150 ease-out",
                      isOwn
                        ? "bg-black text-white border-black rounded-br-sm"
                        : "bg-white text-foreground border-border rounded-bl-sm",
                      jumpHighlightMessageId === String(msg.id) && "ring-2 ring-gray-600 ring-offset-2 ring-offset-background"
                    )}
                    style={{
                      transform: swipePreview?.messageId === String(msg.id) ? `translateX(${swipePreview.offset}px)` : undefined,
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                      WebkitUserSelect: "none",
                      userSelect: "none",
                      WebkitTouchCallout: "none",
                      touchAction: "manipulation",
                    }}
                    onContextMenu={(event) => handleMessageContextMenu(event, msg)}
                    onTouchStart={(event) => handleMessageTouchStart(event, msg)}
                    onTouchMove={(event) => handleMessageTouchMove(event, msg)}
                    onTouchEnd={handleMessageTouchEnd}
                    onTouchCancel={handleMessageTouchCancel}
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
                      {replyMeta && (
                        <button
                          type="button"
                          onTouchStart={(event) => {
                            event.stopPropagation();
                          }}
                          onTouchEnd={(event) => {
                            if (!replyMeta.messageId) return;
                            handleReplyJump(replyMeta.messageId, event);
                          }}
                          onClick={(event) => {
                            if (!replyMeta.messageId) return;
                            handleReplyJump(replyMeta.messageId, event);
                          }}
                          className={cn(
                            "mb-2 block w-full rounded-lg border px-2.5 py-1.5 text-left",
                            isOwn
                              ? "border-gray-500/90 bg-white/10"
                              : "border-gray-500 bg-black/5"
                          )}
                        >
                          <p className={cn("text-[11px] font-semibold", isOwn ? "text-white/85" : "text-muted-foreground")}>{replyMeta.senderName}</p>
                          <p className={cn("line-clamp-1 text-xs", isOwn ? "text-white/90" : "text-foreground/80")}>{replyMeta.preview}</p>
                        </button>
                      )}
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
                    {renderableAttachments.length > 0 && (
                      <MessageAttachments attachments={renderableAttachments} isOwn={isOwn} />
                    )}
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-[10px] sm:text-[11px] px-2 mt-0.5",
                    isOwn ? "justify-end text-muted-foreground/80" : "text-muted-foreground/80"
                  )}>
                    {isPinnedChatMessage && (
                      <Pin className="h-3 w-3 text-black-700" aria-label="Pinned message" />
                    )}
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
          </div>
        );
      })}

      {actionMenu && actionMessage && (
        <div
          ref={actionMenuRef}
          className="fixed z-[90] min-w-[180px] max-h-[65vh] overflow-y-auto rounded-2xl bg-[#111b21] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur-sm"
          style={{ left: actionMenuPosition?.x ?? actionMenu.x, top: actionMenuPosition?.y ?? actionMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white hover:bg-white/15"
              onClick={() => {
                setReplyTarget(actionMessage);
                setActionMenu(null);
              }}
            >
              <Reply className="h-4 w-4" />
              Reply
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white hover:bg-white/15"
              onClick={() => {
                void copyMessageContent(actionMessage);
                setActionMenu(null);
              }}
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white hover:bg-white/15"
              onClick={() => {
                void togglePinnedMessage(actionMessage.id);
                setActionMenu(null);
              }}
            >
              {pinnedMessageId === actionMessage.id ? (
                <><PinOff className="h-4 w-4" />Unpin</>
              ) : (
                <><Pin className="h-4 w-4" />Pin message</>
              )}
            </button>

            {canUseMessageActions(actionMessage) && (
              <>
                <div className="my-1 h-px bg-white/20" />
              {!isUnsentMessage(actionMessage) && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white hover:bg-white/15"
                  onClick={() => beginEditMessage(actionMessage)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              )}
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white hover:bg-white/15"
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
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-400 hover:bg-white/15"
                onClick={() => {
                  setConfirmAction({ type: 'delete', messageId: actionMessage.id });
                  setActionMenu(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
              </>
            )}

            {actionMessage.sender_id !== currentUserId && messageReportType && (
              <>
                <div className="my-1 h-px bg-white/20" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white hover:bg-white/15"
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
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-400 hover:bg-white/15"
                  onClick={() => void blockUserFromMessage(String(actionMessage.sender_id))}
                  disabled={isSubmittingAction}
                >
                  Block User
                </button>
              </>
            )}
          </>
        </div>
      )}

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
    tripPinnedContent: !showBackButton && pinnedMessage ? (
      <div className="w-full bg-white px-3 py-1.5 sm:px-4 lg:px-6 xl:px-8">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-0 text-left"
          onClick={() => void jumpToMessage(pinnedMessage.id)}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#cfd3d7] bg-[#f5f7f8] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <Pin className="h-3.5 w-3.5 text-[#3e4a56]" />
          </div>
          <div className="min-w-0">
            <p className="line-clamp-1 text-[13px] leading-5 text-[#111b21]">{summarizeMessage(pinnedMessage)}</p>
          </div>
        </button>
      </div>
    ) : null,
    messagesContent,
    footerContent,
    messagesEndRef,
    scrollToBottom,
    scrollToBottomButton: showScrollBtn ? (
      <button
        type="button"
        onClick={() => scrollToBottom()}
        className={cn(
          "fixed z-50 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-500 text-white shadow-[0_8px_22px_rgba(0,0,0,0.28)] ring-2 ring-white/70 hover:bg-zinc-600 active:scale-95 transition",
          replyTarget || editingMessageId
            ? "bottom-[calc(env(safe-area-inset-bottom,0px)+8.1rem)] right-3"
            : "bottom-[calc(env(safe-area-inset-bottom,0px)+5.2rem)] right-4"
        )}
        aria-label="Scroll to bottom"
      >
        <ArrowDown className="h-5 w-5" />
      </button>
    ) : null,
  };
}
