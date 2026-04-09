import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronLeft, Check, Clock, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ChatComposer, type TripMember } from "@/components/chat/ChatComposer";
import type { ChatAttachment } from "@/lib/conversations";
import { MessageAttachments } from "@/components/chat/MessageAttachments";
import { fetchConversationMessages, subscribeToMessages, sendMessage, updateLastRead } from "@/lib/conversations";
import { parseMessageForDisplay } from "@/lib/chatMentions";
import { supabase } from "@/lib/supabase";

export interface ChatPageMessage {
  id: string;
  content: string;
  sender_id: string;
  sender?: { full_name?: string; username?: string; avatar_url?: string };
  created_at: string;
  client_id?: string;
  status?: 'sending' | 'sent' | 'failed';
  attachments?: ChatAttachment[];
  type?: 'user' | 'system';
  systemData?: { action: string; details?: string };
}

interface ChatPageProps {
  conversationId: string;
  headerTitle?: string;
  headerSubtitle?: string;
  headerImageUrl?: string;
  headerImageFallback?: string;
  onHeaderClick?: () => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
  isLoadingHeader?: boolean;
  currentUserId?: string;
  showSenderInfo?: boolean;
  tripMembers?: TripMember[];
  tripId?: string;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

export function ChatPage({
  conversationId,
  headerTitle = "Chat",
  headerSubtitle,
  headerImageUrl,
  headerImageFallback,
  onHeaderClick,
  showBackButton = true,
  onBackClick,
  isLoadingHeader = false,
  currentUserId,
  showSenderInfo = true,
  tripMembers = [],
  tripId,
  scrollContainerRef,
}: ChatPageProps) {
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
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const mentionUserIdByUsername = useMemo(() => {
    const map = new Map<string, string>();
    tripMembers.forEach((member) => {
      if (member.username) {
        map.set(member.username.toLowerCase(), member.id);
      }
    });
    return map;
  }, [tripMembers]);

  // Combine messages for display (confirmed + pending)
  const allMessages = useMemo(() => [...confirmedMessages, ...pendingMessages], [confirmedMessages, pendingMessages]);

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

  // Scroll to bottom helper
  const scrollToBottom = (instant = false) => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
    });
  };

  // Initialize: fetch messages and setup realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    let isMounted = true;

    const setupChat = async () => {
      try {
        // Cache-then-network: show cached messages instantly, skip skeleton on revisit
        const cached = queryClient.getQueryData<ChatPageMessage[]>(['messages', conversationId]);
        if (cached && cached.length > 0) {
          setConfirmedMessages(cached);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }

        // Start subscription immediately in parallel — don't await
        subscribeToMessages(conversationId, (newMsg: ChatPageMessage) => {
          if (!isMounted) return;

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
            queryClient.setQueryData(['messages', conversationId], merged);
            return merged;
          });

          setTimeout(() => scrollToBottom(), 50);
        }).then(unsub => {
          if (isMounted) unsubscribeRef.current = unsub;
          else unsub();
        });

        // Fetch fresh messages
        const msgs = await fetchConversationMessages(conversationId);
        if (!isMounted) return;

        const normalizedMsgs = normalizeMessages(msgs as unknown[]);
        setConfirmedMessages(normalizedMsgs);
        queryClient.setQueryData(['messages', conversationId], normalizedMsgs);
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
  }, [conversationId]);

  // Mark conversation as read — fully fire-and-forget, no query invalidation on open
  useEffect(() => {
    if (!conversationId) return;
    updateLastRead(conversationId).catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(async () => {
      try {
        const msgs = await fetchConversationMessages(conversationId);
        const normalizedMsgs = normalizeMessages(msgs as unknown[]);
        setConfirmedMessages((prev) => mergeById(prev, normalizedMsgs));
      } catch (err) {
        console.error('Polling messages failed:', err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [conversationId]);

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

  // Handle sending messages
  const handleSend = async (message: string, atts?: ChatAttachment[], mentionedUserIds?: string[]) => {
    if (!currentUserId) return;

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

    // Send in background - subscription will move it from pending to confirmed
    try {
      const saved = await sendMessage(conversationId, message, clientId, atts || []);
      const normalizedSaved: ChatPageMessage = {
        ...(saved as ChatPageMessage),
        sender: Array.isArray(saved?.sender) ? (saved.sender as unknown[])[0] as ChatPageMessage["sender"] : saved?.sender,
        status: 'sent',
      };

      setPendingMessages((prev) => prev.filter(m => m.client_id !== clientId && m.id !== tempId));
      setConfirmedMessages((prev) => mergeById(prev, [normalizedSaved]));

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
        </div>
      </div>
    </header>
  );

  // Footer component
  const footerContent = (
    <div className="bg-background/95 backdrop-blur-sm border-t border-border/50 w-full">
      <ChatComposer onSend={handleSend} tripMembers={tripMembers} />
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
            
            <div
              className={cn("flex flex-col gap-0.5", isOwn ? "items-end" : "items-start")}
              style={{ maxWidth: isOwn ? "75%" : "75%" }}
            >
              {/* Sender name - always show for group chats */}
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
              >
                <div className="text-sm sm:text-base leading-snug whitespace-pre-wrap">
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
                        return (
                          mentionUserId ? (
                            <Link key={idx} to={`/user/${mentionUserId}`} className="cursor-pointer">
                              <span className={mentionClassName}>{part.value}</span>
                            </Link>
                          ) : (
                            <span key={idx} className={mentionClassName}>{part.value}</span>
                          )
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
        );
      })}
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
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] right-4 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-background border border-border shadow-lg hover:bg-muted transition-colors"
        aria-label="Scroll to bottom"
      >
        <ChevronDown className="h-5 w-5 text-foreground" />
      </button>
    ) : null,
  };
}
