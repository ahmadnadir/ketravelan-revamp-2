import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Lock, RefreshCw, ShieldAlert, Trash2, Unlock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getAdminAccess, hasPermission } from '@/admin/lib/adminAccess';
import {
  executeModerationAction,
  getModerationReport,
  transitionModerationReport,
  type ModerationActionType,
  type ModerationReportDetail,
  type ModerationStatus,
} from '@/admin/lib/adminModeration';

const humanize = (value: string) => value.replace(/_/g, ' ');
const formatDate = (value: string | null) => value ? new Date(value).toLocaleString() : '—';
type ContentAction = 'hide' | 'unhide' | 'delete' | 'restore' | 'lock' | 'unlock';

function supportedActions(report: ModerationReportDetail): ContentAction[] {
  const content = report.content;
  if (!content) return [];
  const contentType = report.content_type;
  const softModeratedTypes = ['story', 'story_comment', 'discussion', 'discussion_reply'];
  if (softModeratedTypes.includes(contentType)) {
    const actions: ContentAction[] = content.deleted === true ? ['restore'] : ['hide', 'delete'];
    if (content.deleted !== true && content.hidden === true) actions[0] = 'unhide';
    if (contentType === 'discussion' && content.deleted !== true) actions.push(content.locked === true ? 'unlock' : 'lock');
    return actions;
  }
  if (contentType === 'trip_chat_message') return content.deleted === true ? ['restore'] : ['delete'];
  return [];
}

const actionLabel: Record<ContentAction, string> = {
  hide: 'Hide content', unhide: 'Unhide content', delete: 'Remove content',
  restore: 'Restore content', lock: 'Lock discussion', unlock: 'Unlock discussion',
};

export default function AdminModerationDetail() {
  const { reportId = '' } = useParams();
  const { toast } = useToast();
  const [report, setReport] = useState<ModerationReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [notes, setNotes] = useState('');
  const [pendingAction, setPendingAction] = useState<ContentAction | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Exclude<ModerationStatus, 'open'> | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      setReport(await getModerationReport(reportId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load report.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => { void load(); }, [load, refreshKey]);
  useEffect(() => {
    let active = true;
    void getAdminAccess().then((access) => {
      if (active) setCanManage(hasPermission(access, 'moderation.manage'));
    });
    return () => { active = false; };
  }, []);

  const actions = useMemo(() => report ? supportedActions(report) : [], [report]);
  const isClosed = report?.status === 'resolved' || report?.status === 'dismissed';

  const runAction = async () => {
    if (!report || !pendingAction) return;
    if (!notes.trim()) {
      toast({ title: 'Reason required', description: 'Add a reason for the moderation action.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await executeModerationAction({
        reportId: report.id,
        contentType: report.content_type,
        contentId: report.content_id,
        actionType: pendingAction,
        reason: notes,
      });
      toast({ title: `${actionLabel[pendingAction]} recorded` });
      setPendingAction(null);
      setNotes('');
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast({ title: 'Moderation action failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status: Exclude<ModerationStatus, 'open'>) => {
    if (!report) return;
    setBusy(true);
    try {
      await transitionModerationReport(report.id, status, notes);
      toast({ title: `Report moved to ${humanize(status)}` });
      setPendingStatus(null);
      setNotes('');
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast({ title: 'Could not update report', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="space-y-4"><div className="h-8 w-40 animate-pulse rounded bg-muted" /><div className="h-52 animate-pulse rounded-xl bg-muted" /></div>;
  if (!report) return <section className="space-y-4"><Button asChild variant="ghost"><Link to="/admin/moderation"><ArrowLeft className="mr-2 h-4 w-4" />Back to moderation</Link></Button><Card role="alert" className="p-8 text-center">{errorMessage || 'Report not found.'}</Card></section>;

  const content = report.content;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost" className="-ml-3"><Link to="/admin/moderation"><ArrowLeft className="mr-2 h-4 w-4" />Back to moderation</Link></Button><Button variant="outline" size="sm" onClick={() => setRefreshKey((value) => value + 1)}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
      {errorMessage && <Card role="alert" className="border-destructive/30 p-4 text-sm text-destructive">{errorMessage}</Card>}

      <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-muted-foreground">Report {report.id}</p><h1 className="mt-1 text-2xl font-semibold capitalize">{humanize(report.reason)}</h1><p className="mt-1 text-sm text-muted-foreground">{humanize(report.content_type)} · Submitted {formatDate(report.reported_at || report.created_at)}</p></div><Badge variant={report.status === 'resolved' ? 'secondary' : report.status === 'dismissed' ? 'outline' : 'destructive'} className="capitalize">{humanize(report.status)}</Badge></header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <Card className="space-y-4 p-5"><h2 className="font-semibold">Report details</h2><p className="whitespace-pre-wrap text-sm leading-relaxed">{report.description || report.details || 'No additional report details.'}</p><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Report ID</dt><dd className="break-all font-mono text-xs">{report.id}</dd></div><div><dt className="text-xs text-muted-foreground">Created</dt><dd>{formatDate(report.created_at)}</dd></div>{report.resolved_at && <div><dt className="text-xs text-muted-foreground">Closed</dt><dd>{formatDate(report.resolved_at)}</dd></div>}{report.resolved_by && <div><dt className="text-xs text-muted-foreground">Closed by</dt><dd className="break-all font-mono text-xs">{report.resolved_by}</dd></div>}</dl>{report.resolution_notes && <div><p className="text-xs font-medium text-muted-foreground">Resolution notes</p><p className="mt-1 whitespace-pre-wrap text-sm">{report.resolution_notes}</p></div>}</Card>

          <Card className="p-5"><h2 className="font-semibold">People</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Link to={`/admin/users/${report.reporter_id}`} className="flex min-w-0 items-center gap-3 rounded-md p-2 hover:bg-muted/40"><Avatar className="h-10 w-10"><AvatarImage src={report.reporter_avatar || undefined} /><AvatarFallback>{(report.reporter_name || report.reporter_username || 'R').slice(0,2).toUpperCase()}</AvatarFallback></Avatar><span className="min-w-0"><span className="block truncate text-xs text-muted-foreground">Reporter</span><span className="block truncate text-sm font-medium">{report.reporter_name || 'Unknown reporter'}</span><span className="block truncate text-xs text-muted-foreground">@{report.reporter_username || 'unknown'}</span></span></Link>
            {report.reported_user_id ? <Link to={`/admin/users/${report.reported_user_id}`} className="flex min-w-0 items-center gap-3 rounded-md p-2 hover:bg-muted/40"><Avatar className="h-10 w-10"><AvatarImage src={report.reported_user_avatar || undefined} /><AvatarFallback>{(report.reported_user_name || report.reported_user_username || 'U').slice(0,2).toUpperCase()}</AvatarFallback></Avatar><span className="min-w-0"><span className="block truncate text-xs text-muted-foreground">Reported user · {report.reported_user_status || 'unknown status'}</span><span className="block truncate text-sm font-medium">{report.reported_user_name || 'Unknown user'}</span><span className="block truncate text-xs text-muted-foreground">@{report.reported_user_username || 'unknown'}</span></span></Link> : <div className="rounded-md border p-3 text-sm text-muted-foreground">No reported user was attached to this report.</div>}
          </div></Card>

          <Card className="space-y-4 p-5"><div><h2 className="font-semibold">Reported content</h2><p className="mt-1 text-xs text-muted-foreground">{humanize(report.content_type)} · <span className="font-mono">{report.content_id}</span></p></div>{content ? <div className="space-y-3"><div><p className="text-xs font-medium text-muted-foreground">Title</p><p className="mt-1 text-sm font-medium">{String(content.title || 'Content')}</p></div><div><p className="text-xs font-medium text-muted-foreground">Summary</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{String(content.summary || 'No content summary available.')}</p></div>{content.destination && <p className="text-xs text-muted-foreground">Destination: {String(content.destination)}</p>}{content.trip_id && <p className="text-xs text-muted-foreground">Trip ID: {String(content.trip_id)}</p>}{content.conversation_id && <p className="text-xs text-muted-foreground">Conversation ID: {String(content.conversation_id)}</p>}</div> : <p className="text-sm text-muted-foreground">The content target no longer exists or could not be resolved.</p>}</Card>

          <Card className="p-5"><h2 className="font-semibold">Moderation history</h2>{report.actions.length ? <div className="mt-3 divide-y">{report.actions.map((item) => <article key={item.id} className="py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium capitalize">{humanize(item.action_type)}</p><time className="text-xs text-muted-foreground">{formatDate(item.created_at)}</time></div><p className="mt-1 text-xs text-muted-foreground">Moderator: {item.moderator_name || item.moderator_username || item.moderator_id}</p>{item.reason && <p className="mt-1 whitespace-pre-wrap text-sm">{item.reason}</p>}</article>)}</div> : <p className="mt-3 text-sm text-muted-foreground">No actions recorded for this report.</p>}</Card>
        </div>

        <aside className="space-y-5">
          <Card className="space-y-3 p-5"><h2 className="font-semibold">Report workflow</h2>{!canManage ? <p className="text-sm text-muted-foreground">View-only access.</p> : isClosed ? <p className="text-sm text-muted-foreground">This report is closed.</p> : <>
            {report.status === 'open' && <Button className="w-full" variant="outline" disabled={busy} onClick={() => setPendingStatus('under_review')}>Move to under review</Button>}
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Reason for content action or resolution notes" rows={4} />
            {report.status !== 'resolved' && <Button className="w-full" disabled={busy} onClick={() => setPendingStatus('resolved')}>Resolve report</Button>}
            {report.status !== 'dismissed' && <Button className="w-full" variant="ghost" disabled={busy} onClick={() => setPendingStatus('dismissed')}>Dismiss report</Button>}
            <p className="text-xs text-muted-foreground">Transitions are validated by the server; open reports can move to review or close, and reviewed reports can resolve or dismiss.</p>
          </>}</Card>

          <Card className="space-y-3 p-5"><h2 className="font-semibold">Content actions</h2>{!canManage ? <p className="text-sm text-muted-foreground">View-only access.</p> : isClosed ? <p className="text-sm text-muted-foreground">Reopen the report through a future moderation workflow before taking more actions.</p> : !actions.length ? <p className="text-sm text-muted-foreground">No content action is supported for this target type in the current schema. Report workflow actions remain available above.</p> : <><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Required action reason" rows={3} />{actions.map((action) => <Button key={action} className="w-full" variant={action === 'delete' ? 'destructive' : 'outline'} disabled={busy || !notes.trim()} onClick={() => setPendingAction(action)}>{action === 'lock' || action === 'unlock' ? action === 'lock' ? <Lock className="mr-2 h-4 w-4" /> : <Unlock className="mr-2 h-4 w-4" /> : action === 'delete' || action === 'restore' ? <Trash2 className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}{action === 'hide' ? 'Hide content' : action === 'unhide' ? 'Unhide content' : action === 'delete' ? 'Remove content' : action === 'restore' ? 'Restore content' : action === 'lock' ? 'Lock discussion' : 'Unlock discussion'}</Button>)}<p className="text-xs text-muted-foreground">Actions are limited to content types with an implemented moderation state. Unsupported target actions remain disabled by omission.</p></>}</Card>
        </aside>
      </div>

      <AlertDialog open={Boolean(pendingStatus || pendingAction)} onOpenChange={(open) => { if (!open) { setPendingStatus(null); setPendingAction(null); } }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm moderation change</AlertDialogTitle><AlertDialogDescription>{pendingStatus ? `Move this report to ${humanize(pendingStatus)}?` : `Apply ${humanize(pendingAction || '')} to the reported content?`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy || (!notes.trim() && Boolean(pendingAction))} onClick={(event) => { event.preventDefault(); if (pendingStatus) void changeStatus(pendingStatus); else void runAction(); }}>{busy ? 'Saving…' : 'Confirm'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
