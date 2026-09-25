import { supabase } from '@/lib/supabase';

export async function verifyAdminAccess(): Promise<boolean> {
  const { data, error } = await supabase.rpc('current_user_is_admin');
  if (error) {
    console.error('[Admin] Failed to verify admin access:', error);
    return false;
  }
  return data === true;
}

export async function requireAdminAccess() {
  const allowed = await verifyAdminAccess();
  if (!allowed) throw new Error('Administrator access required.');
  return true;
}
