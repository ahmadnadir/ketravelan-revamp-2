import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';

type AuditEntry = {
  id: string;
  admin_id: string;
  action_type: string;
  action_data: Record<string, unknown> | null;
  created_at: string;
};

export default function AdminAuditLogs() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    void supabase.rpc('get_admin_audit_logs', { p_limit: 100 }).then(({ data, error }) => {
      if (!active) return;
      if (error) setErrorMessage(error.message);
      else setEntries((data ?? []) as AuditEntry[]);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recent privileged administrator actions.</p>
      </div>
      <Card className="mt-6 overflow-hidden border-border/60">
        {loading ? (
          <p className="p-5 text-sm text-muted-foreground">Loading audit history…</p>
        ) : errorMessage ? (
          <p role="alert" className="p-5 text-sm text-destructive">Could not load audit history: {errorMessage}</p>
        ) : entries.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No administrator actions recorded yet.</p>
        ) : (
          <div className="divide-y">
            {entries.map((entry) => (
              <article key={entry.id} className="grid gap-2 p-4 sm:grid-cols-[12rem_1fr]">
                <div>
                  <p className="text-sm font-medium">{entry.action_type.replace(/_/g, ' ')}</p>
                  <time className="mt-1 block text-xs text-muted-foreground" dateTime={entry.created_at}>
                    {new Date(entry.created_at).toLocaleString()}
                  </time>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-muted-foreground">Admin {entry.admin_id}</p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(entry.action_data ?? {}, null, 2)}</pre>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
