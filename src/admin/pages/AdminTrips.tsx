import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, RefreshCw, Search, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { countAdminTrips, listAdminTrips, type AdminTrip, type AdminTripQuery, type TripFeatured, type TripSort, type TripStatus, type TripType, type TripVisibility } from '@/admin/lib/adminTrips';

const INITIAL_FILTERS = {
  status: 'all' as TripStatus,
  visibility: 'all' as TripVisibility,
  tripType: 'all' as TripType,
  creatorUsername: '',
  createdFrom: '',
  createdTo: '',
  startFrom: '',
  startTo: '',
  featured: 'all' as TripFeatured,
  sort: 'newest' as TripSort,
};
const DEFAULT_TRIP_PHOTO = '/default-trip-photo.jpeg';

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function initials(name: string | null, username: string | null) {
  return (name || username || 'U').trim().slice(0, 2).toUpperCase();
}

function TripStatusBadge({ status }: { status: string }) {
  return <Badge variant={status === 'published' ? 'secondary' : status === 'cancelled' ? 'destructive' : 'outline'} className="capitalize">{status.replace(/_/g, ' ')}</Badge>;
}

export default function AdminTrips() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [trips, setTrips] = useState<AdminTrip[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(() => Math.max(0, Number.parseInt(searchParams.get('page') || '0', 10) || 0));
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const query: AdminTripQuery = {
        search: deferredSearch,
        ...filters,
        limit: pageSize,
        offset: page * pageSize,
      };
      const [rows, count] = await Promise.all([listAdminTrips(query), countAdminTrips(query)]);
      setTrips(rows);
      setTotal(count);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load trips.');
    } finally {
      setLoading(false);
    }
  }, [deferredSearch, filters, page, pageSize]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (page > 0) next.set('page', String(page));
      else next.delete('page');
      return next;
    }, { replace: true });
  }, [page, setSearchParams]);

  const tripDetailPath = (tripId: string) => `/admin/trips/${tripId}?fromPage=${page}`;

  const setFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setPage(0);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const filterControls = (
    <>
      <label className="relative block xl:col-span-2">
        <span className="sr-only">Search trips, destination, slug or creator</span>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(event) => { setPage(0); setSearch(event.target.value); }} placeholder="Search title, destination, slug or creator" className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" />
      </label>
      <label><span className="sr-only">Status</span><select value={filters.status} onChange={(event) => setFilter('status', event.target.value as TripStatus)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
      <label><span className="sr-only">Visibility</span><select value={filters.visibility} onChange={(event) => setFilter('visibility', event.target.value as TripVisibility)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="all">All visibility</option><option value="public">Public</option><option value="private">Private</option><option value="unlisted">Unlisted</option></select></label>
      <label><span className="sr-only">Trip type</span><select value={filters.tripType} onChange={(event) => setFilter('tripType', event.target.value as TripType)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="all">All types</option><option value="community">Community</option><option value="guided">Guided</option></select></label>
      <label className="grid min-w-0 gap-1"><span className="text-xs text-muted-foreground">Creator username</span><input value={filters.creatorUsername} onChange={(event) => setFilter('creatorUsername', event.target.value)} placeholder="Creator username" className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
      <label className="grid min-w-0 gap-1"><span className="text-xs text-muted-foreground">Trip created from</span><input type="date" aria-label="Trip created from" value={filters.createdFrom} onChange={(event) => setFilter('createdFrom', event.target.value)} className="h-10 min-w-0 w-full rounded-md border bg-background px-3 text-sm" /></label>
      <label className="grid min-w-0 gap-1"><span className="text-xs text-muted-foreground">Trip created to</span><input type="date" aria-label="Trip created to" value={filters.createdTo} onChange={(event) => setFilter('createdTo', event.target.value)} className="h-10 min-w-0 w-full rounded-md border bg-background px-3 text-sm" /></label>
      <label className="grid min-w-0 gap-1"><span className="text-xs text-muted-foreground">Trip starts from</span><input type="date" aria-label="Trip starts from" value={filters.startFrom} onChange={(event) => setFilter('startFrom', event.target.value)} className="h-10 min-w-0 w-full rounded-md border bg-background px-3 text-sm" /></label>
      <label className="grid min-w-0 gap-1"><span className="text-xs text-muted-foreground">Trip starts to</span><input type="date" aria-label="Trip starts to" value={filters.startTo} onChange={(event) => setFilter('startTo', event.target.value)} className="h-10 min-w-0 w-full rounded-md border bg-background px-3 text-sm" /></label>
      <label><span className="sr-only">Featured status</span><select value={filters.featured} onChange={(event) => setFilter('featured', event.target.value as TripFeatured)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="all">Featured: all</option><option value="featured">Featured</option><option value="not_featured">Not featured</option></select></label>
      <label><span className="sr-only">Sort trips</span><select value={filters.sort} onChange={(event) => setFilter('sort', event.target.value as TripSort)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="updated">Recently updated</option><option value="views">Most viewed</option><option value="rating">Highest rated</option><option value="participants">Most participants</option><option value="start_date">Start date</option></select></label>
    </>
  );

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-medium text-primary">Administration</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Trips</h1><p className="mt-1 text-sm text-muted-foreground">Search, review and manage existing platform trips.</p></div>
        <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">{total.toLocaleString()} trips</span><Button variant="outline" size="icon" aria-label="Refresh trips" title="Refresh trips" disabled={loading} onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button></div>
      </header>

      <Card className="hidden border-border/60 p-4 md:block">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{filterControls}</div>
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground"><span>Rows</span><select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPage(0); setPageSize(Number(event.target.value)); }} className="h-8 rounded-md border bg-background px-2"><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select><span>per page</span></div>
      </Card>

      <button type="button" className="text-sm text-primary md:hidden" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>{filtersOpen ? 'Hide filters' : 'Show filters'}</button>
      {filtersOpen && <Card className="grid gap-3 p-4 md:hidden">{filterControls}</Card>}

      {errorMessage && <Card role="alert" className="border-destructive/30 p-4 text-sm text-destructive">Could not load trips: {errorMessage}</Card>}

      <Card className="overflow-hidden border-border/60">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="border-b bg-muted/40 text-center text-muted-foreground"><tr><th className="px-4 py-3">Trip</th><th className="px-4 py-3">Creator</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Visibility</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Participants</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y">
              {loading && Array.from({ length: 6 }, (_, index) => <tr key={index}><td colSpan={10} className="px-4 py-3"><div className="h-9 animate-pulse rounded bg-muted" /></td></tr>)}
              {!loading && !errorMessage && !trips.length && <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">No trips match these filters.</td></tr>}
              {!loading && trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-left"><Link to={tripDetailPath(trip.id)} className="flex w-full items-center justify-start gap-3 text-left"><img src={trip.cover_image || DEFAULT_TRIP_PHOTO} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = DEFAULT_TRIP_PHOTO; }} alt="" className="h-11 w-14 shrink-0 rounded-md bg-muted object-cover" /><span className="min-w-0"><span className="flex items-center justify-start gap-1 font-medium">{trip.title || 'Untitled'}{trip.is_featured && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />}</span><span className="block truncate text-xs text-muted-foreground">{trip.destination || 'No destination'}</span></span></Link></td>
                  <td className="px-4 py-3 text-center"><span>{trip.creator_name || trip.creator_username || 'Unknown'}</span><span className="block text-xs text-muted-foreground">@{trip.creator_username || '-'}</span></td>
                  <td className="px-4 py-3 text-center capitalize">{trip.trip_type || '-'}</td>
                  <td className="px-4 py-3 text-center"><TripStatusBadge status={trip.status} /></td>
                  <td className="px-4 py-3 text-center capitalize">{trip.visibility || '-'}</td>
                  <td className="px-4 py-3 text-center text-xs">{formatDate(trip.start_date)}<span className="block text-muted-foreground">to {formatDate(trip.end_date)}</span></td>
                  <td className="px-4 py-3 text-center">{trip.current_participants ?? 0}{trip.max_participants ? ` / ${trip.max_participants}` : ''}</td>
                  <td className="px-4 py-3 text-center">{trip.price == null ? '-' : `${trip.currency || ''} ${trip.price}`}</td>
                  <td className="px-4 py-3 text-center">{trip.rating_average == null ? '-' : `${Number(trip.rating_average).toFixed(1)} (${trip.rating_count ?? 0})`}</td>
                  <td className="px-4 py-3 text-center"><Link to={tripDetailPath(trip.id)} className="inline-flex items-center justify-center gap-1 rounded-md border px-2.5 py-1.5 text-xs"><Eye className="h-3.5 w-3.5" />View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y md:hidden">
          {loading && Array.from({ length: 5 }, (_, index) => <div key={index} className="p-4"><div className="h-24 animate-pulse rounded bg-muted" /></div>)}
          {!loading && !errorMessage && !trips.length && <p className="p-8 text-center text-sm text-muted-foreground">No trips match these filters.</p>}
          {!loading && trips.map((trip) => <Link key={trip.id} to={tripDetailPath(trip.id)} className="flex gap-3 p-4"><img src={trip.cover_image || DEFAULT_TRIP_PHOTO} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = DEFAULT_TRIP_PHOTO; }} alt="" className="h-20 w-24 shrink-0 rounded-lg bg-muted object-cover" /><span className="min-w-0 flex-1"><span className="flex items-center gap-1 font-medium">{trip.title || 'Untitled'}{trip.is_featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />}</span><span className="block truncate text-xs text-muted-foreground">{trip.destination} · {trip.creator_name || trip.creator_username || 'Unknown'}</span><span className="mt-2 flex flex-wrap items-center gap-2"><TripStatusBadge status={trip.status} /><Badge variant="outline" className="capitalize">{trip.visibility || 'public'}</Badge></span><span className="mt-1 block text-xs text-muted-foreground">{trip.current_participants ?? 0} participants · {formatDate(trip.start_date)}</span></span></Link>)}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3"><span className="text-xs text-muted-foreground">{total ? `Showing ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} of ${total}` : 'No trips'}</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page === 0 || loading} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><span className="text-xs text-muted-foreground">{page + 1}/{pageCount}</span><Button size="sm" variant="outline" disabled={page + 1 >= pageCount || loading} onClick={() => setPage((current) => current + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></div></footer>
      </Card>
    </section>
  );
}
