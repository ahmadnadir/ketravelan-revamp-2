import { supabase } from './supabase';

export async function fetchLastMessageForConversation(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles(id, username, full_name, avatar_url)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}
