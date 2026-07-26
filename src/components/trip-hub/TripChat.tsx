import { useState } from "react";
import { ChatPage } from "@/components/chat/ChatPage";
import { useAuth } from "@/contexts/AuthContext";
import type { TripMember } from "@/components/chat/ChatComposer";

interface TripChatProps {
  conversationId: string;
  tripTitle?: string;
  tripImageUrl?: string;
  onHeaderClick?: () => void;
  tripId?: string;
  tripMembers?: TripMember[];
}

export function TripChat({ conversationId, tripTitle = "Group Chat", tripImageUrl, onHeaderClick, tripId, tripMembers = [] }: TripChatProps) {
  const { user } = useAuth();

  const {
    messagesContent,
    messagesEndRef,
    footerContent,
  } = ChatPage({
    conversationId,
    headerTitle: tripTitle,
    headerImageUrl: tripImageUrl,
    headerImageFallback: tripTitle.charAt(0),
    onHeaderClick,
    showBackButton: false,
    currentUserId: user?.id,
    tripId,
    tripMembers,
  });

  return (
    <div className="w-full pt-0 pb-2 sm:pb-3 space-y-2">
      {messagesContent}
      <div ref={messagesEndRef} />
    </div>
  );
}
