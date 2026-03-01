import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChatPage } from "@/components/chat/ChatPage";
import { useState, useEffect } from "react";
import { deleteDirectConversation, fetchConversationById } from "@/lib/conversations";
import { supabase } from "@/lib/supabase";
import { UserQuickActionsModal } from "@/components/chat/UserQuickActionsModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const getDefaultAvatar = (userId: string) => {
  const timestamp = Date.now();
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}&t=${timestamp}`;
};

export default function DirectChat() {
  const { id: conversationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [otherUser, setOtherUser] = useState<Record<string, unknown> | null>(null);
  const [chatIsLoading, setChatIsLoading] = useState(true);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch conversation and other user info
  useEffect(() => {
    if (!conversationId) return;

    const setupConvo = async () => {
      try {
        console.log('[DirectChat] Setting up conversation:', { conversationId });
        setChatIsLoading(true);
        const convo = await fetchConversationById(conversationId);
        console.log('[DirectChat] Conversation fetched:', { conversationId, found: !!convo, conversation: convo ? { id: convo.id, user1_id: convo.user1_id, user2_id: convo.user2_id } : null });
        
        if (!convo) {
          console.warn('[DirectChat] Conversation not found, redirecting to /chat');
          navigate('/chat');
          return;
        }

        // Find the other user
        const other = convo.user1_id === user?.id ? convo.user2_id : convo.user1_id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .eq('id', other)
          .maybeSingle();
        console.log('[DirectChat] Other user profile loaded:', { userId: other, found: !!profile });
        setOtherUser(profile || { id: other, full_name: '' });
      } catch (err) {
        console.error('[DirectChat] Error fetching conversation:', err);
        navigate('/chat');
      } finally {
        setChatIsLoading(false);
      }
    };

    setupConvo();
  }, [conversationId, user?.id, navigate]);

  // Use the centralized ChatPage component
  const {
    headerContent,
    messagesContent,
    footerContent,
    messagesEndRef,
  } = ChatPage({
    conversationId: conversationId || '',
    headerTitle: String(otherUser?.full_name || otherUser?.username || 'Chat'),
    headerImageUrl: (otherUser?.avatar_url && String(otherUser.avatar_url).trim()) 
      ? String(otherUser.avatar_url) 
      : getDefaultAvatar(String(otherUser?.id || '')),
    headerImageFallback: String(otherUser?.full_name || otherUser?.username || 'U').charAt(0),
    onHeaderClick: () => setUserModalOpen(true),
    showBackButton: true,
    onBackClick: () => navigate('/chat?tab=direct'),
    isLoadingHeader: chatIsLoading,
    currentUserId: user?.id,
    showSenderInfo: false,
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
    >
      <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {messagesContent}
        <div ref={messagesEndRef} />
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
        onDeleteChat={() => {
          setUserModalOpen(false);
          setShowDeleteConfirm(true);
        }}
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
