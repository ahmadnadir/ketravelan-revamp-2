import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, CalendarDays, CheckCircle2, CreditCard, Gauge, Globe2, Handshake,
  LayoutGrid, Map, MapPin, MousePointerClick, RefreshCw, ShieldCheck, Sparkles, TrendingUp, Trophy, Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { formatAdminRole, getAdminAccess, type AdminPermission, type AdminRole } from '@/admin/lib/adminAccess';
import { StepGuide } from '@/admin/components/notifications/NotificationUi';
import { cn } from '@/lib/utils';

interface CurrencySummary { currency: string; records: number; amount: number; }

interface CommandCenterSummary {
  generated_at: string;
  trend_days: number;
  users_total: number;
  users_added_today: number;
  users_added_previous_period: number;
  trips_total: number;
  trips_published: number;
  registration_trend: Array<{ day: string; new_users: number }>;
  moderation: { needs_review: number; in_review: number; open_total: number } | null;
  transactions: { failed_payments: number; completed_mtd: CurrencySummary[] } | null;
  affiliate: {
    clicks_mtd: number;
    conversions_today: number;
    reconciliation_pending: number;
    received_mtd: CurrencySummary[];
  } | null;
}

interface DashboardStatistics {
  user_home_country: Array<{ country: string; user_count: number }>;
  user_destination: Array<{ destination: string; trip_count: number }>;
}

type Tone = 'cyan' | 'emerald' | 'amber' | 'violet' | 'rose' | 'slate';
const TONES: Record<Tone, { tile: string; bar: string; stroke: string }> = {
  cyan: { tile: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300', bar: 'bg-cyan-600', stroke: '#0891b2' },
  emerald: { tile: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', bar: 'bg-emerald-600', stroke: '#059669' },
  amber: { tile: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', bar: 'bg-amber-500', stroke: '#d97706' },
  violet: { tile: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300', bar: 'bg-violet-600', stroke: '#7c3aed' },
  rose: { tile: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300', bar: 'bg-rose-600', stroke: '#e11d48' },
  slate: { tile: 'bg-secondary text-foreground', bar: 'bg-foreground', stroke: '#475569' },
};

function formatMoney(amount: number, currency: string) {
  if (!Number.isFinite(Number(amount))) return '—';
  if (!currency || currency === 'UNKNOWN') return `${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (currency not recorded)`;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

const OPERATIONS_LINKS: Array<{ label: string; description: string; path: string; permission: AdminPermission; icon: typeof Users; tone: Tone }> = [
  { label: 'Review reports', description: 'Moderation queue', path: '/admin/moderation', permission: 'moderation.view', icon: ShieldCheck, tone: 'amber' },
  { label: 'Manage users', description: 'Accounts and access', path: '/admin/users', permission: 'users.view', icon: Users, tone: 'cyan' },
  { label: 'Manage trips', description: 'Trips and participation', path: '/admin/trips', permission: 'trips.view', icon: Map, tone: 'emerald' },
  { label: 'Transactions', description: 'Payments and settlements', path: '/admin/transactions', permission: 'transactions.view', icon: CreditCard, tone: 'violet' },
  { label: 'Affiliate revenue', description: 'Providers and commissions', path: '/admin/affiliate', permission: 'affiliate.view', icon: Handshake, tone: 'rose' },
];

// Payments come from guided booking, which isn't live yet. Flip to true to show payment cards again.
const PAYMENTS_ENABLED = false;

const PERIODS: Array<[number, string]> = [[1, 'Today'], [7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '12 months']];

const GUIDE_STEPS = [
  { icon: AlertTriangle, title: 'Clear what needs you', text: 'Start with “Needs attention”; each item links to the exact queue.' },
  { icon: Gauge, title: 'Scan the pulse', text: 'Metric cards show today’s numbers and how they are trending.' },
  { icon: MousePointerClick, title: 'Jump into work', text: 'Click any card or quick-access tile to open that area.' },
  { icon: TrendingUp, title: 'Watch the trends', text: 'Change the period to compare growth and spot spikes.' },
];

const EMPTY_STATISTICS: DashboardStatistics = { user_home_country: [], user_destination: [] };

function readGuideOpen() {
  try { return localStorage.getItem('admin.dashboard.guideHidden') !== '1'; } catch { return true; }
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

const normalizeDestination = (value: string) => {
  const cleaned = value.split(',').map((part) => part.trim().replace(/^special capital region of\s+/i, '').replace(/\s+city municipality$/i, '').trim()).filter(Boolean);
  if (!cleaned.length) return value;
  const aliases: Record<string, string> = { hunyai: 'Hat Yai', hatyai: 'Hat Yai' };
  return cleaned.slice(-2).map((part) => aliases[part.toLowerCase()] || part.replace(/\b\w/g, (letter) => letter.toUpperCase())).join(', ');
};

const formatDay = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const [summary, setSummary] = useState<CommandCenterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(EMPTY_STATISTICS);
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [statisticsError, setStatisticsError] = useState('');
  const [commandError, setCommandError] = useState('');
  const [accessibleOperations, setAccessibleOperations] = useState<typeof OPERATIONS_LINKS>([]);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [trendDays, setTrendDays] = useState(30);
  const [refreshKey, setRefreshKey] = useState(0);
  const [guideOpen, setGuideOpen] = useState(readGuideOpen);

  useEffect(() => {
    let active = true;
    void getAdminAccess().then((access) => {
      if (!active) return;
      setRole(access.role);
      setAccessibleOperations(OPERATIONS_LINKS.filter((item) => access.permissions.includes(item.permission) && (PAYMENTS_ENABLED || item.permission !== 'transactions.view')));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setStatisticsLoading(true);
    setCommandError('');
    setStatisticsError('');
    void Promise.all([
      supabase.rpc('admin_get_command_center', { p_trend_days: trendDays }),
      supabase.rpc('get_admin_dashboard_statistics'),
    ]).then(([commandResult, statisticsResult]) => {
      if (!active) return;
      if (commandResult.error) setCommandError(commandResult.error.message);
      else if (commandResult.data) setSummary(commandResult.data as unknown as CommandCenterSummary);
      if (statisticsResult.error) setStatisticsError(statisticsResult.error.message);
      else if (statisticsResult.data) setStatistics(statisticsResult.data as unknown as DashboardStatistics);
      setStatisticsLoading(false);
      setLoading(false);
    });
    return () => { active = false; };
  }, [trendDays, refreshKey]);

  const toggleGuide = () => setGuideOpen((open) => {
    try { localStorage.setItem('admin.dashboard.guideHidden', open ? '1' : '0'); } catch { /* storage unavailable */ }
    return !open;
  });

  const registrationTrend = useMemo(() => summary?.registration_trend || [], [summary]);
  const currentPeriodUsers = registrationTrend.reduce((total, item) => total + Number(item.new_users || 0), 0);
  const previousPeriodUsers = summary?.users_added_previous_period || 0;
  const userChange = previousPeriodUsers > 0 ? ((currentPeriodUsers - previousPeriodUsers) / previousPeriodUsers) * 100 : null;
  const peakDay = registrationTrend.reduce<{ day: string; new_users: number } | null>((best, item) => !best || Number(item.new_users) > Number(best.new_users) ? item : best, null);
  const dailyAverage = registrationTrend.length ? currentPeriodUsers / registrationTrend.length : 0;
  const canSee = (permission: AdminPermission) => accessibleOperations.some((item) => item.permission === permission);
  const periodLabel = PERIODS.find(([days]) => days === trendDays)?.[1] ?? `${trendDays} days`;

  const moneySummary = (items: CurrencySummary[] | undefined) => items?.length
    ? items.map((item) => formatMoney(item.amount, item.currency)).join(' · ')
    : 'No revenue yet';

  const attentionItems = [
    ...(canSee('moderation.view') && (summary?.moderation?.needs_review || 0) > 0 ? [{ count: summary?.moderation?.needs_review ?? 0, label: 'Moderation reports need review', hint: `${summary?.moderation?.in_review ?? 0} already in review`, path: '/admin/moderation', action: 'Review now', icon: ShieldCheck, tone: 'amber' as Tone }] : []),
    ...(canSee('transactions.view') && (summary?.transactions?.failed_payments || 0) > 0 ? [{ count: summary?.transactions?.failed_payments ?? 0, label: 'Failed payments to investigate', hint: 'Customers may be blocked from paying', path: '/admin/transactions/standard_payments?status=failed', action: 'Investigate', icon: CreditCard, tone: 'rose' as Tone }] : []),
    ...(canSee('affiliate.view') && (summary?.affiliate?.reconciliation_pending || 0) > 0 ? [{ count: summary?.affiliate?.reconciliation_pending ?? 0, label: 'Affiliate commissions to reconcile', hint: 'Match provider payouts to conversions', path: '/admin/affiliate/reconciliation', action: 'Reconcile', icon: Handshake, tone: 'violet' as Tone }] : []),
  ];
  const attentionTotal = attentionItems.reduce((total, item) => total + item.count, 0);
  const hasAttentionQueueAccess = canSee('moderation.view') || canSee('transactions.view') || canSee('affiliate.view');

  const operationDescription = (path: string, fallback: string) => {
    if (path === '/admin/moderation' && summary?.moderation) return `${summary.moderation.needs_review} awaiting · ${summary.moderation.in_review} in review`;
    if (path === '/admin/users' && summary) return `${summary.users_total.toLocaleString()} profiles · ${summary.users_added_today} new today`;
    if (path === '/admin/trips' && summary) return `${summary.trips_total.toLocaleString()} total · ${summary.trips_published.toLocaleString()} published`;
    if (path === '/admin/transactions' && summary?.transactions) return `${summary.transactions.failed_payments} failed this month`;
    if (path === '/admin/affiliate' && summary?.affiliate) return `${summary.affiliate.conversions_today} conversions today`;
    return fallback;
  };

  const firstName = String(profile?.full_name || user?.email?.split('@')[0] || 'there').split(' ')[0];
  const adminDate = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const generatedAt = summary?.generated_at ? new Date(summary.generated_at) : null;
  const generatedLabel = generatedAt && Number.isFinite(generatedAt.getTime()) ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(generatedAt) : null;
  const publishRate = summary?.trips_total ? (summary.trips_published / summary.trips_total) * 100 : 0;
  const trendSpark = registrationTrend.slice(-30);

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/[0.08] via-background to-cyan-500/[0.06] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" />{adminDate}{role && <Badge variant="secondary" className="font-medium">{formatAdminRole(role)}</Badge>}</div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{greeting()}, {firstName} 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">Here’s what’s happening on Ketravelan today.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill loading={loading} error={Boolean(commandError)} attentionTotal={attentionTotal} />
            <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => setRefreshKey((value) => value + 1)}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />{generatedLabel ? `Updated ${generatedLabel}` : 'Refresh'}
            </Button>
          </div>
        </div>
      </header>

      <StepGuide title="How to use this dashboard" steps={GUIDE_STEPS} tip="Cards and tiles only show areas your admin role can access." open={guideOpen} onToggle={toggleGuide} />

      {commandError && <Card role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="h-4 w-4 shrink-0" /><span className="flex-1">Couldn’t load dashboard data: {commandError}</span><Button type="button" size="sm" variant="outline" onClick={() => setRefreshKey((value) => value + 1)}>Try again</Button></Card>}

      <Section icon={AlertTriangle} title="Needs attention" description="Open work from the queues your role can act on.">
        {loading ? <div className="grid gap-3 md:grid-cols-3">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div>
          : attentionItems.length > 0 ? <div className="grid gap-3 md:grid-cols-3">
            {attentionItems.map(({ count, label, hint, path, action, icon: Icon, tone }) => <Link key={path} to={path} className="group relative overflow-hidden rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className={cn('absolute inset-y-0 left-0 w-1', TONES[tone].bar)} />
              <div className="flex items-start justify-between gap-3"><span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', TONES[tone].tile)}><Icon className="h-5 w-5" /></span><span className="text-3xl font-bold tabular-nums">{count.toLocaleString()}</span></div>
              <p className="mt-3 text-sm font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">{action}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>)}
          </div>
          : commandError || !summary ? <EmptyNote>Attention status appears once dashboard data loads.</EmptyNote>
            : hasAttentionQueueAccess ? <div className="flex items-center gap-4 rounded-xl border border-emerald-600/20 bg-emerald-50/70 p-4 dark:bg-emerald-950/30">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"><CheckCircle2 className="h-6 w-6" /></span>
              <div><p className="font-semibold text-emerald-900 dark:text-emerald-200">All clear! 🎉</p><p className="text-sm text-emerald-800/80 dark:text-emerald-300/80">Nothing is waiting in your queues right now.</p></div>
            </div>
              : <EmptyNote>No review queues are assigned to your admin role.</EmptyNote>}
      </Section>

      <Section icon={Gauge} title="Platform pulse" description="Key numbers at a glance. Click a card to open that area.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Users" icon={Users} tone="cyan" path="/admin/users" loading={loading}
            value={summary?.users_total.toLocaleString()}
            delta={userChange} deltaLabel={`vs previous ${periodLabel.toLowerCase()}`}
            detail={`${summary?.users_added_today ?? 0} joined today`}
            footer={trendSpark.length > 1 ? <Sparkline data={trendSpark} color={TONES.cyan.stroke} /> : undefined} />
          <MetricCard label="Trips" icon={Map} tone="emerald" path="/admin/trips" loading={loading}
            value={summary?.trips_total.toLocaleString()}
            detail={`${summary?.trips_published.toLocaleString() ?? 0} published · ${publishRate.toFixed(0)}%`}
            footer={<ProgressBar value={publishRate} className={TONES.emerald.bar} label="Published share" />} />
          {canSee('moderation.view') && <MetricCard label="Open reports" icon={ShieldCheck} tone="amber" path="/admin/moderation" loading={loading}
            value={summary?.moderation?.open_total.toLocaleString()}
            detail={`${summary?.moderation?.needs_review ?? 0} need review · ${summary?.moderation?.in_review ?? 0} in review`}
            footer={<ProgressBar value={summary?.moderation?.open_total ? ((summary.moderation.in_review) / summary.moderation.open_total) * 100 : 0} className={TONES.amber.bar} label="In review share" />} />}
          {canSee('transactions.view') && <MetricCard label="Payments this month" icon={CreditCard} tone="violet" path="/admin/transactions" loading={loading} small
            value={moneySummary(summary?.transactions?.completed_mtd)}
            detail={(summary?.transactions?.failed_payments ?? 0) > 0 ? `⚠ ${summary?.transactions?.failed_payments} failed payments` : 'No failed payments'} />}
          {canSee('affiliate.view') && <MetricCard label="Affiliate revenue this month" icon={Handshake} tone="rose" path="/admin/affiliate" loading={loading} small
            value={moneySummary(summary?.affiliate?.received_mtd)}
            detail={`${(summary?.affiliate?.clicks_mtd ?? 0).toLocaleString()} clicks · ${summary?.affiliate?.conversions_today ?? 0} conversions today`} />}
        </div>
      </Section>

      {accessibleOperations.length > 0 && <Section icon={LayoutGrid} title="Quick access" description="Go straight to your work areas.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {accessibleOperations.map(({ label, description, path, icon: Icon, tone }) => <Link key={path} to={path} className="group flex flex-col gap-3 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-center justify-between"><span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', TONES[tone].tile)}><Icon className="h-5 w-5" /></span><ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" /></div>
            <div className="min-w-0"><p className="text-sm font-semibold">{label}</p><p className="truncate text-xs text-muted-foreground">{loading ? description : operationDescription(path, description)}</p></div>
          </Link>)}
        </div>
      </Section>}

      <Section icon={BarChart3} title="Growth & activity" description="Registrations over time, where users come from and where trips go.">
        <Card className="rounded-xl border-border/60 p-4 shadow-none sm:p-5">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold"><TrendingUp className="h-4 w-4 text-cyan-600" />New users</h3>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl font-bold tabular-nums">{loading ? '—' : currentPeriodUsers.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">in the last {periodLabel.toLowerCase()}</span>
                {!loading && <DeltaBadge value={userChange} />}
              </div>
            </div>
            <div role="radiogroup" aria-label="Period" className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1">
              {PERIODS.map(([days, label]) => <button key={days} type="button" role="radio" aria-checked={trendDays === days} onClick={() => setTrendDays(days)} className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', trendDays === days ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{label}</button>)}
            </div>
          </div>
          {!loading && registrationTrend.length > 0 && <div className="mb-4 grid grid-cols-3 gap-2">
            <MiniStat label="Daily average" value={dailyAverage.toFixed(dailyAverage < 10 ? 1 : 0)} />
            <MiniStat label="Peak day" value={peakDay ? `${Number(peakDay.new_users).toLocaleString()}` : '—'} sub={peakDay ? formatDay(peakDay.day) : undefined} />
            <MiniStat label="Previous period" value={previousPeriodUsers.toLocaleString()} />
          </div>}
          {loading ? <Skeleton className="h-[260px] rounded-lg" /> : registrationTrend.length === 0 ? <EmptyNote>No registrations recorded in this period.</EmptyNote> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={registrationTrend} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <defs><linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0891b2" stopOpacity={0.35} /><stop offset="100%" stopColor="#0891b2" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickFormatter={formatDay} minTickGap={24} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} width={42} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }} labelFormatter={(label) => formatDay(String(label))} formatter={(value) => [Number(value).toLocaleString(), 'New users']} />
                <Area type="monotone" dataKey="new_users" name="New users" stroke="#0891b2" strokeWidth={2.5} fill="url(#usersFill)" activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {statisticsError && <Card role="alert" className="mt-4 rounded-xl border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Couldn’t load geographic statistics: {statisticsError}</Card>}
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <Leaderboard icon={Globe2} title="Where users come from" subtitle="Top home countries by profiles" unit="users" tone="emerald" loading={statisticsLoading}
            rows={statistics.user_home_country.slice(0, 8).map((row) => ({ key: row.country, label: row.country, title: row.country, value: row.user_count }))}
            total={statistics.user_home_country.reduce((sum, row) => sum + row.user_count, 0)} empty="No country data yet." />
          <Leaderboard icon={MapPin} title="Top trip destinations" subtitle="Published trips by destination" unit="trips" tone="cyan" loading={statisticsLoading}
            rows={statistics.user_destination.slice(0, 8).map((row) => ({ key: row.destination, label: normalizeDestination(row.destination), title: row.destination, value: row.trip_count }))}
            total={statistics.user_destination.reduce((sum, row) => sum + row.trip_count, 0)} empty="No published destinations yet." />
        </div>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, description, children }: { icon: typeof Users; title: string; description: string; children: ReactNode }) {
  return <section className="space-y-3">
    <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><div><h2 className="text-lg font-semibold leading-tight">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div></div>
    {children}
  </section>;
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <div role="status" className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">{children}</div>;
}

function StatusPill({ loading, error, attentionTotal }: { loading: boolean; error: boolean; attentionTotal: number }) {
  if (loading) return <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm text-muted-foreground"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Checking…</span>;
  if (error) return <span className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-sm text-destructive"><AlertTriangle className="h-3.5 w-3.5" />Data unavailable</span>;
  return attentionTotal > 0
    ? <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />{attentionTotal.toLocaleString()} item{attentionTotal === 1 ? '' : 's'} need you</span>
    : <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"><Sparkles className="h-3.5 w-3.5" />All systems calm</span>;
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">No previous data to compare</span>;
  const up = value >= 0;
  return <span className={cn('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold', up ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300')}>
    {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{up ? '+' : ''}{value.toFixed(1)}%
  </span>;
}

function MetricCard({ label, value, detail, icon: Icon, tone, path, loading, delta, deltaLabel, footer, small = false }: { label: string; value: string | null | undefined; detail: string; icon: typeof Users; tone: Tone; path: string; loading: boolean; delta?: number | null; deltaLabel?: string; footer?: ReactNode; small?: boolean }) {
  return <Link to={path} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <Card className="flex h-full flex-col rounded-xl border-border/60 p-4 shadow-none transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md sm:p-5">
      <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-muted-foreground">{label}</span><span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', TONES[tone].tile)}><Icon className="h-4 w-4" /></span></div>
      {loading ? <Skeleton className="mt-3 h-8 w-28" /> : <div className={cn('mt-2 line-clamp-2 font-bold tabular-nums', small ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl')}>{value ?? '—'}</div>}
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{delta !== undefined && !loading && <><DeltaBadge value={delta} />{delta !== null && <span>{deltaLabel}</span>}</>}</div>
      <p className="mt-1 text-xs text-muted-foreground">{loading ? ' ' : detail}</p>
      {footer && !loading && <div className="mt-auto pt-3">{footer}</div>}
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">Open<ArrowRight className="h-3 w-3" /></span>
    </Card>
  </Link>;
}

function Sparkline({ data, color }: { data: Array<{ day: string; new_users: number }>; color: string }) {
  return <div className="h-10" aria-hidden="true">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs><linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.3} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
        <Area type="monotone" dataKey="new_users" stroke={color} strokeWidth={1.75} fill="url(#sparkFill)" dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}

function ProgressBar({ value, className, label }: { value: number; className: string; label: string }) {
  return <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><div className={cn('h-full rounded-full transition-all', className)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="rounded-lg border bg-muted/20 px-3 py-2"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-lg font-semibold tabular-nums">{value}{sub && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{sub}</span>}</p></div>;
}

function Leaderboard({ icon: Icon, title, subtitle, rows, total, unit, tone, loading, empty }: { icon: typeof Users; title: string; subtitle: string; rows: Array<{ key: string; label: string; title: string; value: number }>; total: number; unit: string; tone: Tone; loading: boolean; empty: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  const medals = ['bg-amber-400 text-amber-950', 'bg-slate-300 text-slate-800', 'bg-orange-300 text-orange-950'];
  return <Card className="rounded-xl border-border/60 p-4 shadow-none sm:p-5">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3"><span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', TONES[tone].tile)}><Icon className="h-4 w-4" /></span><div><h3 className="text-base font-semibold">{title}</h3><p className="text-xs text-muted-foreground">{subtitle}</p></div></div>
      {!loading && rows.length > 0 && <span className="text-xs text-muted-foreground"><Trophy className="mr-1 inline h-3.5 w-3.5 text-amber-500" />{total.toLocaleString()} {unit}</span>}
    </div>
    {loading ? <div className="space-y-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-7" />)}</div>
      : rows.length === 0 ? <EmptyNote>{empty}</EmptyNote>
        : <ol className="space-y-2.5">{rows.map((row, index) => {
          const share = total ? (row.value / total) * 100 : 0;
          return <li key={row.key} className="grid grid-cols-[1.75rem_minmax(5rem,9rem)_minmax(3rem,1fr)_4.5rem] items-center gap-3" title={`${row.title}: ${row.value.toLocaleString()} ${unit} (${share.toFixed(1)}%)`}>
            <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold', medals[index] ?? 'bg-muted text-muted-foreground')}>{index + 1}</span>
            <span className="truncate text-sm font-medium">{row.label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-muted"><span className={cn('block h-full rounded-full', TONES[tone].bar)} style={{ width: `${Math.max(3, (row.value / max) * 100)}%` }} /></span>
            <span className="text-right text-sm tabular-nums"><span className="font-medium">{row.value.toLocaleString()}</span><span className="ml-1 text-xs text-muted-foreground">{share.toFixed(0)}%</span></span>
          </li>;
        })}</ol>}
  </Card>;
}
