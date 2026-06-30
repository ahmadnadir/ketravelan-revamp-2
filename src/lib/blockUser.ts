import { supabase } from '@/lib/supabase';

type PostgrestErrorLike = {
  code?: string;
  message?: string;
  details?: string;
};

function isDuplicateBlockError(err: unknown): boolean {
  const e = err as PostgrestErrorLike | null;
  const message = String(e?.message || '').toLowerCase();
  return e?.code === '23505' || message.includes('duplicate key') || message.includes('unique constraint');
}

function isMissingColumnForLegacyShape(err: unknown): boolean {
  const e = err as PostgrestErrorLike | null;
  const message = String(e?.message || '').toLowerCase();
  return e?.code === 'PGRST204' || e?.code === '42703' || message.includes('column') || message.includes('schema cache');
}

function isMissingRpcFunction(err: unknown): boolean {
  const e = err as PostgrestErrorLike | null;
  const message = String(e?.message || '').toLowerCase();
  return e?.code === '42883' || e?.code === 'PGRST202' || message.includes('function') || message.includes('is_user_blocked');
}

/**
 * Block a user - prevents their content from appearing to the blocking user
 */
export async function blockUser(blockedUserId: string, reason?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  if (!blockedUserId) throw new Error('Invalid user to block');

  const primary = await supabase
    .from('blocked_users')
    .upsert(
      {
        user_id: user.id,
        blocked_user_id: blockedUserId,
        reason: reason || 'User blocked',
      },
      {
        onConflict: 'user_id,blocked_user_id',
        ignoreDuplicates: true,
      }
    );

  if (!primary.error) return;
  if (isDuplicateBlockError(primary.error)) return;

  // Backward-compat fallback for environments that still use blocker_user_id naming.
  if (isMissingColumnForLegacyShape(primary.error)) {
    const fallback = await supabase
      .from('blocked_users')
      .upsert(
        {
          blocker_user_id: user.id,
          blocked_user_id: blockedUserId,
        },
        {
          onConflict: 'blocker_user_id,blocked_user_id',
          ignoreDuplicates: true,
        }
      );

    if (!fallback.error || isDuplicateBlockError(fallback.error)) {
      return;
    }

    console.error('Block user error (fallback):', fallback.error);
    throw fallback.error;
  }

  console.error('Block user error:', primary.error);
  throw primary.error;
}

/**
 * Unblock a previously blocked user
 */
export async function unblockUser(blockedUserId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('user_id', user.id)
    .eq('blocked_user_id', blockedUserId);

  if (error) {
    console.error('Unblock user error:', error);
    throw error;
  }
}

/**
 * Check if current user has blocked a specific user
 */
export async function isUserBlocked(userId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const primary = await supabase
    .from('blocked_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('blocked_user_id', userId)
    .limit(1);

  if (!primary.error) {
    return (primary.data || []).length > 0;
  }

  if (isMissingColumnForLegacyShape(primary.error)) {
    const fallback = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_user_id', user.id)
      .eq('blocked_user_id', userId)
      .limit(1);

    if (!fallback.error) {
      return (fallback.data || []).length > 0;
    }

    console.error('Error checking block status (fallback):', fallback.error);
    return false;
  }

  console.error('Error checking block status:', primary.error);
  return false;
}

/**
 * Returns true if blockerId has blocked blockedId.
 */
export async function isBlockedByUser(blockerId: string, blockedId: string): Promise<boolean> {
  const rpc = await supabase.rpc('is_user_blocked', {
    p_blocker_id: blockerId,
    p_blocked_id: blockedId,
  });

  if (!rpc.error) {
    return Boolean(rpc.data);
  }

  // Fallback path for environments where the RPC function is missing.
  if (!isMissingRpcFunction(rpc.error)) {
    console.error('Error checking blocker relationship via RPC:', rpc.error);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== blockerId) {
    return false;
  }

  const primary = await supabase
    .from('blocked_users')
    .select('id')
    .eq('user_id', blockerId)
    .eq('blocked_user_id', blockedId)
    .limit(1);

  if (!primary.error) {
    return (primary.data || []).length > 0;
  }

  if (isMissingColumnForLegacyShape(primary.error)) {
    const fallback = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_user_id', blockerId)
      .eq('blocked_user_id', blockedId)
      .limit(1);

    if (!fallback.error) {
      return (fallback.data || []).length > 0;
    }

    console.error('Error checking blocker relationship (fallback):', fallback.error);
    return false;
  }

  console.error('Error checking blocker relationship:', primary.error);
  return false;
}

/**
 * Get list of users blocked by current user
 */
export async function getBlockedUsers(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const primary = await supabase
    .from('blocked_users')
    .select('blocked_user_id')
    .eq('user_id', user.id);

  if (!primary.error) {
    return (primary.data || []).map(row => row.blocked_user_id);
  }

  if (isMissingColumnForLegacyShape(primary.error)) {
    const fallback = await supabase
      .from('blocked_users')
      .select('blocked_user_id')
      .eq('blocker_user_id', user.id);

    if (!fallback.error) {
      return (fallback.data || []).map(row => row.blocked_user_id);
    }

    console.error('Error fetching blocked users (fallback):', fallback.error);
    return [];
  }

  console.error('Error fetching blocked users:', primary.error);
  return [];
}

/**
 * Filter content to exclude blocked users
 * Use this when fetching user-generated content
 */
export async function filterBlockedUsers<T extends { author_id?: string; sender_id?: string }>(
  items: T[]
): Promise<T[]> {
  const blockedUserIds = await getBlockedUsers();
  const blockedSet = new Set(blockedUserIds);

  return items.filter(item => {
    const authorId = item.author_id || item.sender_id;
    return !blockedSet.has(authorId);
  });
}

/**
 * Returns true when either user has blocked the other user.
 */
export async function isMessagingBlockedBetweenUsers(userA: string, userB: string): Promise<boolean> {
  const [aBlockedB, bBlockedA] = await Promise.all([
    isBlockedByUser(userA, userB),
    isBlockedByUser(userB, userA),
  ]);

  if (aBlockedB || bBlockedA) {
    return true;
  }

  // Last-resort fallback for environments without RPC support.
  const primary = await supabase
    .from('blocked_users')
    .select('id')
    .or(`and(user_id.eq.${userA},blocked_user_id.eq.${userB}),and(user_id.eq.${userB},blocked_user_id.eq.${userA})`)
    .limit(1);

  if (!primary.error) {
    return (primary.data || []).length > 0;
  }

  if (isMissingColumnForLegacyShape(primary.error)) {
    const fallback = await supabase
      .from('blocked_users')
      .select('id')
      .or(`and(blocker_user_id.eq.${userA},blocked_user_id.eq.${userB}),and(blocker_user_id.eq.${userB},blocked_user_id.eq.${userA})`)
      .limit(1);

    if (!fallback.error) {
      return (fallback.data || []).length > 0;
    }

    console.error('Error checking messaging block state (fallback):', fallback.error);
    return false;
  }

  console.error('Error checking messaging block state:', primary.error);
  return false;
}
