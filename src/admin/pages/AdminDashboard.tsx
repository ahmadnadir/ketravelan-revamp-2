import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CreditCard, Map, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';

interface Metric { label: string; value: number | string; icon: typeof Users; description: string; }

async function count(table: string) {
  const { count, error } = await supabase.from(table as never).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      count('profiles'),
      count('trips'),
      count('reports'),
      count('payments'),
      count('analytics_events'),
    ]).then((results) => {
      if (!active) return;
      const value = (index: number) => results[index].status === 'fulfilled' ? results[index].value : '—';
      setMetrics([
        { label: 'Users', value: value(0), icon: Users, description: 'Registered profiles' },
        { label: 'Trips', value: value(1), icon: Map, description: 'Trips in the platform' },
        { label: 'Reports', value: value(2), icon: AlertTriangle, description: 'Moderation reports' },
        { label: 'Payments', value: value(3), icon: CreditCard, description: 'Payment records' },
        { label: 'Analytics events', value: value(4), icon: Activity, description: 'Tracked platform events' },
      ]);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-primary">Overview</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">A production view of Ketravelan's users, trips, safety activity, transactions and platform usage.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="border-border/60 p-5">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-secondary p-2.5"><Icon className="h-5 w-5" /></div>
              </div>
              <div className="mt-5 text-2xl font-bold">{loading ? '…' : metric.value}</div>
              <div className="mt-1 text-sm font-medium">{metric.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{metric.description}</div>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 p-6">
          <h2 className="text-base font-semibold">Admin build status</h2>
          <p className="mt-2 text-sm text-muted-foreground">Foundation is connected to the existing Ketravelan authentication and Supabase data layer. The next modules will replace these high-level counts with permission-aware operational views.</p>
        </Card>
        <Card className="border-border/60 p-6">
          <h2 className="text-base font-semibold">Security baseline</h2>
          <p className="mt-2 text-sm text-muted-foreground">Admin access is verified through the existing server-side `current_user_is_admin()` RPC. Role-based permissions and privileged actions will be introduced before destructive operations are enabled.</p>
        </Card>
      </section>
    </div>
  );
}
