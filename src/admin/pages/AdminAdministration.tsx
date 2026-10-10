import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, UserMinus, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_ROLES, type AdminRole } from '@/admin/lib/adminAccess';

type Assignment = {
  user_id: string;
  role: AdminRole;
  assigned_at: string;
};

export default function AdminAdministration() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<AdminRole>('ADMIN');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const loadAssignments = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_role_assignments')
      .select('user_id, role, assigned_at')
      .order('assigned_at', { ascending: false });
    if (error) {
      setMessage(error.message);
      return;
    }
    setAssignments((data ?? []) as Assignment[]);
  }, []);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const assign = async () => {
    const targetId = userId.trim();
    if (!targetId) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.rpc('assign_admin_role', {
      p_user_id: targetId,
      p_role: role,
    });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Administrator role assigned.');
      setUserId('');
      await loadAssignments();
    }
    setBusy(false);
  };

  const remove = async (targetId: string) => {
    if (targetId === user?.id || !window.confirm('Remove this administrator role?')) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.rpc('remove_admin_role', { p_user_id: targetId });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Administrator role removed.');
      await loadAssignments();
    }
    setBusy(false);
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage administrator roles and access.</p>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <section className="rounded-lg border bg-background p-5">
          <h2 className="flex items-center gap-2 font-medium"><UserPlus className="h-4 w-4" />Assign role</h2>
          <p className="mt-1 text-xs text-muted-foreground">Use the user&apos;s profile UUID. Role changes are validated and audited by the server.</p>
          <label htmlFor="admin-target-user" className="mt-5 block text-sm font-medium">User UUID</label>
          <input
            id="admin-target-user"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <label htmlFor="admin-target-role" className="mt-4 block text-sm font-medium">Role</label>
          <select
            id="admin-target-role"
            value={role}
            onChange={(event) => setRole(event.target.value as AdminRole)}
            className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {ADMIN_ROLES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button
            type="button"
            disabled={busy || !userId.trim()}
            onClick={() => void assign()}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />Assign
          </button>
          {message && <p role="status" className="mt-3 break-words text-xs text-muted-foreground">{message}</p>}
        </section>

        <section className="rounded-lg border bg-background p-5">
          <h2 className="font-medium">Assigned administrators</h2>
          <div className="mt-4 divide-y">
            {assignments.length === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">
                No explicit assignments yet. Legacy profiles marked as admin retain SUPER_ADMIN access.
              </p>
            ) : assignments.map((assignment) => (
              <div key={assignment.user_id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">{assignment.user_id}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{assignment.role}</p>
                </div>
                <button
                  type="button"
                  disabled={busy || assignment.user_id === user?.id}
                  onClick={() => void remove(assignment.user_id)}
                  className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                  title="Remove role"
                  aria-label={`Remove ${assignment.role} role`}
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
