import { supabase } from '@/lib/supabase';

export type AccountStatus = 'all' | 'active' | 'suspended' | 'deleted';
export type UserRoleFilter = 'all' | 'traveler' | 'agent';
export type UserSort = 'joined_desc' | 'joined_asc' | 'name_asc' | 'name_desc' | 'active_desc';
export type UserAction = 'suspend' | 'restore';

export interface AdminUser {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  role: 'traveler' | 'agent' | string;
  is_deleted: boolean;
  account_status: 'active' | 'suspended' | 'deleted';
  last_active_at: string | null;
  created_at: string;
  trips_organized: number;
  trips_joined: number;
  email_confirmed: boolean;
}

export interface AdminUserDetails extends AdminUser {
  bio: string | null;
  location: string | null;
  phone: string | null;
  updated_at: string | null;
  suspension_reason: string | null;
  countries_visited: number | null;
  profile_views: number | null;
  reports_received: number;
  reports_submitted: number;
  user_reports_submitted: number;
  moderation_actions: Array<{ action_type: string; reason: string | null; created_at: string }>;
  blocked_by_count: number;
  blocks_count: number;
  recent_trips: Array<{
    id: string;
    title: string;
    destination: string;
    status: string;
    created_at: string;
    relationship: 'organized' | 'joined';
  }>;
}

export interface UserQuery {
  search: string;
  status: AccountStatus;
  role: UserRoleFilter;
  sort: UserSort;
  limit: number;
  offset: number;
}

export async function listAdminUsers(query: UserQuery): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_search: query.search.trim() || null,
    p_status: query.status,
    p_role: query.role,
    p_sort: query.sort,
    p_limit: query.limit,
    p_offset: query.offset,
  });
  if (error) throw error;
  return (data ?? []) as AdminUser[];
}

export async function countAdminUsers(query: Pick<UserQuery, 'search' | 'status' | 'role'>): Promise<number> {
  const { data, error } = await supabase.rpc('admin_count_users', {
    p_search: query.search.trim() || null,
    p_status: query.status,
    p_role: query.role,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function getAdminUser(userId: string): Promise<AdminUserDetails | null> {
  const { data, error } = await supabase.rpc('admin_get_user', { p_user_id: userId });
  if (error) throw error;
  return (data as AdminUserDetails | null) ?? null;
}

export async function performAdminUserAction(
  userId: string,
  action: UserAction,
  reason?: string,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-manage-user', {
    body: { userId, action, reason: reason?.trim() || undefined },
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
}
