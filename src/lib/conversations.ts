/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';
import { isMessagingBlockedBetweenUsers } from '@/lib/blockUser';
import { getBlockedRelationshipUserIds } from '@/lib/moderation';

// Module-level profile cache shared across all fetches and subscriptions.
// Populated eagerly from conversations list so chat never needs a fresh profile fetch.
export const profileCache = new Map<string, { id: string; username: string; full_name: string; avatar_url: string }>();

let blockedIdsCache: { ids: Set<string>; expiresAt: number } | null = null;

async function getBlockedIdsCached(enabled: boolean): Promise<Set<string>> {
  if (!enabled) return new Set<string>();

  const now = Date.now();
  if (blockedIdsCache && blockedIdsCache.expiresAt > now) {
    return blockedIdsCache.ids;
  }

  const ids = new Set(await getBlockedRelationshipUserIds());
  blockedIdsCache = {
    ids,
    expiresAt: now + 30000,
  };
  return ids;
}

function isVisibleConversation(participant: any) {
  const conv = participant?.conversation;
  if (!conv || conv.is_deleted) return false;

  // Hide trip-group chats when the linked trip has been permanently deleted.
  if (conv.conversation_type === 'trip_group' && !conv.trip) {
    return false;
  }

  return true;
}

export type ChatAttachment = {
  type: 'image' | 'document' | 'location';
  url?: string; // for image/document
  name?: string;
  mime?: string;
  size?: number;
  lat?: number; // for location
  lng?: number;
  address?: string;
};

const MESSAGE_ACTION_WINDOW_MS = 60 * 1000;

function isWithinMessageActionWindow(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return Date.now() - created <= MESSAGE_ACTION_WINDOW_MS;
}

// Fetch conversation by its ID (primary key)
export async function fetchConversationById(conversationId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Fetch conversation with participants and trip details for TripHub
export async function fetchConversationWithTripDetails(conversationId: string) {
  // Fetch conversation with participants
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select(`
      id,
      trip_id,
      conversation_type,
      created_at,
      is_deleted,
      conversation_participants(
        id,
        user_id,
        last_read_at,
        is_admin,
        user:profiles(id, username, full_name, avatar_url)
      )
    `)
    .eq('id', conversationId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (convError) throw convError;
  if (!conv) return null;

  // If conversation has trip_id, fetch trip details
  let tripData = null;
  if (conv.trip_id) {
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, title, destination, cover_image, start_date, end_date, status, creator_id')
      .eq('id', conv.trip_id)
      .maybeSingle();
    
    if (!tripError && trip) {
      tripData = trip;
    }
  }

  // Process participants
  const participants = conv.conversation_participants?.map((p: any) => ({
    id: p.user.id,
    name: p.user.full_name || p.user.username,
    avatar: p.user.avatar_url || `https://ui-avatars.com/api/?name=${p.user.full_name || 'User'}`,
    role: p.is_admin ? 'Admin' : 'Member'
  })) || [];

  return {
    conversation: conv,
    trip: tripData,
    members: participants
  };
}

export async function fetchTripConversation(tripId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, trip_id, conversation_type, created_at')
    .eq('trip_id', tripId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createTripConversation(tripId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // First check if conversation already exists
  const existing = await fetchTripConversation(tripId);
  if (existing) {
    return existing;
  }

  // Get trip members
  const { data: tripMembers, error: membersError } = await supabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .is('left_at', null);

  if (membersError) throw membersError;

  // Create conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      trip_id: tripId,
      conversation_type: 'trip_group',
      name: `Trip Group Chat`
    })
    .select()
    .single();

  if (convError) throw convError;

  // Add all trip members as participants
  const memberIds = tripMembers?.map(m => m.user_id) || [];
  if (memberIds.length > 0) {
    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert(
        memberIds.map(userId => ({
          conversation_id: conversation.id,
          user_id: userId,
          is_admin: userId === user.id
        }))
      );

    if (participantsError) throw participantsError;
  }

  // Fetch and return the created conversation with participants
  return await fetchTripConversation(tripId);
}

export async function fetchConversationMessages(conversationId: string, limit = 50) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      attachments,
      is_edited,
      edited_at,
      created_at,
      client_id,
      type,
      sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  const blockedUserIds = await getBlockedIdsCached(Boolean(user));
  const result = (data || [])
    .filter((message: any) => !message.sender_id || !blockedUserIds.has(message.sender_id))
    .reverse();
  // Populate module-level profile cache from inline sender data
  result.forEach((msg: any) => {
    const s = Array.isArray(msg.sender) ? msg.sender[0] : msg.sender;
    if (s?.id) profileCache.set(s.id, s);
  });
  return result;
}

export async function fetchConversationMessagesAfter(conversationId: string, afterCreatedAt: string, limit = 100) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      attachments,
      is_edited,
      edited_at,
      created_at,
      client_id,
      type,
      sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url)
    `)
    .eq('conversation_id', conversationId)
    .gt('created_at', afterCreatedAt)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;

  const blockedUserIds = await getBlockedIdsCached(Boolean(user));
  const result = (data || []).filter((message: any) => !message.sender_id || !blockedUserIds.has(message.sender_id));

  result.forEach((msg: any) => {
    const s = Array.isArray(msg.sender) ? msg.sender[0] : msg.sender;
    if (s?.id) profileCache.set(s.id, s);
  });

  return result;
}

export async function sendMessage(conversationId: string, content: string, clientId?: string, attachments?: ChatAttachment[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Enforce block behavior for direct chats: if either side blocked, stop sending.
  const { data: convo, error: convoErr } = await supabase
    .from('conversations')
    .select('conversation_type, user1_id, user2_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (convoErr) throw convoErr;

  if (convo?.conversation_type === 'direct') {
    const otherUserId = convo.user1_id === user.id ? convo.user2_id : convo.user1_id;
    if (otherUserId) {
      const blocked = await isMessagingBlockedBetweenUsers(user.id, otherUserId);
      if (blocked) {
        throw new Error('You cannot send messages to this user.');
      }
    }
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      client_id: clientId,
      attachments: attachments || [],
      type: 'user'
    })
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function editOwnMessage(messageId: string, newContent: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing, error: readError } = await supabase
    .from('messages')
    .select('id, sender_id, created_at')
    .eq('id', messageId)
    .maybeSingle();

  if (readError) throw readError;
  if (!existing) throw new Error('Message not found');
  if (existing.sender_id !== user.id) throw new Error('You can only edit your own message');
  if (!isWithinMessageActionWindow(existing.created_at)) {
    throw new Error('Message actions are only available within 1 minute');
  }

  const { data, error } = await supabase
    .from('messages')
    .update({
      content: newContent,
      is_edited: true,
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .eq('sender_id', user.id)
    .select('id, content, is_edited, edited_at')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function unsendOwnMessage(messageId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing, error: readError } = await supabase
    .from('messages')
    .select('id, sender_id, created_at')
    .eq('id', messageId)
    .maybeSingle();

  if (readError) throw readError;
  if (!existing) throw new Error('Message not found');
  if (existing.sender_id !== user.id) throw new Error('You can only unsend your own message');
  if (!isWithinMessageActionWindow(existing.created_at)) {
    throw new Error('Message actions are only available within 1 minute');
  }

  const { data, error } = await supabase
    .from('messages')
    .update({
      content: 'This message was unsent',
      attachments: [],
      is_edited: false,
      edited_at: null,
    })
    .eq('id', messageId)
    .eq('sender_id', user.id)
    .select('id, content, attachments, is_edited, edited_at')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteOwnMessage(messageId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing, error: readError } = await supabase
    .from('messages')
    .select('id, sender_id, created_at')
    .eq('id', messageId)
    .maybeSingle();

  if (readError) throw readError;
  if (!existing) throw new Error('Message not found');
  if (existing.sender_id !== user.id) throw new Error('You can only delete your own message');
  if (!isWithinMessageActionWindow(existing.created_at)) {
    throw new Error('Message actions are only available within 1 minute');
  }

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)
    .eq('sender_id', user.id);

  if (error) throw error;
}

export async function updateLastRead(conversationId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function deleteDirectConversation(conversationId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: convo, error: convoError } = await supabase
    .from('conversations')
    .select('id, conversation_type, is_deleted, user1_id, user2_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (convoError) {
    console.error('Error fetching conversation:', convoError);
    throw convoError;
  }
  if (!convo) throw new Error('Conversation not found');
  if (convo.conversation_type !== 'direct') {
    throw new Error('Only direct conversations can be deleted');
  }

  console.log('Deleting conversation:', { conversationId, currentUser: user.id, convo });

  // Soft delete: mark conversation as deleted instead of hard deleting
  const { data: updateData, error: updateError } = await supabase
    .from('conversations')
    .update({ is_deleted: true })
    .eq('id', conversationId)
    .select();

  console.log('Update response:', { data: updateData, error: updateError });

  if (updateError) {
    console.error('Failed to soft delete conversation:', updateError);
    throw updateError;
  }
}

export async function subscribeToMessages(conversationId: string, callback: (message: any) => void) {
  const { data: { user } } = await supabase.auth.getUser();
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      async (payload) => {
        const raw = payload.new as any;
        if (user && raw.sender_id) {
          const blockedUserIds = await getBlockedIdsCached(true);
          if (blockedUserIds.has(raw.sender_id)) {
            return;
          }
        }

        // Use only in-memory profile cache here to avoid per-message DB lookups.
        const sender = profileCache.get(raw.sender_id) ?? null;

        callback({ ...raw, sender });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function fetchDirectConversation(otherUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Always order user IDs to match DB constraint
  const [user1_id, user2_id] = [user.id, otherUserId].sort();

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('conversation_type', 'direct')
    .eq('user1_id', user1_id)
    .eq('user2_id', user2_id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createDirectConversation(otherUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Always order user IDs to match DB constraint
  const [user1_id, user2_id] = [user.id, otherUserId].sort();

  // Check if active (non-deleted) conversation exists
  const { data: existingConvo, error: checkError } = await supabase
    .from('conversations')
    .select('*')
    .eq('conversation_type', 'direct')
    .eq('user1_id', user1_id)
    .eq('user2_id', user2_id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (checkError) throw checkError;

  // If active conversation exists, return it
  if (existingConvo) {
    return existingConvo;
  }

  // If no active conversation exists (either deleted or never created), create a new one
  // This gives a fresh start each time you chat with someone after deleting
  const { data: newConvo, error: createError } = await supabase
    .from('conversations')
    .insert({
      conversation_type: 'direct',
      user1_id,
      user2_id,
      created_by: user.id,
      is_deleted: false
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating new conversation:', createError);
    throw createError;
  }

  // Ensure both users are in conversation_participants
  const { error: participantError } = await supabase.from('conversation_participants').insert([
    { conversation_id: newConvo.id, user_id: user1_id },
    { conversation_id: newConvo.id, user_id: user2_id }
  ]);

  if (participantError) {
    console.warn('Could not insert conversation participants (trigger may have handled it):', participantError);
  }

  return newConvo;
}

export async function fetchUserConversations() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('conversation_participants')
    .select(`
      id,
      user_id,
      last_read_at,
      is_admin,
      created_at,
      conversation:conversations(
        id,
        conversation_type,
        name,
        trip_id,
        user1_id,
        user2_id,
        is_deleted,
        trip:trips(id, title, cover_image, status),
        user1:profiles!conversations_user1_id_fkey(id, username, full_name, avatar_url),
        user2:profiles!conversations_user2_id_fkey(id, username, full_name, avatar_url)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return data?.filter(isVisibleConversation) || [];
}

export async function fetchConversationsWithLastMessages() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: rows, error } = await supabase.rpc('get_chat_conversation_summaries', {
    p_user_id: user.id,
  });

  if (error) {
    const rpcError = error as { code?: string; status?: number; message?: string; details?: string; hint?: string };
    const maybeCode = rpcError?.code;
    const maybeStatus = rpcError?.status;
    const errorText = `${rpcError?.message || ''} ${rpcError?.details || ''} ${rpcError?.hint || ''}`.toLowerCase();
    const isMissingRpc =
      maybeCode === 'PGRST202' ||
      maybeStatus === 404 ||
      maybeCode === '404' ||
      errorText.includes('get_chat_conversation_summaries') ||
      errorText.includes('schema cache');

    // Backward-compatible fallback when migration hasn't been applied yet or schema cache is stale.
    if (isMissingRpc) {
      console.warn('[chat] summary RPC unavailable, falling back to legacy query path');
      return fetchConversationsWithLastMessagesLegacy(user.id);
    }
    console.error('Conversation summary fetch error:', error);
    throw error;
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const participants = rows.map((row: any) => {
    const conversation = {
      id: row.conversation_id,
      conversation_type: row.conversation_type,
      name: row.conversation_name,
      trip_id: row.trip_id,
      user1_id: row.conversation_user1_id,
      user2_id: row.conversation_user2_id,
      is_deleted: row.conversation_is_deleted,
      created_at: row.conversation_created_at,
      trip: row.trip,
      user1: row.user1,
      user2: row.user2,
    };

    const lastMessage = row.last_message_id
      ? {
          id: row.last_message_id,
          conversation_id: row.conversation_id,
          sender_id: row.last_message_sender_id,
          content: row.last_message_content,
          attachments: Array.isArray(row.last_message_attachments) ? row.last_message_attachments : [],
          created_at: row.last_message_created_at,
          type: row.last_message_type,
          sender: row.last_message_sender,
        }
      : null;

    return {
      id: row.participant_id,
      user_id: row.user_id,
      last_read_at: row.last_read_at,
      is_admin: row.is_admin,
      created_at: row.participant_created_at,
      conversation,
      lastMessage,
      unreadCount: Number(row.unread_count || 0),
    };
  });

  participants.forEach((p: any) => {
    const conv = p.conversation;
    [conv?.user1, conv?.user2, p.lastMessage?.sender].forEach((profile: any) => {
      if (profile?.id) profileCache.set(profile.id, profile);
    });
  });

  return participants.filter(isVisibleConversation);
}

async function fetchConversationsWithLastMessagesLegacy(userId: string) {
  const { data: participants, error: convError } = await supabase
    .from('conversation_participants')
    .select(`
      id,
      user_id,
      last_read_at,
      is_admin,
      created_at,
      conversation:conversations(
        id,
        conversation_type,
        name,
        trip_id,
        user1_id,
        user2_id,
        is_deleted,
        trip:trips(id, title, cover_image, status),
        user1:profiles!conversations_user1_id_fkey(id, username, full_name, avatar_url),
        user2:profiles!conversations_user2_id_fkey(id, username, full_name, avatar_url)
      )
    `)
    .eq('user_id', userId)
    .eq('conversation.is_deleted', false)
    .order('created_at', { ascending: false });

  if (convError) {
    console.error('Legacy conversation fetch error:', convError);
    throw convError;
  }

  participants?.forEach((p: any) => {
    const conv = Array.isArray(p.conversation) ? p.conversation[0] : p.conversation;
    if (!conv) return;
    [conv.user1, conv.user2].forEach((u: any) => {
      const profile = Array.isArray(u) ? u[0] : u;
      if (profile?.id) profileCache.set(profile.id, profile);
    });
  });

  const activeParticipants = participants?.filter(isVisibleConversation) || [];
  if (!activeParticipants.length) return [];

  const seenConversationIds = new Set<string>();
  const uniqueParticipants = activeParticipants.filter((p: any) => {
    const conv = Array.isArray(p.conversation) ? p.conversation[0] : p.conversation;
    const convId = conv?.id;
    if (!convId || seenConversationIds.has(convId)) return false;
    seenConversationIds.add(convId);
    return true;
  });

  const conversationIds = uniqueParticipants
    .map((p: any) => {
      const conv = Array.isArray(p.conversation) ? p.conversation[0] : p.conversation;
      return conv?.id;
    })
    .filter(Boolean);

  if (conversationIds.length === 0) {
    return uniqueParticipants.map((p: any) => ({
      ...p,
      conversation: Array.isArray(p.conversation) ? p.conversation[0] : p.conversation,
      lastMessage: null,
      unreadCount: 0,
    }));
  }

  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, attachments, created_at, type, sender:profiles(id, username, full_name, avatar_url)')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false });

  if (msgError) {
    console.error('Legacy messages fetch error:', msgError);
    throw msgError;
  }

  const lastMessageMap = new Map<string, any>();
  const unreadCountMap = new Map<string, number>();
  const lastReadMap = new Map<string, string | null>();

  uniqueParticipants.forEach((p: any) => {
    const conv = Array.isArray(p.conversation) ? p.conversation[0] : p.conversation;
    if (conv?.id) lastReadMap.set(conv.id, p.last_read_at || null);
  });

  (messages || []).forEach((msg: any) => {
    const convId = msg.conversation_id;
    if (!lastMessageMap.has(convId)) {
      lastMessageMap.set(convId, msg);
    }
    if (msg.sender_id !== userId) {
      const lastRead = lastReadMap.get(convId);
      const isUnread = !lastRead || new Date(msg.created_at) > new Date(lastRead);
      if (isUnread) {
        unreadCountMap.set(convId, (unreadCountMap.get(convId) || 0) + 1);
      }
    }
  });

  const enriched = uniqueParticipants.map((p: any) => {
    const conv = Array.isArray(p.conversation) ? p.conversation[0] : p.conversation;
    return {
      ...p,
      conversation: conv,
      lastMessage: lastMessageMap.get(conv?.id) || null,
      unreadCount: unreadCountMap.get(conv?.id) || 0,
    };
  });

  return enriched.sort((a: any, b: any) => {
    const aTime = a.lastMessage?.created_at
      ? new Date(a.lastMessage.created_at).getTime()
      : new Date(a.created_at ?? a.conversation?.created_at ?? 0).getTime();
    const bTime = b.lastMessage?.created_at
      ? new Date(b.lastMessage.created_at).getTime()
      : new Date(b.created_at ?? b.conversation?.created_at ?? 0).getTime();
    return bTime - aTime;
  });
}
