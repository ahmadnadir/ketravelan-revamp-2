import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, Search,
  ShieldAlert, UserRound, UserRoundX,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getAdminAccess, hasPermission, type AdminAccess } from '@/admin/lib/adminAccess';
import {
  countAdminUsers, getAdminUser, listAdminUsers, performAdminUserAction,
  type AccountStatus, type AdminUser, type AdminUserDetails,
  type UserRoleFilter, type UserSort, type UserAction, type UserQuery,
} from '@/admin/lib/adminUsers';

const PAGE_SIZE = 25;
const initialQuery = {
  status: 'all' as AccountStatus,
  role: 'all' as UserRoleFilter,
  sort: 'joined_desc' as UserSort,
};

function initials(name: string | null, username: string | null, email: string | null) {
  return (name || username || email || 'User').trim().slice(0, 2).toUpperCase();
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'active' ? 'secondary' : 'destructive';
  return <Badge variant={variant} className="capitalize">{status}</Badge>;
}

export default function AdminUsers() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [filters, setFilters] = useState(initialQuery);
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [detail, setDetail] = useState<AdminUserDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [action, setAction] = useState<UserAction | null>(null);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [access, setAccess] = useState<AdminAccess | null>(null);

  const canManage = hasPermission(access, 'users.manage');
  useEffect(() => {
    let active = true;
    void getAdminAccess().then((value) => { if (active) setAccess(value); });
    return () => { active = false; };
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const query: UserQuery = {
        search: deferredSearch,
        ...filters,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      };
      const [rows, count] = await Promise.all([
        listAdminUsers(query),
        countAdminUsers(query),
      ]);
      setUsers(rows);
      setTotal(count);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, [deferredSearch, filters, page, refreshKey]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  useEffect(() => {
    if (!userId) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetail(null);
    setDetailLoading(true);
    getAdminUser(userId)
      .then((value) => { if (active) setDetail(value); })
      .catch((error) => {
        if (active) toast({ title: 'Unable to load user', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
      })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [userId, refreshKey, toast]);

  const updateFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setPage(0);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const runAction = async () => {
    if (!userId || !action) return;
    if (action === 'suspend' && !reason.trim()) {
      toast({ title: 'Reason required', description: 'Add a suspension reason before continuing.', variant: 'destructive' });
      return;
    }
    setActionBusy(true);
    try {
      await performAdminUserAction(userId, action, reason);
      const titles: Record<UserAction, string> = {
        suspend: 'User suspended', restore: 'User restored',
      };
      toast({ title: titles[action] });
      setAction(null);
      setReason('');
      setRefreshKey((key) => key + 1);
    } catch (error) {
      toast({ title: 'Action failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setActionBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (userId) {
    return (
      <div>
        <Button variant="ghost" className="mb-4 -ml-3" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to users
        </Button>
        {detailLoading ? (
          <Card className="animate-pulse p-6"><div className="h-5 w-48 rounded bg-muted" /><div className="mt-5 h-28 rounded bg-muted" /></Card>
        ) : !detail ? (
          <Card className="p-8 text-center">
            <UserRoundX className="mx-auto h-8 w-8 text-muted-foreground" />
            <h1 className="mt-3 text-lg font-semibold">User not found</h1>
            <p className="mt-1 text-sm text-muted-foreground">This profile may have been removed or is unavailable.</p>
          </Card>
        ) : (
          <div className="space-y-5">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <button
                  type="button"
                  aria-label={`View ${detail.full_name || detail.username || 'user'} profile photo`}
                  onClick={() => setAvatarPreviewOpen(true)}
                  className="shrink-0 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Avatar className="h-14 w-14 cursor-zoom-in transition-transform hover:scale-105">
                    <AvatarImage src={detail.avatar_url || undefined} />
                    <AvatarFallback>{initials(detail.full_name, detail.username, detail.email)}</AvatarFallback>
                  </Avatar>
                </button>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-semibold">{detail.full_name || 'Unnamed user'}</h1>
                  <p className="truncate text-sm text-muted-foreground">@{detail.username || 'no-username'} · {detail.email || 'No email'}</p>
                  <div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline" className="capitalize">{detail.role}</Badge><StatusBadge status={detail.account_status} /></div>
                </div>
              </div>
              {canManage && !detail.is_deleted && (
                <div className="flex flex-wrap gap-2">
                  {detail.account_status === 'suspended'
                    ? <Button variant="outline" onClick={() => setAction('restore')}>Restore account</Button>
                    : <Button variant="destructive" onClick={() => setAction('suspend')}><ShieldAlert className="mr-2 h-4 w-4" />Suspend account</Button>}
                </div>
              )}
            </header>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Trips organized', detail.trips_organized], ['Trips joined', detail.trips_joined],
                ['Countries visited', detail.countries_visited ?? 0], ['Profile views', detail.profile_views ?? 0],
              ].map(([label, value]) => <Card key={String(label)} className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></Card>)}
            </section>

            <div className="grid gap-5 xl:grid-cols-2">
              <Card className="p-5">
                <h2 className="font-semibold">Profile & account</h2>
                <dl className="mt-4 grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-muted-foreground">Email confirmation</dt><dd>{detail.email_confirmed ? 'Confirmed' : 'Unconfirmed'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Phone</dt><dd>{detail.phone || '-'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Location</dt><dd>{detail.location || '-'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Joined</dt><dd>{formatDate(detail.created_at)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Last active</dt><dd>{formatDate(detail.last_active_at)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Updated</dt><dd>{formatDate(detail.updated_at)}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Bio</dt><dd className="whitespace-pre-wrap">{detail.bio || '-'}</dd></div>
                  {detail.account_status === 'suspended' && <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Suspension reason</dt><dd>{detail.suspension_reason || '-'}</dd></div>}
                </dl>
              </Card>

              <Card className="p-5">
                <h2 className="font-semibold">Safety & moderation</h2>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Reports received</dt><dd className="mt-1 font-medium">{detail.reports_received}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Reports submitted</dt><dd className="mt-1 font-medium">{detail.reports_submitted}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Feedback reports</dt><dd className="mt-1 font-medium">{detail.user_reports_submitted}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Blocked by others</dt><dd className="mt-1 font-medium">{detail.blocked_by_count}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Blocks created</dt><dd className="mt-1 font-medium">{detail.blocks_count}</dd></div>
                </dl>
                <h3 className="mt-5 text-sm font-medium">Recent moderation actions</h3>
                {detail.moderation_actions.length ? <ul className="mt-2 divide-y">{detail.moderation_actions.map((item, index) => <li key={`${item.created_at}-${index}`} className="py-2 text-sm"><span className="capitalize">{item.action_type.replace(/_/g, ' ')}</span><span className="ml-2 text-xs text-muted-foreground">{formatDate(item.created_at)}</span>{item.reason && <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No moderation history.</p>}
              </Card>
            </div>

            <Card className="p-5">
              <h2 className="font-semibold">Recent trips</h2>
              {detail.recent_trips.length ? <div className="mt-3 divide-y">{detail.recent_trips.map((trip) => <div key={`${trip.id}-${trip.relationship}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><p className="font-medium">{trip.title}</p><p className="text-xs text-muted-foreground">{trip.destination} · {trip.relationship}</p></div><div className="text-right"><Badge variant="outline" className="capitalize">{trip.status}</Badge><p className="mt-1 text-xs text-muted-foreground">{formatDate(trip.created_at)}</p></div></div>)}</div> : <p className="mt-3 text-sm text-muted-foreground">No trips found.</p>}
            </Card>
          </div>
        )}

        <Dialog open={avatarPreviewOpen} onOpenChange={setAvatarPreviewOpen}>
          <DialogContent className="w-fit max-h-[90dvh] max-w-[90vw] overflow-hidden border-0 bg-transparent p-0 shadow-none [&>button]:right-3 [&>button]:top-3 [&>button]:h-10 [&>button]:w-10 [&>button]:bg-background [&>button]:text-foreground [&>button]:shadow-md">
            <DialogTitle className="sr-only">{detail?.full_name || detail?.username || 'User'} profile photo</DialogTitle>
            <DialogDescription className="sr-only">Expanded profile avatar. Close the dialog to return to user details.</DialogDescription>
            {detail?.avatar_url ? (
              <img
                src={detail.avatar_url}
                alt={`${detail.full_name || detail.username || 'User'} profile`}
                className="mx-auto max-h-[85dvh] max-w-full rounded-xl object-contain shadow-2xl"
              />
            ) : (
              <div className="mx-auto flex aspect-square w-64 items-center justify-center rounded-full bg-muted text-6xl font-semibold text-muted-foreground shadow-2xl">
                {detail ? initials(detail.full_name, detail.username, detail.email) : <UserRound className="h-20 w-20" />}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={Boolean(action)} onOpenChange={(open) => { if (!open) { setAction(null); setReason(''); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{action === 'suspend' ? 'Suspend this account?' : 'Restore this account?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {action === 'suspend' ? 'The user will be blocked from signing in. Enter a reason for the audit record.' : 'This action will be recorded in the administrator audit log.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {action === 'suspend' && <Textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Suspension reason (required)" rows={3} />}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={actionBusy || (action === 'suspend' && !reason.trim())} onClick={(event) => { event.preventDefault(); void runAction(); }} className={action === 'suspend' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}>
                {actionBusy ? 'Working…' : 'Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Administration</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Search, filter and manage platform accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{total.toLocaleString()} users</span>
          <Button variant="outline" size="icon" title="Refresh users" aria-label="Refresh users" disabled={loading} onClick={() => setRefreshKey((key) => key + 1)}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </header>

      <section aria-label="User filters" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="relative block xl:col-span-2">
          <span className="sr-only">Search name, username or email</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => { setPage(0); setSearch(event.target.value); }} placeholder="Search name, username or email" className="pl-9" />
        </label>
        <label className="block"><span className="sr-only">Account status</span><select value={filters.status} onChange={(event) => updateFilter('status', event.target.value as AccountStatus)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="deleted">Deleted</option></select></label>
        <label className="block"><span className="sr-only">User type</span><select value={filters.role} onChange={(event) => updateFilter('role', event.target.value as UserRoleFilter)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="all">All user types</option><option value="traveler">Traveler</option><option value="agent">Agent</option></select></label>
        <label className="block"><span className="sr-only">Sort users</span><select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value as UserSort)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="joined_desc">Newest joined</option><option value="joined_asc">Oldest joined</option><option value="name_asc">Name A–Z</option><option value="name_desc">Name Z–A</option><option value="active_desc">Recently active</option></select></label>
      </section>

      {loadError && <Card role="alert" className="mt-4 border-destructive/30 p-4 text-sm text-destructive">Unable to load users: {loadError}</Card>}

      <Card className="mt-4 overflow-hidden border-border/60">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-center font-medium">Type</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Organized</th>
                <th className="px-4 py-3 text-center font-medium">Joined</th>
                <th className="px-4 py-3 text-center font-medium">Joined date</th>
                <th className="px-4 py-3 text-center font-medium">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && Array.from({ length: 6 }, (_, index) => <tr key={index}><td colSpan={8} className="px-4 py-3"><div className="h-8 animate-pulse rounded bg-muted" /></td></tr>)}
              {!loading && !loadError && users.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No users match these filters.</td></tr>}
              {!loading && users.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3"><button type="button" className="flex items-center gap-3 text-left" onClick={() => navigate(`/admin/users/${item.id}`)}><Avatar className="h-9 w-9"><AvatarImage src={item.avatar_url || undefined} /><AvatarFallback>{initials(item.full_name, item.username, item.email)}</AvatarFallback></Avatar><span className="min-w-0"><span className="block max-w-48 truncate font-medium">{item.full_name || 'Unnamed user'}</span><span className="block max-w-48 truncate text-xs text-muted-foreground">@{item.username || 'no-username'}</span></span></button></td>
                  <td className="px-4 py-3 text-left">{item.email || '-'}</td>
                  <td className="px-4 py-3 text-center"><Badge variant="outline" className="capitalize">{item.role}</Badge></td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={item.account_status} /></td>
                  <td className="px-4 py-3 text-center">{item.trips_organized}</td>
                  <td className="px-4 py-3 text-center">{item.trips_joined}</td>
                  <td className="px-4 py-3 text-center">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{formatDate(item.last_active_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y md:hidden">
          {loading && Array.from({ length: 5 }, (_, index) => <div key={index} className="p-4"><div className="h-16 animate-pulse rounded bg-muted" /></div>)}
          {!loading && !loadError && users.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No users match these filters.</p>}
          {!loading && users.map((item) => <button key={item.id} type="button" onClick={() => navigate(`/admin/users/${item.id}`)} className="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/20"><Avatar className="h-11 w-11"><AvatarImage src={item.avatar_url || undefined} /><AvatarFallback>{initials(item.full_name, item.username, item.email)}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate font-medium">{item.full_name || 'Unnamed user'}</span><span className="block truncate text-xs text-muted-foreground">@{item.username || 'no-username'} · {item.email || 'no email'}</span><span className="mt-2 flex flex-wrap items-center gap-2"><Badge variant="outline" className="capitalize">{item.role}</Badge><StatusBadge status={item.account_status} /></span><span className="mt-2 block text-xs text-muted-foreground">{item.trips_organized} organized · {item.trips_joined} joined · joined {formatDate(item.created_at)}</span></span></button>)}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">{total === 0 ? 'No results' : `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`}</span>
          <div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><span className="text-xs text-muted-foreground">{page + 1}/{totalPages}</span><Button size="sm" variant="outline" disabled={page + 1 >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></div>
        </footer>
      </Card>
    </div>
  );
}
