/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';

// Module-level profile cache shared across all fetches and subscriptions.
// Populated eagerly from conversations list so chat never needs a fresh profile fetch.
export const profileCache = new Map<string, { id: string; username: string; full_name: string; avatar_url: string }>();

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
    .eq('conversation_type', 'trip_group')
    .eq('is_deleted', false)
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
  const result = data?.reverse() || [];
  // Populate module-level profile cache from inline sender data
  result.forEach((msg: any) => {
    const s = Array.isArray(msg.sender) ? msg.sender[0] : msg.sender;
    if (s?.id) profileCache.set(s.id, s);
  });
  return result;
}

export async function sendMessage(conversationId: string, content: string, clientId?: string, attachments?: ChatAttachment[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

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

        // Use cached profile or fetch once, then cache
        let sender = profileCache.get(raw.sender_id) ?? null;
        if (!sender && raw.sender_id && raw.type !== 'system') {
          const { data } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', raw.sender_id)
            .single();
          if (data) {
            profileCache.set(raw.sender_id, data);
            sender = data;
          }
        }

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
        trip:trips(id, title, cover_image),
        user1:profiles!conversations_user1_id_fkey(id, username, full_name, avatar_url),
        user2:profiles!conversations_user2_id_fkey(id, username, full_name, avatar_url)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  // Filter out deleted conversations in app code
  return data?.filter((d: any) => !d.conversation?.is_deleted) || [];
}

export async function fetchConversationsWithLastMessages() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch conversations
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
        trip:trips(id, title, cover_image),
        user1:profiles!conversations_user1_id_fkey(id, username, full_name, avatar_url),
        user2:profiles!conversations_user2_id_fkey(id, username, full_name, avatar_url)
      )
    `)
    .eq('user_id', user.id)
    .eq('conversation.is_deleted', false)
    .order('created_at', { ascending: false });

  if (convError) {
    console.error('Conversation fetch error:', convError);
    throw convError;
  }
  
  // Populate profile cache eagerly from participant data (user1 / user2 for direct chats)
  participants?.forEach((p: any) => {
    const conv = Array.isArray(p.conversation) ? p.conversation[0] : p.conversation;
    if (!conv) return;
    [conv.user1, conv.user2].forEach((u: any) => {
      const profile = Array.isArray(u) ? u[0] : u;
      if (profile?.id) profileCache.set(profile.id, profile);
    });
  });

  // Filter out deleted conversations in app code
  const activeParticipants = participants?.filter((p: any) => !p.conversation?.is_deleted) || [];
  
  if (!activeParticipants || activeParticipants.length === 0) {
    console.log('No participants found for user:', user.id);
    return [];
  }

  // Deduplicate conversations by ID (since each conversation appears once per participant)
  const seenConversationIds = new Set<string>();
  const uniqueParticipants = activeParticipants.filter((p: any) => {
    const convId = p.conversation?.id;
    if (seenConversationIds.has(convId)) {
      return false;
    }
    seenConversationIds.add(convId);
    return true;
  });

  // Fetch last messages for all conversations in a single query
  const conversationIds = uniqueParticipants
    .map((p: any) => Array.isArray(p.conversation) ? p.conversation[0]?.id : p.conversation?.id)
    .filter(Boolean);
    
  if (conversationIds.length === 0) {
    console.log('No conversation IDs found');
    return uniqueParticipants.map(p => ({
      ...p,
      conversation: Array.isArray(p.conversation) ? p.conversation[0] : p.conversation,
      lastMessage: null
    }));
  }

  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, attachments, created_at, sender:profiles(id, full_name)')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false });

  if (msgError) {
    console.error('Messages fetch error:', msgError);
    throw msgError;
  }

  // Group messages by conversation: last message + unread count per conversation
  const lastMessageMap = new Map();
  const unreadCountMap = new Map<string, number>();

  // Build last_read_at lookup per conversation for the current user
  const lastReadMap = new Map<string, string | null>();
  uniqueParticipants.forEach((p: any) => {
    const conv = Array.isArray(p.conversation) ? p.conversation[0] : p.conversation;
    if (conv?.id) lastReadMap.set(conv.id, p.last_read_at || null);
  });

  (messages || []).forEach((msg: any) => {
    const convId = msg.conversation_id;
    // Last message (first encountered since desc order)
    if (!lastMessageMap.has(convId)) {
      lastMessageMap.set(convId, msg);
    }
    // Count unread: sender is not current user AND message is after last_read_at
    if (msg.sender_id !== user.id) {
      const lastRead = lastReadMap.get(convId);
      const isUnread = !lastRead || new Date(msg.created_at) > new Date(lastRead);
      if (isUnread) {
        unreadCountMap.set(convId, (unreadCountMap.get(convId) || 0) + 1);
      }
    }
  });

  // Attach last message to each participant and sort by latest message desc
  const enriched = uniqueParticipants.map(p => {
    const conv = Array.isArray(p.conversation) ? p.conversation[0] : p.conversation;
    return {
      ...p,
      conversation: conv,
      lastMessage: lastMessageMap.get(conv?.id) || null,
      unreadCount: unreadCountMap.get(conv?.id) || 0,
    };
  });

  return enriched.sort((a: any, b: any) => {
    // Primary: latest message timestamp.
    // Fallback: participant.created_at — the moment THIS user joined the conversation.
    // This ensures newly created or newly joined trip groups appear at the top
    // before any messages exist, without relying on conversation.created_at which
    // reflects when the trip was published (potentially weeks ago).
    const aTime = a.lastMessage?.created_at
      ? new Date(a.lastMessage.created_at).getTime()
      : new Date(a.created_at ?? a.conversation?.created_at ?? 0).getTime();
    const bTime = b.lastMessage?.created_at
      ? new Date(b.lastMessage.created_at).getTime()
      : new Date(b.created_at ?? b.conversation?.created_at ?? 0).getTime();
    return bTime - aTime;
  });
}
