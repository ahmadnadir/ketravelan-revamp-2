import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChatPage } from "@/components/chat/ChatPage";
import { useState, useEffect, useRef } from "react";
import { createDirectConversation, deleteDirectConversation, fetchConversationById, fetchDirectConversation, profileCache } from "@/lib/conversations";
import { supabase } from "@/lib/supabase";
import { UserQuickActionsModal } from "@/components/chat/UserQuickActionsModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getLoadErrorFeedback } from "@/lib/requestErrors";
import { isMessagingBlockedBetweenUsers } from "@/lib/blockUser";
import { ModerationMenu } from "@/components/moderation/ModerationMenu";
import { useQueryClient } from "@tanstack/react-query";

const getDefaultAvatar = (userId: string) => {
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}`;
};

export default function DirectChat() {
  const { id: routeConversationId, userId: draftUserId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [otherUser, setOtherUser] = useState<Record<string, unknown> | null>(null);
  const [conversationId, setConversationId] = useState(routeConversationId || '');
  const [chatIsLoading, setChatIsLoading] = useState(true);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [messagingBlocked, setMessagingBlocked] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConversationId(routeConversationId || '');
  }, [routeConversationId]);

  const resolveAndSetOtherUser = async (targetUserId: string, isMounted: boolean) => {
    const cachedProfile = profileCache.get(targetUserId);
    if (cachedProfile?.id) {
      if (isMounted) {
        setOtherUser(cachedProfile);
        setChatIsLoading(false);
      }
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .eq('id', targetUserId)
      .maybeSingle();

    if (profile?.id) {
      profileCache.set(String(profile.id), {
        id: String(profile.id),
        username: String(profile.username || ''),
        full_name: String(profile.full_name || ''),
        avatar_url: String(profile.avatar_url || ''),
      });
    }

    if (isMounted) {
      setOtherUser(profile || { id: targetUserId, full_name: '' });
      setChatIsLoading(false);
    }
  };

  // Fetch conversation and other user info
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const directConversations = queryClient.getQueryData<any[]>(['conversations', user.id]) || [];

    const setupConvo = async () => {
      try {
        setChatIsLoading(true);

        // Draft mode: open user profile header first; create direct conversation only on first message send.
        if (draftUserId) {
          const existingConvo = await fetchDirectConversation(draftUserId);
          if (existingConvo?.id) {
            if (isMounted) {
              setConversationId(existingConvo.id);
              navigate(`/chat/${existingConvo.id}`, { replace: true });
            }
            return;
          }

          await resolveAndSetOtherUser(draftUserId, isMounted);

          if (user.id && draftUserId) {
            void isMessagingBlockedBetweenUsers(user.id, draftUserId)
              .then((blocked) => {
                if (isMounted) setMessagingBlocked(blocked);
              })
              .catch(() => {
                if (isMounted) setMessagingBlocked(false);
              });
          }

          return;
        }

        if (!routeConversationId) return;

        const cachedParticipant = directConversations.find((participant: any) => {
          const conv = participant?.conversation;
          return conv?.id === routeConversationId && conv?.conversation_type === 'direct';
        });
        const cachedConversation = cachedParticipant?.conversation;
        const cachedOtherUser = cachedConversation
          ? (cachedConversation.user1_id === user.id ? cachedConversation.user2 : cachedConversation.user1)
          : null;

        if (cachedOtherUser?.id && isMounted) {
          setOtherUser(cachedOtherUser);
          setChatIsLoading(false);
        }

        console.log('[DirectChat] Setting up conversation:', { conversationId: routeConversationId });
        const convo = await fetchConversationById(routeConversationId);
        console.log('[DirectChat] Conversation fetched:', { conversationId: routeConversationId, found: !!convo, conversation: convo ? { id: convo.id, user1_id: convo.user1_id, user2_id: convo.user2_id } : null });

        if (!convo) {
          console.warn('[DirectChat] Conversation not found, redirecting to /chat');
          navigate('/chat');
          return;
        }

        if (isMounted) {
          setConversationId(convo.id);
        }

        // Find the other user
        const other = convo.user1_id === user.id ? convo.user2_id : convo.user1_id;
        await resolveAndSetOtherUser(String(other), isMounted);

        // Block status should not delay header rendering.
        if (user.id && other) {
          void isMessagingBlockedBetweenUsers(user.id, String(other))
            .then((blocked) => {
              if (isMounted) setMessagingBlocked(blocked);
            })
            .catch((blockErr) => {
              console.warn('[DirectChat] Failed to resolve block status:', blockErr);
              if (isMounted) setMessagingBlocked(false);
            });
        } else if (isMounted) {
          setMessagingBlocked(false);
        }
      } catch (err) {
        console.error('[DirectChat] Error fetching conversation:', err);
        const feedback = getLoadErrorFeedback('chat', err);
        toast.error(feedback.title, { description: feedback.description });
        navigate('/chat');
      } finally {
        if (isMounted) {
          setChatIsLoading(false);
        }
      }
    };

    setupConvo();
    return () => {
      isMounted = false;
    };
  }, [routeConversationId, draftUserId, user?.id, navigate, queryClient]);

  const ensureConversationId = async () => {
    if (conversationId) return conversationId;
    const targetUserId = String(otherUser?.id || draftUserId || '');
    if (!targetUserId) {
      throw new Error('Unable to determine recipient.');
    }

    const convo = await createDirectConversation(targetUserId);
    if (!convo?.id) {
      throw new Error('Unable to start conversation.');
    }

    setConversationId(convo.id);
    void queryClient.refetchQueries({ queryKey: ['conversations', user?.id], type: 'all' });
    navigate(`/chat/${convo.id}`, { replace: true });
    return convo.id;
  };

  // Use the centralized ChatPage component
  const {
    headerContent,
    messagesContent,
    footerContent,
    messagesEndRef,
    scrollToBottomButton,
  } = ChatPage({
    conversationId: conversationId || '',
    ensureConversationId,
    headerTitle: String(otherUser?.full_name || otherUser?.username || 'Chat'),
    headerImageUrl: (otherUser?.avatar_url && String(otherUser.avatar_url).trim()) 
      ? String(otherUser.avatar_url) 
      : getDefaultAvatar(String(otherUser?.id || '')),
    headerImageFallback: String(otherUser?.full_name || otherUser?.username || 'U').charAt(0),
    headerActions: otherUser?.id ? (
      <ModerationMenu
        reportType="USER"
        targetId={String(otherUser.id)}
        reportedUserId={String(otherUser.id)}
        targetLabel="User"
        reportLabel="Report User"
        onAfterBlock={() => setMessagingBlocked(true)}
      />
    ) : null,
    onHeaderClick: () => setUserModalOpen(true),
    showBackButton: true,
    onBackClick: () => navigate('/chat?tab=direct'),
    isLoadingHeader: chatIsLoading,
    currentUserId: user?.id,
    showSenderInfo: false,
    canSend: !messagingBlocked,
    blockedMessage: "You cannot send messages to this user.",
    messageReportType: 'DIRECT_CHAT',
    scrollContainerRef,
  });

  const handleDeleteChat = async () => {
    if (!conversationId) return;
    try {
      setIsDeleting(true);
      await deleteDirectConversation(conversationId);
      toast.success("Chat deleted");
      navigate('/chat?tab=direct');
    } catch (err) {
      console.error('Failed to delete direct chat:', err);
      toast.error("Failed to delete chat");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <AppLayout 
      headerContent={headerContent}
      footerContent={footerContent}
      showBottomNav={false}
      focusedFlow={true}
      scrollContainerRef={scrollContainerRef}
    >
      <div className="relative">
        <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-2 space-y-4">
          {messagesContent}
          {messagingBlocked && (
            <p className="text-xs text-muted-foreground text-center -mt-2">
              Messaging is blocked between you and this user.
            </p>
          )}
          <div ref={messagesEndRef} />
        </div>
        {scrollToBottomButton}
      </div>
      <UserQuickActionsModal
        open={userModalOpen}
        onOpenChange={setUserModalOpen}
        user={{
          id: String(otherUser?.id || ''),
          name: String(otherUser?.full_name || otherUser?.username || ''),
          imageUrl: (otherUser?.avatar_url && String(otherUser.avatar_url).trim())
            ? String(otherUser.avatar_url)
            : getDefaultAvatar(String(otherUser?.id || '')),
        }}
        onDeleteChat={conversationId ? () => {
          setUserModalOpen(false);
          setShowDeleteConfirm(true);
        } : undefined}
      />
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This only removes the chat from your list. The other person will still see it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChat}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
