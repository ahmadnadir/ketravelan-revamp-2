import { useEffect, useState, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink, Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { getAdminAccess } from '@/admin/lib/adminAccess';
import { getAdminDashboardStatistics, getAnalyticsReport, getLivePlatformSummary, type AdminDashboardStatistics, type AnalyticsRange, type AnalyticsReport, type LivePlatformSummary } from '@/admin/lib/adminAnalytics';

function formatDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function defaultRange(): AnalyticsRange {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

function Metric({ label, value, source, href }: { label: string; value: number | string; source: string; href?: string }) {
  const card = (
    <Card className={`h-full rounded-lg border-border/60 p-4 shadow-none sm:p-5 ${href ? 'transition-colors group-hover:border-primary/40 group-hover:bg-secondary/20' : ''}`}>
      <div className="flex items-start justify-between gap-2"><p className="text-sm text-muted-foreground">{label}</p>{href && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />}</div>
      <p className="mt-2 truncate text-2xl font-semibold tabular-nums" title={String(value)}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground" title={source}>{source}</p>
    </Card>
  );
  return href ? <Link to={href} className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`View details for ${label}`}>{card}</Link> : card;
}

function LinkedMetric({
  label,
  value,
  detail,
  href,
  indicator,
  indicatorTone = 'text-muted-foreground',
}: {
  label: string;
  value: number;
  detail: string;
  href?: string;
  indicator?: ReactNode;
  indicatorTone?: string;
}) {
  const card = (
    <Card className={`h-full rounded-lg border-border/60 p-4 shadow-none sm:p-5 ${href ? 'transition-colors hover:border-primary/40 hover:bg-secondary/20' : ''}`}>
      <div className="flex min-h-5 items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {indicator && <span className={`inline-flex shrink-0 items-center gap-0.5 text-xs font-medium ${indicatorTone}`}>{indicator}</span>}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground" title={detail}>{detail}</p>
    </Card>
  );
  return href ? <Link to={href} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${label}: ${value.toLocaleString()}. ${detail}`}>{card}</Link> : card;
}

function EmptyState({ children }: { children: string }) {
  return <div className="px-4 py-10 text-center text-sm text-muted-foreground">{children}</div>;
}

function Distribution({ title, description, items }: { title: string; description: string; items: Array<{ label: string; count: number }> }) {
  const maximum = Math.max(1, ...items.map((item) => item.count));
  return (
    <Card className="rounded-lg border-border/60 p-4 shadow-none sm:p-5">
      <div className="mb-4"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
      {items.length === 0 ? <EmptyState>No records available.</EmptyState> : <div className="space-y-3">{items.slice(0, 8).map((item) => (
        <div key={item.label} className="grid grid-cols-[minmax(5rem,8rem)_minmax(3rem,1fr)_3.5rem] items-center gap-3">
          <span className="truncate text-sm" title={item.label}>{item.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(2, (item.count / maximum) * 100)}%` }} /></span>
          <span className="text-right text-sm tabular-nums text-muted-foreground">{item.count.toLocaleString()}</span>
        </div>
      ))}</div>}
    </Card>
  );
}

function formatDay(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTableDate(date: string) {
  const [year, month, day] = date.slice(0, 10).split('-');
  return `${day}/${month}/${year.slice(-2)}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const details = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    const message = typeof details.message === 'string' ? details.message : '';
    const code = typeof details.code === 'string' ? details.code : '';
    const extra = typeof details.details === 'string' ? details.details : typeof details.hint === 'string' ? details.hint : '';
    if (message) return [code && `[${code}]`, message, extra].filter(Boolean).join(' ');
  }
  return error instanceof Error ? error.message : fallback;
}

function DailyTable<T extends { date: string }>({
  title,
  description,
  rows,
  columns,
}: {
  title: string;
  description: string;
  rows: T[];
  columns: Array<{ key: keyof T; label: string }>;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = rows.slice(page * pageSize, (page + 1) * pageSize);

  useEffect(() => {
    setPage(0);
  }, [rows]);

  return (
    <Card className="overflow-hidden rounded-lg border-border/60 shadow-none">
      <div className="p-4 sm:p-5">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      {rows.length === 0 ? <EmptyState>No records for this period.</EmptyState> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="border-y bg-muted/40 text-left text-muted-foreground">
              <tr>{columns.map((column) => <th className="px-4 py-2.5 font-medium" key={String(column.key)}>{column.label}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {visibleRows.map((row, index) => (
                <tr key={`${row.date}-${index}`} className="hover:bg-muted/20">
                  {columns.map((column) => {
                    const value = row[column.key];
                    return <td className="px-4 py-2.5 tabular-nums" key={String(column.key)}>{column.key === 'date' ? formatTableDate(String(value)) : Number(value ?? 0).toLocaleString()}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > pageSize && <div className="flex items-center justify-between border-t px-4 py-2.5">
        <span className="text-xs text-muted-foreground">{page * pageSize + 1}–{Math.min((page + 1) * pageSize, rows.length)} of {rows.length} days</span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" aria-label={`Previous ${title} page`} disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="icon" aria-label={`Next ${title} page`} disabled={page + 1 >= pageCount} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>}
    </Card>
  );
}

export default function AdminAnalytics() {
  const [range, setRange] = useState<AnalyticsRange>(defaultRange);
  const [periodDays, setPeriodDays] = useState<number | null>(30);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [platformSummary, setPlatformSummary] = useState<LivePlatformSummary | null>(null);
  const [dashboardStatistics, setDashboardStatistics] = useState<AdminDashboardStatistics | null>(null);
  const [canViewUsers, setCanViewUsers] = useState(false);
  const [canViewTrips, setCanViewTrips] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [platformError, setPlatformError] = useState('');
  const [statisticsError, setStatisticsError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const invalidRange = range.startDate > range.endDate;

  useEffect(() => {
    let active = true;
    void getAdminAccess().then((access) => {
      if (!active) return;
      setCanViewUsers(access.permissions.includes('users.view'));
      setCanViewTrips(access.permissions.includes('trips.view'));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (invalidRange) {
      setLoading(false);
      setError('The start date must be on or before the end date.');
      setReport(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError('');
    setPlatformError('');
    setStatisticsError('');
    void Promise.allSettled([
      getAnalyticsReport(supabase, range),
      getLivePlatformSummary(supabase),
      getAdminDashboardStatistics(supabase),
    ])
      .then(([analyticsResult, platformResult, statisticsResult]) => {
        if (!active) return;
        if (analyticsResult.status === 'fulfilled') setReport(analyticsResult.value);
        else setError(getErrorMessage(analyticsResult.reason, 'Unable to load analytics.'));
        if (platformResult.status === 'fulfilled') setPlatformSummary(platformResult.value);
        else setPlatformError(getErrorMessage(platformResult.reason, 'Unable to load live platform activity.'));
        if (statisticsResult.status === 'fulfilled') setDashboardStatistics(statisticsResult.value);
        else setStatisticsError(getErrorMessage(statisticsResult.reason, 'Unable to load platform distributions.'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range, refreshKey, invalidRange]);

  const setDate = (key: keyof AnalyticsRange, value: string) => {
    setPeriodDays(null);
    setRange((current) => ({ ...current, [key]: value }));
  };
  const setPeriod = (days: number) => {
    const end = new Date(`${range.endDate}T00:00:00`);
    end.setDate(end.getDate() - (days - 1));
    setPeriodDays(days);
    setRange((current) => ({ ...current, startDate: formatDate(end) }));
  };
  const metrics = report?.overview;
  const eventCount = metrics?.events.total ?? 0;
  const tripCount = report?.tripTrend.length ?? 0;
  const engagementCount = report?.engagementTrend.length ?? 0;
  const empty = report && eventCount === 0 && tripCount === 0 && engagementCount === 0;
  const sessionMinutes = Math.round((metrics?.engagement.sessionDuration ?? 0) / 60);
  const registrationChange = platformSummary && platformSummary.users_added_previous_month > 0
    ? ((platformSummary.users_added_this_month - platformSummary.users_added_previous_month) / platformSummary.users_added_previous_month) * 100
    : null;
  const completedPaymentRecords = platformSummary?.transactions?.completed_mtd.reduce((total, item) => total + Number(item.records || 0), 0) ?? 0;
  const completedPaymentAmounts = platformSummary?.transactions?.completed_mtd.map((item) => `${item.currency} ${Number(item.amount).toLocaleString()}`).join(' · ') || 'No completed payments this month';
  const affiliateRecords = platformSummary?.affiliate?.received_mtd.reduce((total, item) => total + Number(item.records || 0), 0) ?? 0;
  const affiliateAmounts = platformSummary?.affiliate?.received_mtd.map((item) => `${item.currency} ${Number(item.amount).toLocaleString()}`).join(' · ') || 'No affiliate receipts this month';
  const countryItems = (dashboardStatistics?.user_home_country ?? []).map((row) => ({ label: row.country, count: row.user_count }));
  const destinationItems = (dashboardStatistics?.user_destination ?? []).map((row) => ({ label: row.destination, count: row.trip_count }));
  const metricDetailsHref = (metric: string) => `/admin/analytics/details/${metric}?from=${range.startDate}&to=${range.endDate}`;

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Insights</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Product activity, trip performance and user engagement.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs text-muted-foreground">From<input aria-label="Analytics start date" type="date" value={range.startDate} max={range.endDate} onChange={(event) => setDate('startDate', event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground" /></label>
          <label className="grid gap-1 text-xs text-muted-foreground">To<input aria-label="Analytics end date" type="date" value={range.endDate} min={range.startDate} onChange={(event) => setDate('endDate', event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground" /></label>
          <Button type="button" variant="outline" size="icon" aria-label="Refresh analytics" title="Refresh analytics" disabled={loading || invalidRange} onClick={() => setRefreshKey((value) => value + 1)}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
        </div>
      </header>

      {error && <Card role="alert" className="rounded-lg border-destructive/30 p-4 text-sm text-destructive shadow-none">Unable to load analytics: {error}</Card>}

      {loading && !report ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading analytics">
          {Array.from({ length: 8 }, (_, index) => <Card key={index} className="rounded-lg border-border/60 p-4 shadow-none"><div className="h-4 w-28 animate-pulse rounded bg-muted" /><div className="mt-3 h-7 w-20 animate-pulse rounded bg-muted" /></Card>)}
        </div>
      ) : report ? (
        <>
          {empty && <Card role="status" className="rounded-lg border-border/60 p-4 text-sm text-muted-foreground shadow-none">No telemetry rows were recorded in this period. Live user and trip totals below come from existing platform records, not event tracking.</Card>}
          <section aria-label="Analytics summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Tracked events" value={metrics!.events.total} source="analytics_events" href={metricDetailsHref('tracked-events')} />
            <Metric label="Unique users" value={metrics!.events.uniqueUsers} source="analytics_events" href={metricDetailsHref('unique-users')} />
            <Metric label="Unique sessions" value={metrics!.events.uniqueSessions} source="analytics_events" href={metricDetailsHref('unique-sessions')} />
            <Metric label="Trip views" value={metrics!.trips.views} source="trip_analytics" href={metricDetailsHref('trip-views')} />
            <Metric label="Join requests" value={metrics!.trips.joinRequests} source="join_requests + telemetry" href={metricDetailsHref('join-requests')} />
            <Metric label="Conversions" value={metrics!.trips.conversions} source="trip_analytics" href={metricDetailsHref('conversions')} />
            <Metric label="Messages sent" value={metrics!.engagement.messagesSent} source="messages + telemetry" href={metricDetailsHref('messages-sent')} />
            <Metric label="Session minutes" value={sessionMinutes} source="user_engagement + visible-tab duration" href={metricDetailsHref('session-minutes')} />
          </section>

          <section className="space-y-3" aria-label="Live platform activity">
            <div><h2 className="text-lg font-semibold">Live platform activity</h2><p className="mt-1 text-sm text-muted-foreground">Current user and trip records · registrations cover the last 30 days.</p></div>
            {platformError && <Card role="alert" className="rounded-lg border-destructive/30 p-4 text-sm text-destructive shadow-none">Unable to load platform activity: {platformError}</Card>}
            {platformSummary && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <LinkedMetric label="Total users" value={platformSummary.users_total} detail="Live platform records" href={canViewUsers ? '/admin/users' : undefined} indicator={<><Plus className="h-3.5 w-3.5" />{platformSummary.users_added_today.toLocaleString()} today</>} indicatorTone="text-emerald-700" />
              <LinkedMetric
                label="New registrations"
                value={platformSummary.users_added_this_month}
                detail="This month · compared with last calendar month"
                href={canViewUsers ? '/admin/users' : undefined}
                indicator={registrationChange === null
                  ? <span>New vs last month</span>
                  : <>{registrationChange >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(registrationChange).toFixed(1)}% vs last month</>}
                indicatorTone={registrationChange === null ? 'text-muted-foreground' : registrationChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}
              />
              <LinkedMetric label="Total trips" value={platformSummary.trips_total} detail="Live platform records" href={canViewTrips ? '/admin/trips' : undefined} indicator={<span>{platformSummary.trips_draft.toLocaleString()} draft · {platformSummary.trips_published.toLocaleString()} published</span>} />
              <LinkedMetric label="Published trips" value={platformSummary.trips_published} detail="Published trip records" href={canViewTrips ? '/admin/trips' : undefined} indicator={<span>{platformSummary.trips_private.toLocaleString()} private · {platformSummary.trips_public.toLocaleString()} public</span>} />
            </div>}
          </section>

          {dashboardStatistics && <>
            <section className="grid gap-4 xl:grid-cols-2" aria-label="Registration trend and audience">
              <Card className="rounded-lg border-border/60 p-4 shadow-none sm:p-5">
                <div className="mb-4"><h2 className="font-semibold">New registrations</h2><p className="mt-1 text-xs text-muted-foreground">Daily signups from auth records · last 30 days.</p></div>
                {dashboardStatistics.user_register_trend.length === 0 ? <EmptyState>No registration data available.</EmptyState> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={dashboardStatistics.user_register_trend} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tickFormatter={formatDay} minTickGap={24} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} width={42} tick={{ fontSize: 11 }} />
                      <Tooltip labelFormatter={(label) => formatDay(String(label))} formatter={(value) => [Number(value).toLocaleString(), 'New users']} />
                      <Line type="monotone" dataKey="new_users" name="New users" stroke="#0891b2" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Card>
              <Distribution title="User home countries" description="Profiles grouped by recorded country." items={countryItems} />
            </section>

            <section className="grid gap-4 xl:grid-cols-2" aria-label="Trip destinations and commerce">
              <Distribution title="Popular trip destinations" description="Published trips grouped by destination." items={destinationItems} />
              {platformSummary?.transactions || platformSummary?.affiliate || platformSummary?.moderation ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {platformSummary.moderation && <>
                    <Metric label="Reports awaiting review" value={platformSummary.moderation.needs_review} source="Permission-scoped moderation summary" />
                    <Metric label="Reports in review" value={platformSummary.moderation.in_review} source="Permission-scoped moderation summary" />
                  </>}
                  {platformSummary.transactions && <>
                    <Metric label="Completed payments MTD" value={completedPaymentRecords} source={completedPaymentAmounts} />
                    <Metric label="Failed payments" value={platformSummary.transactions.failed_payments} source="All recorded payments" />
                  </>}
                  {platformSummary.affiliate && <>
                    <Metric label="Affiliate clicks MTD" value={platformSummary.affiliate.clicks_mtd} source="Recorded affiliate clicks" />
                    <Metric label="Affiliate conversions today" value={platformSummary.affiliate.conversions_today} source={`${platformSummary.affiliate.reconciliation_pending} commissions pending reconciliation`} />
                    <Metric label="Affiliate receipts MTD" value={affiliateRecords} source={affiliateAmounts} />
                  </>}
                </div>
              ) : <Card className="rounded-lg border-border/60 p-4 text-sm text-muted-foreground shadow-none">No commerce or moderation summaries are available for this administrator role.</Card>}
            </section>
          </>}
          {statisticsError && <Card role="alert" className="rounded-lg border-destructive/30 p-4 text-sm text-destructive shadow-none">Unable to load registration and distribution analytics: {statisticsError}</Card>}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-lg font-semibold">Daily performance</h2><p className="mt-1 text-sm text-muted-foreground">Choose a reporting window. Tables show 10 days per page.</p></div>
              <div className="inline-flex rounded-md border bg-white border-input p-0.5" role="group" aria-label="Analytics date range">
                {[30, 90, 120].map((days) => <Button key={days} type="button" variant={periodDays === days ? 'secondary' : 'ghost'} size="sm" aria-pressed={periodDays === days} onClick={() => setPeriod(days)}>{days} days</Button>)}
              </div>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
            <DailyTable title="Trip performance" description="Daily metrics from trip_analytics, join_requests and recorded events." rows={report.tripTrend} columns={[
              { key: 'date', label: 'Date' }, { key: 'views', label: 'Views' }, { key: 'unique_visitors', label: 'Visitors' }, { key: 'join_requests', label: 'Join requests' }, { key: 'conversions', label: 'Conversions' }, { key: 'saves', label: 'Saves' },
            ]} />
            <DailyTable title="User engagement" description="Daily metrics from messages, user_engagement and recorded events." rows={report.engagementTrend} columns={[
              { key: 'date', label: 'Date' }, { key: 'login_count', label: 'Logins' }, { key: 'trips_viewed', label: 'Trips viewed' }, { key: 'messages_sent', label: 'Messages' }, { key: 'trips_created', label: 'Trips created' }, { key: 'trips_joined', label: 'Trips joined' },
            ]} />
            </div>
          </section>

          <Card className="rounded-lg border-border/60 shadow-none">
            <div className="p-4 sm:p-5"><h2 className="font-semibold">Event breakdown</h2><p className="mt-1 text-xs text-muted-foreground">Events grouped by category and name.</p></div>
            {report.eventBreakdown.length === 0 ? <EmptyState>No analytics events recorded for this period.</EmptyState> : (
              <div className="grid gap-2 p-4 pt-0 sm:grid-cols-2 xl:grid-cols-3 sm:p-5 sm:pt-0">
                {report.eventBreakdown.slice(0, 18).map((event) => <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2" key={`${event.category}-${event.name}`}><div className="min-w-0"><p className="truncate text-sm font-medium" title={event.name}>{event.name}</p><p className="truncate text-xs text-muted-foreground" title={event.category}>{event.category}</p></div><span className="shrink-0 text-sm font-semibold tabular-nums">{event.count.toLocaleString()}</span></div>)}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </section>
  );
}