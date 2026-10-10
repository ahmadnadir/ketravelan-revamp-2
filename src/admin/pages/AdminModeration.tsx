import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getAdminAccess, hasPermission } from '@/admin/lib/adminAccess';
import {
  countModerationReports,
  listModerationReports,
  MODERATION_CONTENT_TYPES,
  MODERATION_STATUSES,
  type ModerationContentType,
  type ModerationReport,
  type ModerationStatus,
} from '@/admin/lib/adminModeration';

const PAGE_SIZE = 20;
const humanize = (value: string) => value.replace(/_/g, ' ');
const formatDate = (value: string) => new Date(value).toLocaleString();

function reportStatusStyle(status: ModerationStatus) {
  if (status === 'resolved') return 'secondary' as const;
  if (status === 'dismissed') return 'outline' as const;
  return 'destructive' as const;
}

export default function AdminModeration() {
  const [canView, setCanView] = useState(false);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<ModerationStatus | 'all'>('open');
  const [contentType, setContentType] = useState<ModerationContentType | 'all'>('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    void getAdminAccess().then((access) => {
      if (active) setCanView(hasPermission(access, 'moderation.view'));
    });
    return () => { active = false; };
  }, []);

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const params = { search: deferredSearch, status, contentType, limit: PAGE_SIZE, offset: page * PAGE_SIZE };
      const [rows, count] = await Promise.all([
        listModerationReports(params),
        countModerationReports(params),
      ]);
      setReports(rows);
      setTotal(count);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load moderation reports.');
    } finally {
      setLoading(false);
    }
  }, [canView, deferredSearch, status, contentType, page, refreshKey]);

  useEffect(() => { void load(); }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const openOnPage = reports.filter((report) => report.status === 'open').length;
  const underReviewOnPage = reports.filter((report) => report.status === 'under_review').length;

  const changeFilter = <T,>(setter: (value: T) => void, value: T) => {
    setPage(0);
    setter(value);
  };

  const filters = (
    <>
      <label className="relative block md:col-span-2">
        <span className="sr-only">Search reports, users, IDs, or reason</span>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(event) => { setPage(0); setSearch(event.target.value); }} placeholder="Search reports, users, IDs, or reason" className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" />
      </label>
      <label><span className="sr-only">Filter by report status</span><select value={status} onChange={(event) => changeFilter(setStatus, event.target.value as ModerationStatus | 'all')} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="all">All statuses</option>{MODERATION_STATUSES.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
      <label><span className="sr-only">Filter by content type</span><select value={contentType} onChange={(event) => changeFilter(setContentType, event.target.value as ModerationContentType | 'all')} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="all">All content types</option>{MODERATION_CONTENT_TYPES.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
    </>
  );

  if (!canView && !loading) {
    return <Card className="p-8 text-center"><ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" /><h1 className="mt-3 font-semibold">Moderation access required</h1><p className="mt-1 text-sm text-muted-foreground">Your administrator role cannot view the moderation queue.</p></Card>;
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-medium text-primary">Safety</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Moderation Center</h1><p className="mt-1 text-sm text-muted-foreground">Review reports from the canonical community moderation queue.</p></div>
        <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">{total.toLocaleString()} reports</span><Button variant="outline" size="icon" aria-label="Refresh reports" title="Refresh reports" disabled={loading} onClick={() => setRefreshKey((value) => value + 1)}><RefreshCw className="h-4 w-4" /></Button></div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Matching reports</p><p className="mt-1 text-2xl font-semibold">{total.toLocaleString()}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Open on this page</p><p className="mt-1 text-2xl font-semibold">{openOnPage}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Under review on this page</p><p className="mt-1 text-2xl font-semibold">{underReviewOnPage}</p></Card>
      </section>

      <Card className="hidden border-border/60 p-4 md:block"><div className="grid gap-3 md:grid-cols-4">{filters}</div></Card>
      <Button variant="ghost" size="sm" className="px-0 md:hidden" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>{filtersOpen ? 'Hide filters' : 'Show filters'}</Button>
      {filtersOpen && <Card className="grid gap-3 p-4 md:hidden">{filters}</Card>}

      {errorMessage && <Card role="alert" className="border-destructive/30 p-4 text-sm text-destructive">Unable to load reports: {errorMessage}</Card>}

      <Card className="overflow-hidden border-border/60">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Report</th><th className="px-4 py-3 font-medium">Content</th><th className="px-4 py-3 font-medium">Reporter</th><th className="px-4 py-3 font-medium">Reported user</th><th className="px-4 py-3 font-medium">Reason</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Created</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y">
              {loading && Array.from({ length: 6 }, (_, index) => <tr key={index}><td colSpan={8} className="px-4 py-3"><div className="h-9 animate-pulse rounded bg-muted" /></td></tr>)}
              {!loading && !errorMessage && reports.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No reports match these filters.</td></tr>}
              {!loading && reports.map((report) => <tr key={report.id} className="hover:bg-muted/20"><td className="px-4 py-3 font-mono text-xs">{report.id.slice(0,8)}</td><td className="px-4 py-3 capitalize">{humanize(report.content_type)}</td><td className="px-4 py-3">{report.reporter_name || report.reporter_username || 'Unknown'}</td><td className="px-4 py-3">{report.reported_user_name || report.reported_user_username || '—'}</td><td className="max-w-56 truncate px-4 py-3 capitalize">{humanize(report.reason)}</td><td className="px-4 py-3"><Badge variant={reportStatusStyle(report.status)} className="capitalize">{humanize(report.status)}</Badge></td><td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(report.reported_at || report.created_at)}</td><td className="px-4 py-3"><Button asChild size="sm" variant="ghost"><Link to={`/admin/moderation/${report.id}`}>Review</Link></Button></td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="divide-y md:hidden">
          {loading && Array.from({ length: 5 }, (_, index) => <div key={index} className="p-4"><div className="h-24 animate-pulse rounded bg-muted" /></div>)}
          {!loading && !errorMessage && reports.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No reports match these filters.</p>}
          {!loading && reports.map((report) => <Link key={report.id} to={`/admin/moderation/${report.id}`} className="block p-4 hover:bg-muted/20"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium capitalize">{humanize(report.content_type)} · {humanize(report.reason)}</p><p className="mt-1 truncate text-sm text-muted-foreground">{report.reported_user_name || report.reported_user_username || 'Reported user not specified'}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(report.reported_at || report.created_at)}</p></div><Badge variant={reportStatusStyle(report.status)} className="shrink-0 capitalize">{humanize(report.status)}</Badge></div><p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{report.description || report.details || 'No report details provided.'}</p></Link>)}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3"><span className="text-xs text-muted-foreground">{total ? `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}` : 'No reports'}</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><span className="text-xs text-muted-foreground">{page + 1}/{pageCount}</span><Button size="sm" variant="outline" disabled={page + 1 >= pageCount || loading} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></div></footer>
      </Card>
    </section>
  );
}
