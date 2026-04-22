/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MessageCircle, Users, Search, X, MoreVertical } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { SwipeableChatItem } from "@/components/chat/SwipeableChatItem";
import { ChatListLoading } from "@/components/chat/ChatListLoading";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import { deleteDirectConversation } from "@/lib/conversations";
import { getLoadErrorFeedback } from "@/lib/requestErrors";
import { markConversationReadOptimistically } from "@/lib/chatReadService";
import { getBlockedUsers } from "@/lib/blockUser";

// Helper to generate fallback avatar
const getDefaultAvatar = (userId: string) => {
  const timestamp = Date.now();
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}&t=${timestamp}`;
};

// Helper to map conversation data to UI
function mapConversationToChatItem(participant: any, currentUserId?: string) {
  const conv = participant.conversation;
  const lastMsg = participant.lastMessage;
  const isTrip = conv.conversation_type === "trip_group";
  const conversationId = conv.id;

  let name = "Direct Chat";
  let imageUrl = undefined;
  let id = conv.id; // Use conversation ID by default for direct chats
  let otherUserId = undefined; // Track other user ID for fallback avatar
  
  if (isTrip) {
    name = conv.trip?.title || conv.name || "Trip Group";
    imageUrl = conv.trip?.cover_image;
    id = conv.trip_id; // Use trip ID for trip chats - this is needed for TripHub routing
  } else {
    // Direct chat: show the other user's name, fallback to 'Unknown'
    if (conv.user1?.id === currentUserId) {
      name = conv.user2?.full_name?.trim() ? conv.user2.full_name : "Unknown";
      imageUrl = conv.user2?.avatar_url;
      otherUserId = conv.user2?.id;
    } else {
      name = conv.user1?.full_name?.trim() ? conv.user1.full_name : "Unknown";
      imageUrl = conv.user1?.avatar_url;
      otherUserId = conv.user1?.id;
    }
    // Use dicebear fallback for direct chats without avatar
    if (!imageUrl || !imageUrl.trim()) {
      imageUrl = getDefaultAvatar(otherUserId || id);
    }
  }

  // Build last message preview, including attachment notes
  const att = Array.isArray(lastMsg?.attachments) ? lastMsg.attachments : [];
  const hasImage = att.some((a: any) => a?.type === 'image');
  const hasDoc = att.some((a: any) => a?.type === 'document');
  const hasLoc = att.some((a: any) => a?.type === 'location');
  const attLabel = [
    hasImage ? 'Photo' : null,
    hasDoc ? 'Document' : null,
    hasLoc ? 'Location' : null,
  ].filter(Boolean).join(' • ');
  const previewText = att.length > 0
    ? (attLabel || 'Attachment')
    : (lastMsg?.content || "");

  const hasIncomingLastMessage = Boolean(
    lastMsg?.sender_id && currentUserId && lastMsg.sender_id !== currentUserId
  );
  const hasUnread = Boolean(lastMsg?.created_at) && hasIncomingLastMessage && (
    !participant.last_read_at || new Date(participant.last_read_at) < new Date(lastMsg.created_at)
  );

  return {
    id,
    conversationId,
    name,
    type: (isTrip ? "trip" : "direct") as "trip" | "direct",
    lastMessage: previewText,
    lastMessageSender: lastMsg?.sender?.full_name || "",
    lastMessageCreatedAt: lastMsg?.created_at || null,
    unread: participant.unreadCount ?? (hasUnread ? 1 : 0),
    imageUrl,
  };
}


export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "direct" ? "direct" : "trips";
  const [chatFilter, setChatFilter] = useState<"trips" | "direct">(initialTab);
  // Persist search in URL so it survives navigation away and back
  const searchQuery = searchParams.get("q") ?? "";
  const setSearchQuery = (val: string) =>
    setSearchParams((prev) => { const p = new URLSearchParams(prev); val ? p.set("q", val) : p.delete("q"); return p; }, { replace: true });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "trip" | "direct"; name: string } | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const deletedTripNotifiedConversationsRef = useRef<Set<string>>(new Set());
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  // Fetch conversations with React Query
  const { data: participants = [], isLoading: loading, error } = useConversations(user?.id);

  useEffect(() => {
    if (!error) return;
    console.error('Failed to load chats:', error);
    const feedback = getLoadErrorFeedback('chats', error);
    toast.error(feedback.title, { description: feedback.description });
  }, [error]);

  useEffect(() => {
    let mounted = true;
    if (!user?.id) {
      setBlockedUserIds(new Set());
      return;
    }

    const loadBlockedUsers = async () => {
      const ids = await getBlockedUsers();
      if (mounted) {
        setBlockedUserIds(new Set(ids));
      }
    };

    void loadBlockedUsers();
    const onFocus = () => {
      void loadBlockedUsers();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      mounted = false;
      window.removeEventListener('focus', onFocus);
    };
  }, [user?.id]);

  // Map participants to chat items
  const chats = useMemo(() => {
    if (!participants || !Array.isArray(participants)) {
      console.warn('Participants is not an array:', participants);
      return [];
    }
    return participants
      .filter((p: any) => {
        const conv = p?.conversation;
        if (!conv) return false;
        // Safety guard: hide orphaned trip chats when trip was deleted.
        if (conv.conversation_type === 'trip_group' && !conv.trip) return false;

        // Hide direct conversations for users I have blocked.
        if (conv.conversation_type === 'direct' && user?.id) {
          const otherUserId = conv.user1?.id === user.id ? conv.user2?.id : conv.user1?.id;
          if (otherUserId && blockedUserIds.has(otherUserId)) return false;
        }

        return true;
      })
      .map((p: any) => mapConversationToChatItem(p, user?.id));
  }, [participants, user?.id, blockedUserIds]);

  useEffect(() => {
    if (!participants || !Array.isArray(participants)) return;

    const deletedTripParticipants = participants.filter((p: any) => {
      const conv = p?.conversation;
      return conv && conv.conversation_type === "trip_group" && !conv.trip;
    });

    deletedTripParticipants.forEach((p: any) => {
      const conv = p?.conversation;
      if (!conv?.id) return;
      if (deletedTripNotifiedConversationsRef.current.has(conv.id)) return;

      deletedTripNotifiedConversationsRef.current.add(conv.id);
      const tripName = conv.name?.trim() || "This trip";
      toast.info(`${tripName} has been deleted and the group chat for ${tripName} has been removed.`);
    });
  }, [participants]);

  // Subscribe to new messages for real-time updates with optimistic UI updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chat-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        // OPTIMISTIC: Update the chat list immediately with the new message
        // instead of waiting for a full refetch. This makes the UI feel instant (like WhatsApp).
        const newMsg = payload.new as any;
        
        // Try to fetch sender profile if not available
        let senderProfile = null;
        if (newMsg.sender_id) {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url')
              .eq('id', newMsg.sender_id)
              .maybeSingle();
            senderProfile = data;
          } catch (err) {
            console.warn('[chat-list] Failed to fetch sender profile:', err);
          }
        }
        
        queryClient.setQueryData(['conversations', user.id], (oldData: any[] | undefined) => {
          if (!Array.isArray(oldData)) {
            // If data not in cache, invalidate to refetch
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
            }, 100);
            return oldData;
          }

          // Find the conversation this message belongs to and update it
          const updated = oldData
            .map((participant: any) => {
              if (participant?.conversation?.id !== newMsg.conversation_id) return participant;

              // Update last message with sender profile if available
              return {
                ...participant,
                lastMessage: {
                  id: newMsg.id,
                  sender_id: newMsg.sender_id,
                  content: newMsg.content,
                  attachments: newMsg.attachments,
                  created_at: newMsg.created_at,
                  type: newMsg.type,
                  sender: senderProfile || participant.lastMessage?.sender || { id: newMsg.sender_id },
                },
              };
            })
            .sort((a: any, b: any) => {
              // Re-sort: conversations with latest messages float to top
              const aTime = a.lastMessage?.created_at
                ? new Date(a.lastMessage.created_at).getTime()
                : new Date(a.created_at ?? 0).getTime();
              const bTime = b.lastMessage?.created_at
                ? new Date(b.lastMessage.created_at).getTime()
                : new Date(b.created_at ?? 0).getTime();
              return bTime - aTime;
            });
          
          return updated;
        });
        
        // After optimistic update, refetch full data after 300ms to ensure everything is synced
        // This handles edge cases where the optimistic update was incomplete
        setTimeout(() => {
          queryClient.refetchQueries({ 
            queryKey: ['conversations', user.id],
          });
        }, 300);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      const matchesTab = chatFilter === "trips" ? chat.type === "trip" : chat.type === "direct";
      const matchesSearch = searchQuery === "" ||
        chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [chatFilter, searchQuery, chats]);

  const tripsUnreadCount = chats.filter((c) => c.type === "trip").reduce((s, c) => s + c.unread, 0);
  const directUnreadCount = chats.filter((c) => c.type === "direct").reduce((s, c) => s + c.unread, 0);

  // Keep URL in sync so back navigation selects correct tab
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", chatFilter);
    setSearchParams(next, { replace: true });
  }, [chatFilter, searchParams, setSearchParams]);


  const handleDeleteChat = useCallback(async (chat: { id: string; type: "trip" | "direct" }) => {
    if (chat.type !== "direct") {
      toast.error("Trip chats can't be deleted");
      return;
    }
    if (!user?.id) return;

    const queryKey = ['conversations', user.id];
    const previous = queryClient.getQueryData(queryKey);

    queryClient.setQueryData(queryKey, (old: any[]) =>
      old?.filter((p: any) => p?.conversation?.id !== chat.id) || []
    );

    try {
      await deleteDirectConversation(chat.id);
      await queryClient.invalidateQueries({ queryKey });
      toast.success("Chat deleted");
    } catch (err) {
      console.error("Failed to delete chat:", err);
      queryClient.setQueryData(queryKey, previous);
      toast.error("Failed to delete chat");
    }
  }, [queryClient, user]);

  const requestDeleteChat = (chat: { id: string; type: "trip" | "direct"; name?: string }) => {
    if (chat.type !== "direct") {
      toast.error("Trip chats can't be deleted");
      return;
    }
    setDeleteTarget({ id: chat.id, type: chat.type, name: chat.name || "this chat" });
  };

  const handleMarkAsRead = useCallback((chatId: string) => {
    markConversationReadOptimistically({
      queryClient,
      userId: user?.id,
      conversationId: chatId,
    });
  }, [queryClient, user]);

  return (
    <AppLayout>
      <div className="py-6 sm:py-8 space-y-5">
        <h1 className="text-3xl font-bold text-foreground">Messages</h1>

        {/* Search Bar */}
        <div className="relative" data-disable-keyboard-autoscroll="true">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-11"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <SegmentedControl
          options={[
            { label: "DIY Trips", value: "trips", count: loading ? 0 : tripsUnreadCount },
            { label: "Direct Messages", value: "direct", count: loading ? 0 : directUnreadCount },
          ]}
          value={chatFilter}
          onChange={(value) => setChatFilter(value as "trips" | "direct")}
        />

        {loading ? (
          // Show 8 loading skeletons for better perceived performance
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <ChatListLoading key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredChats.map((chat) => (
              <SwipeableChatItem
                key={chat.id}
                onDelete={() => requestDeleteChat(chat)}
                onMarkAsRead={() => handleMarkAsRead(chat.conversationId)}
                hasUnread={chat.unread > 0}
                allowDelete={chat.type === "direct"}
              >
                <div className="flex items-center gap-4 p-4 sm:p-5 border border-border/50 rounded-lg bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 transition-colors">
                  <Link
                    to={
                      chat.type === "trip"
                        ? `/trip/${chat.id}/hub?tab=chat`
                        : `/chat/${chat.id}`
                    }
                    onClick={() => {
                      if (chat.unread > 0) {
                        handleMarkAsRead(chat.conversationId);
                      }
                    }}
                    className="flex items-center gap-4 flex-1 min-w-0"
                  >
                      <div className="relative shrink-0">
                        <div className="h-14 w-14 rounded-full bg-muted overflow-hidden">
                          {chat.imageUrl ? (
                            <img
                              src={chat.imageUrl}
                              alt={chat.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              {chat.type === "trip" ? (
                                <Users className="h-6 w-6 text-muted-foreground" />
                              ) : (
                                <MessageCircle className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                          )}
                        </div>
                        {chat.type === "trip" && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-[10px] text-primary-foreground font-medium">
                              G
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate text-base">
                          {chat.name}
                        </h4>
                        <p
                          className={cn(
                            "text-sm truncate mt-0.5",
                            chat.unread > 0
                              ? "text-foreground font-medium"
                              : "text-muted-foreground"
                          )}
                        >
                          {chat.lastMessageSender ? (
                            <span className="font-semibold">{chat.lastMessageSender}: </span>
                          ) : null}
                          {chat.lastMessage}
                        </p>
                      </div>
                      {chat.unread > 0 && (
                        <span className="h-6 min-w-[24px] px-2 rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center shrink-0 self-center">
                          {chat.unread}
                        </span>
                      )}
                    </Link>
                    {chat.type === "direct" && (
                      <div className="hidden md:flex">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              aria-label="Chat options"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={(event) => {
                                event.preventDefault();
                                requestDeleteChat(chat);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              Delete chat
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                </div>
              </SwipeableChatItem>
            ))}
          </div>
        )}

        {!loading && filteredChats.length === 0 && (
          <div className="text-center py-12">
            {searchQuery ? (
              <>
                <p className="text-muted-foreground">No chats match your search</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-sm font-medium text-primary hover:underline"
                >
                  Clear search
                </button>
              </>
            ) : chatFilter === "trips" ? (
              <>
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No trip chats yet</p>
              </>
            ) : (
              <>
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No direct messages yet</p>
              </>
            )}
          </div>
        )}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete chat?</AlertDialogTitle>
              <AlertDialogDescription>
                This only removes the chat from your list. The other person will still see it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteTarget) {
                    handleDeleteChat(deleteTarget);
                    setDeleteTarget(null);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete chat
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
