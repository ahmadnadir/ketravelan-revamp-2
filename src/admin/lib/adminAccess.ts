import { supabase } from '@/lib/supabase';

export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT', 'FINANCE'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const formatAdminRole = (role: AdminRole | null) => {
  if (!role) return "—";

  if (role === "SUPER_ADMIN") {
    return "SUPERADMIN";
  }

  return role;
};

export const ADMIN_PERMISSIONS = [
  'users.view', 'users.manage',
  'trips.view', 'trips.manage',
  'moderation.view', 'moderation.manage',
  'transactions.view', 'transactions.manage',
  'affiliate.view', 'affiliate.manage',
  'analytics.view', 'notifications.manage', 'feedback.view', 'feedback.manage', 'settings.manage',
  'administration.manage', 'audit.view',
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export interface AdminAccess {
  isAdmin: boolean;
  role: AdminRole | null;
  permissions: AdminPermission[];
}

const EMPTY_ACCESS: AdminAccess = { isAdmin: false, role: null, permissions: [] };

export async function getAdminAccess(): Promise<AdminAccess> {
  const { data, error } = await supabase.rpc('get_admin_access');
  if (error) {
    console.error('[Admin] Failed to load role access:', error);
    return EMPTY_ACCESS;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.is_admin || !ADMIN_ROLES.includes(row.role as AdminRole)) return EMPTY_ACCESS;

  const permissions = Array.isArray(row.permissions)
    ? row.permissions.filter((permission: unknown): permission is AdminPermission =>
        typeof permission === 'string' && ADMIN_PERMISSIONS.includes(permission as AdminPermission),
      )
    : [];

  return { isAdmin: true, role: row.role as AdminRole, permissions };
}

export function hasPermission(access: AdminAccess | null, permission: AdminPermission): boolean {
  return Boolean(access?.isAdmin && access.permissions.includes(permission));
}

export async function verifyAdminAccess(): Promise<boolean> {
  return (await getAdminAccess()).isAdmin;
}

export async function requireAdminAccess() {
  const allowed = await verifyAdminAccess();
  if (!allowed) throw new Error('Administrator access required.');
  return true;
}
