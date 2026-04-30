/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';

export interface Notification {
  id: string;
  user_id: string;
  type:
    | 'join_request'
    | 'message'
    | 'expense'
    | 'trip_update'
    | 'member_joined'
    | 'member_left'
    | 'trip_invite'
    | 'trip_join_request'
    | 'trip_join_approved'
    | 'trip_join_rejected'
    | 'trip_cancelled'
    | 'trip_updated'
    | 'trip_reminder'
    | 'new_message'
    | 'new_expense'
    | 'expense_paid'
    | 'expense_reminder'
    | 'new_follower'
    | 'new_review'
    | 'new_tip'
    | 'trip_published'
    | 'system_announcement'
    | 'achievement_unlocked'
    | 'receipt_submitted'
    | 'receipt_approved'
    | 'receipt_rejected'
    | 'trip_settlement_required'
    | 'story_like'
    | 'story_comment'
    | 'discussion_like'
    | 'discussion_reply'
    | 'discussion_reply_to_you'
    | 'discussion_answer_accepted';
  title: string;
  message: string | null;
  read: boolean;
  action_url: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationFilters {
  type?: Notification['type'];
  read?: boolean;
  limit?: number;
}

/**
 * Fetch notifications for the current user (excludes chat message notifications)
 */
export async function fetchNotifications(filters?: NotificationFilters) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .not('type', 'in', '(new_message,message)')
    .order('created_at', { ascending: false });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.read !== undefined) {
    query = query.eq('read', filters.read);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(50); // Default limit
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Notification[];
}

/**
 * Get unread notification count for the current user (excludes chat message notifications)
 */
export async function fetchUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)
    .not('type', 'in', '(new_message,message)');

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get TOTAL unread rows in notifications, including chat-derived notification rows.
 * Kept for diagnostics and any legacy flows that need the raw table count.
 */
export async function fetchTotalUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) {
    console.error('Error fetching total unread count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get unread chat message notification count for the current user
 */
export async function fetchUnreadChatNotificationCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)
    .in('type', ['new_message', 'message']);

  if (error) {
    console.error('Error fetching unread chat count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

/**
 * Mark multiple notifications as read
 */
export async function markNotificationsAsRead(notificationIds: string[]) {
  const { error } = await supabase.rpc('mark_notifications_read', {
    p_notification_ids: notificationIds
  });

  if (error) throw error;
}

/**
 * Mark all chat notifications for a conversation as read
 * Called when user opens a chat to remove badge count
 */
export async function markChatNotificationsAsReadForConversation(conversationId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Find all unread chat notifications for this conversation
  const { data: notifications, error: fetchError } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', user.id)
    .eq('read', false)
    .in('type', ['new_message', 'message'])
    .filter('metadata->conversation_id', 'eq', `"${conversationId}"`);

  if (fetchError) {
    console.warn('Error fetching chat notifications for conversation:', fetchError);
    return;
  }

  if (!notifications || notifications.length === 0) return;

  // Mark them as read
  try {
    await markNotificationsAsRead(notifications.map(n => n.id));
  } catch (err) {
    console.warn('Error marking chat notifications as read:', err);
  }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsRead() {
  const { error } = await supabase.rpc('mark_all_notifications_read');

  if (error) throw error;
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
}

/**
 * Delete all notifications for the current user
 */
export async function deleteAllNotifications() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id);

  if (error) throw error;
}

/**
 * Subscribe to real-time notification updates
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

/**
 * Fetch the current unread notification count from Supabase and sync it to
 * the app icon badge via the Capacitor badge plugin.
 *
 * The Supabase notifications table is the single source of truth. Use this
 * function after:
 *  - App foreground / resume
 *  - A push notification is received in the foreground
 *  - The notification list is opened
 *  - A notification is marked as read or deleted
 */
export async function syncBadgeWithUnreadCount(): Promise<number> {
  try {
    const [generalCount, chatCount] = await Promise.all([
      fetchUnreadCount(),
      fetchUnreadChatNotificationCount(),
    ]);
    const count = generalCount + chatCount;
    // Dynamic import keeps badge.ts out of the critical path on web/Android.
    const { setBadgeCount } = await import("@/lib/badge");
    await setBadgeCount(count);
    return count;
  } catch (err) {
    console.warn("[badge] syncBadgeWithUnreadCount failed", err);
    return 0;
  }
}

/**
 * Reset the app icon badge to zero.
 * Call this on logout or after the user marks all notifications as read.
 */
export async function resetBadgeCount(): Promise<void> {
  try {
    const { clearBadgeCount } = await import("@/lib/badge");
    await clearBadgeCount();
  } catch (err) {
    console.warn("[badge] resetBadgeCount failed", err);
  }
}

/**
 * Send a notification (for testing or admin purposes)
 */
export async function sendNotification(
  userId: string,
  type: Notification['type'],
  title: string,
  message?: string,
  actionUrl?: string
) {
  const { data, error } = await supabase.rpc('send_notification', {
    p_user_id: userId,
    p_type: type,
    p_title: title,
    p_message: message || null,
    p_action_url: actionUrl || null
  });

  if (error) throw error;
  return data;
}
