import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, RefreshCw } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageAttachments } from '@/components/chat/MessageAttachments';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { getAnalyticsDayMessages, getAnalyticsMetricDetails, getAnalyticsTripRequests, type AnalyticsMetricDetails, type AnalyticsRange } from '@/admin/lib/adminAnalytics';
import type { ChatAttachment } from '@/lib/conversations';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 50;

const METRICS = {
  'tracked-events': {
    title: 'Tracked events',
    description: 'Event records grouped by day, category and event name.',
    columns: [['date', 'Date'], ['category', 'Category'], ['event', 'Event'], ['count', 'Events']],
  },
  'unique-users': {
    title: 'Unique users',
    description: 'Distinct signed-in users with at least one tracked event; each username appears once for this period.',
    columns: [['username', 'Username'], ['user_id', 'User ID'], ['events', 'Events'], ['first_seen', 'First seen'], ['last_seen', 'Last seen']],
  },
  'unique-sessions': {
    title: 'Unique sessions',
    description: 'Distinct non-empty session IDs, with the username(s) associated with each session.',
    columns: [['usernames', 'Username(s)'], ['session_id', 'Session ID'], ['events', 'Events'], ['first_seen', 'First seen'], ['last_seen', 'Last seen']],
  },
  'trip-views': {
    title: 'Trip views',
    description: 'Per-trip views use the greater of trip_analytics and trip_view events to avoid double-counting overlapping sources.',
    columns: [['trip', 'Trip'], ['trip_id', 'Trip ID'], ['trip_analytics_views', 'trip_analytics'], ['trip_view_events', 'trip_view events'], ['counted_views', 'Counted views']],
  },
  'join-requests': {
    title: 'Join requests',
    description: 'Per-trip count uses the greatest source total from join_requests, trip_analytics and trip_join_request events.',
    columns: [['trip', 'Trip'], ['trip_id', 'Trip ID'], ['trip_analytics_requests', 'Trip analytics'], ['join_request_events', 'Join request events'], ['join_request_records', 'Join requests'], ['counted_requests', 'Counted requests']],
  },
  conversions: {
    title: 'Conversions',
    description: 'Conversion counts grouped by trip and date from trip_analytics.',
    columns: [['date', 'Date'], ['trip', 'Trip'], ['trip_id', 'Trip ID'], ['conversions', 'Conversions']],
  },
  'messages-sent': {
    title: 'Messages sent',
    description: 'Daily count uses the greatest source total from messages, message_sent events and user_engagement. Open a day to inspect its chat messages.',
    columns: [['date', 'Date'], ['source_primary', 'messages'], ['source_secondary', 'Message sent events'], ['source_tertiary', 'User engagement'], ['counted', 'Counted messages']],
  },
  'session-minutes': {
    title: 'Session minutes',
    description: 'Session-duration source records by user and session. Daily totals use the greater of user_engagement and visible-tab session_duration events.',
    columns: [['date', 'Date'], ['username', 'Username'], ['source', 'Source'], ['session_id', 'Session ID'], ['duration_seconds', 'Duration (sec)'], ['duration_minutes', 'Duration (min)']],
  },
} as const;

type MetricKey = keyof typeof METRICS;

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return error instanceof Error ? error.message : 'Unable to load metric details.';
}

function formatDate(value: unknown) {
  const text = String(value ?? '');
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  return match ? `${match[3]}/${match[2]}/${match[1].slice(-2)}` : text;
}

function formatValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'date') return formatDate(value);
  if (key.endsWith('_seen')) return new Date(String(value)).toLocaleString();
  if (typeof value === 'number' || /^\d+$/.test(String(value))) return Number(value).toLocaleString();
  return String(value);
}

export default function AdminAnalyticsDetail() {
  const { metric } = useParams<{ metric: string }>();
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<AnalyticsMetricDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [selectedMessageDate, setSelectedMessageDate] = useState('');
  const [messagePage, setMessagePage] = useState(0);
  const [messages, setMessages] = useState<AnalyticsMetricDetails | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [selectedJoinTrip, setSelectedJoinTrip] = useState<{ id: string; title: string } | null>(null);
  const [requestPage, setRequestPage] = useState(0);
  const [tripRequests, setTripRequests] = useState<AnalyticsMetricDetails | null>(null);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState('');
  const definition = metric && metric in METRICS ? METRICS[metric as MetricKey] : null;
  const startDate = searchParams.get('from') || '';
  const endDate = searchParams.get('to') || '';
  const range: AnalyticsRange = { startDate, endDate };

  useEffect(() => { setPage(0); }, [metric, startDate, endDate]);

  useEffect(() => {
    if (!definition || !startDate || !endDate || startDate > endDate) {
      setLoading(false);
      setError('This metric or date range is invalid. Return to Analytics and open the metric again.');
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    void getAnalyticsMetricDetails(supabase, metric!, { startDate, endDate }, PAGE_SIZE, page * PAGE_SIZE)
      .then((data) => { if (active) setResult(data); })
      .catch((loadError: unknown) => { if (active) setError(getErrorMessage(loadError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [definition, metric, startDate, endDate, page]);

  useEffect(() => {
    if (!selectedMessageDate) return;
    let active = true;
    setMessagesLoading(true);
    setMessagesError('');
    void getAnalyticsDayMessages(supabase, selectedMessageDate, 100, messagePage * 100)
      .then((data) => { if (active) setMessages(data); })
      .catch((loadError: unknown) => { if (active) setMessagesError(getErrorMessage(loadError)); })
      .finally(() => { if (active) setMessagesLoading(false); });
    return () => { active = false; };
  }, [selectedMessageDate, messagePage]);

  useEffect(() => {
    if (!selectedJoinTrip) return;
    let active = true;
    setRequestsLoading(true);
    setRequestsError('');
    void getAnalyticsTripRequests(supabase, selectedJoinTrip.id, 50, requestPage * 50)
      .then((data) => { if (active) setTripRequests(data); })
      .catch((loadError: unknown) => { if (active) setRequestsError(getErrorMessage(loadError)); })
      .finally(() => { if (active) setRequestsLoading(false); });
    return () => { active = false; };
  }, [selectedJoinTrip, requestPage]);

  if (!definition) {
    return <section className="space-y-4"><Button asChild variant="ghost"><Link to="/admin/analytics"><ArrowLeft />Back to Analytics</Link></Button><Card role="alert" className="p-6">Unknown analytics metric.</Card></section>;
  }

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE));
  const detailColumns = definition.columns as ReadonlyArray<readonly [string, string]>;

  return (
    <section className="space-y-5">
      <Button asChild variant="ghost" className="-ml-3"><Link to={`/admin/analytics?from=${range.startDate}&to=${range.endDate}`}><ArrowLeft />Back to Analytics</Link></Button>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-medium text-primary">Analytics details</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{definition.title}</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{definition.description}</p></div>
        <div className="text-sm text-muted-foreground">{formatDate(range.startDate)} – {formatDate(range.endDate)}</div>
      </header>
      {error && <Card role="alert" className="border-destructive/30 p-4 text-sm text-destructive">Unable to load details: {error}</Card>}
      <Card className="overflow-hidden rounded-lg border-border/60 shadow-none">
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5"><h2 className="font-semibold">Counting details</h2>{loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}</div>
        {loading && !result ? <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-9 animate-pulse rounded bg-muted" />)}</div>
          : !result?.rows.length ? <div className="px-4 py-12 text-center text-sm text-muted-foreground">No source records for this metric in the selected date range.</div>
            : <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-y bg-muted/40 text-muted-foreground">
                  <tr>
                    {detailColumns.map((column) => {
                      const [key, label] = column;
                      const centered = metric === 'join-requests' && ['trip_analytics_requests', 'join_request_events', 'join_request_records', 'counted_requests'].includes(key);
                      return <th key={key} className={`px-4 py-3 font-medium ${centered ? 'text-center' : 'text-left'}`}>{label}</th>;
                    })}
                    {metric === 'messages-sent' && <th className="px-4 py-3 text-left font-medium">Chats</th>}
                    {metric === 'join-requests' && <th className="px-4 py-3 text-left font-medium">Details</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.rows.map((row, index) => <tr key={`${String(row.date ?? row.user_id ?? row.session_id ?? row.trip_id)}-${index}`} className="hover:bg-muted/20">
                    {detailColumns.map((column) => {
                      const [key] = column;
                      const centered = metric === 'join-requests' && ['trip_analytics_requests', 'join_request_events', 'join_request_records', 'counted_requests'].includes(key);
                      return <td key={key} className={`max-w-72 truncate px-4 py-3 tabular-nums ${centered ? 'text-center' : ''}`} title={String(row[key] ?? '')}>{key === 'duration_minutes' ? (Number(row.duration_seconds ?? 0) / 60).toFixed(1) : formatValue(key, row[key])}</td>;
                    })}
                    {metric === 'messages-sent' && <td className="px-4 py-2"><Button type="button" variant="outline" size="sm" onClick={() => { setSelectedMessageDate(String(row.date)); setMessagePage(0); setMessages(null); }}><Eye className="mr-1.5 h-4 w-4" />Chats</Button></td>}
                    {metric === 'join-requests' && <td className="px-4 py-2"><Button type="button" variant="outline" size="sm" onClick={() => { setSelectedJoinTrip({ id: String(row.trip_id), title: String(row.trip || 'Trip') }); setRequestPage(0); setTripRequests(null); }}><Eye className="mr-1.5 h-4 w-4" />Details</Button></td>}
                  </tr>)}
                </tbody>
              </table>
            </div>}
        {result && result.total > PAGE_SIZE && <footer className="flex items-center justify-between border-t px-4 py-3"><span className="text-xs text-muted-foreground">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, result.total)} of {result.total} rows</span><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)}><ChevronLeft />Previous</Button><Button type="button" variant="outline" size="sm" disabled={page + 1 >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight /></Button></div></footer>}
      </Card>
      <Dialog open={Boolean(selectedMessageDate)} onOpenChange={(open) => { if (!open) { setSelectedMessageDate(''); setMessages(null); setMessagesError(''); } }}>
        <DialogContent className="!fixed !inset-0 !left-0 !top-0 !h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 !gap-0 !rounded-none !border-0 !p-0 flex flex-col overflow-hidden">
          <header className="shrink-0 border-b px-5 py-4 pr-16 sm:px-8 sm:py-5">
            <DialogTitle className="text-xl">Chats on {formatDate(selectedMessageDate)}</DialogTitle>
            <DialogDescription className="mt-1">All user messages sent on this date · {messages?.total.toLocaleString() ?? '…'} messages</DialogDescription>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-4 py-4 sm:px-8 sm:py-6">
            {messagesError && <Card role="alert" className="mb-4 border-destructive/30 p-4 text-sm text-destructive">Unable to load chat messages: {messagesError}</Card>}
            {messagesLoading && !messages && <div className="space-y-3">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>}
            {!messagesLoading && messages?.rows.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">No messages recorded on this date.</div>}
            <div className="mx-auto max-w-5xl space-y-3">{messages?.rows.map((message, index) => {
              const conversationId = String(message.conversation_id ?? 'unknown');
              const previousConversationId = index > 0 ? String(messages.rows[index - 1].conversation_id ?? 'unknown') : '';
              const isNewConversation = conversationId !== previousConversationId;
              const attachments = Array.isArray(message.attachments) ? message.attachments as ChatAttachment[] : [];
              return <div key={String(message.message_id)}>
                {isNewConversation && <div className="mb-2 mt-5 first:mt-0"><p className="text-xs font-semibold uppercase text-muted-foreground">{String(message.trip_title ?? message.conversation_name ?? 'Conversation')} · {message.conversation_type === 'trip_group' ? 'Trip chat' : 'Direct chat'}</p><p className="text-[11px] text-muted-foreground">Conversation {conversationId}</p></div>}
                <article className="rounded-lg border border-border/70 bg-background p-3 sm:p-4">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><span className="text-sm font-semibold">{String(message.sender ?? 'Unknown sender')}</span><time className="text-xs text-muted-foreground">{new Date(String(message.created_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>
                  {message.content && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{String(message.content)}</p>}
                  <MessageAttachments attachments={attachments} />
                </article>
              </div>;
            })}</div>
          </div>
          {messages && messages.total > 100 && <footer className="flex shrink-0 items-center justify-between border-t bg-background px-5 py-3 sm:px-8"><span className="text-xs text-muted-foreground">{messagePage * 100 + 1}–{Math.min((messagePage + 1) * 100, messages.total)} of {messages.total} messages</span><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={messagePage === 0 || messagesLoading} onClick={() => setMessagePage((value) => value - 1)}><ChevronLeft />Previous</Button><Button type="button" variant="outline" size="sm" disabled={(messagePage + 1) * 100 >= messages.total || messagesLoading} onClick={() => setMessagePage((value) => value + 1)}>Next<ChevronRight /></Button></div></footer>}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(selectedJoinTrip)} onOpenChange={(open) => { if (!open) { setSelectedJoinTrip(null); setTripRequests(null); setRequestsError(''); } }}>
        <DialogContent className="!h-[94dvh] !max-h-[94dvh] !w-[min(80rem,96vw)] !max-w-[96vw] flex flex-col overflow-hidden">
          <header className="shrink-0 border-b pb-4 pr-10">
            <DialogTitle>Join requests · {selectedJoinTrip?.title}</DialogTitle>
            <DialogDescription className="mt-1">People who requested to join this trip, with their request status and note.</DialogDescription>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {requestsError && <Card role="alert" className="mb-3 border-destructive/30 p-4 text-sm text-destructive">Unable to load trip requests: {requestsError}</Card>}
            {requestsLoading && !tripRequests && <div className="space-y-2 py-2">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>}
            {!requestsLoading && tripRequests?.rows.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No join requests for this trip.</p>}
            <div className="divide-y">{tripRequests?.rows.map((request) => <article key={String(request.request_id)} className="grid gap-2 py-4 sm:grid-cols-[minmax(12rem,0.9fr)_minmax(9rem,0.5fr)_minmax(18rem,1.6fr)_minmax(13rem,0.9fr)] sm:items-start">
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{String(request.username ?? 'Unknown user')}</p>{request.full_name && request.full_name !== request.username && <p className="truncate text-xs text-muted-foreground">{String(request.full_name)}</p>}<p className="truncate font-mono text-[10px] text-muted-foreground">{String(request.user_id ?? '')}</p></div>
              <div><span className="inline-flex rounded-full border px-2 py-0.5 text-xs capitalize">{String(request.status ?? 'unknown').replace(/_/g, ' ')}</span></div>
              <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{String(request.message || 'No note provided.')}</p>
              <div className="text-xs text-muted-foreground"><p>Requested {request.created_at ? new Date(String(request.created_at)).toLocaleString() : '—'}</p>{request.reviewed_at && <p className="mt-1">Reviewed {new Date(String(request.reviewed_at)).toLocaleString()}</p>}</div>
            </article>)}</div>
          </div>
          {tripRequests && tripRequests.total > 50 && <footer className="flex shrink-0 items-center justify-between border-t pt-3"><span className="text-xs text-muted-foreground">{requestPage * 50 + 1}–{Math.min((requestPage + 1) * 50, tripRequests.total)} of {tripRequests.total} requests</span><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={requestPage === 0 || requestsLoading} onClick={() => setRequestPage((value) => value - 1)}><ChevronLeft />Previous</Button><Button type="button" variant="outline" size="sm" disabled={(requestPage + 1) * 50 >= tripRequests.total || requestsLoading} onClick={() => setRequestPage((value) => value + 1)}>Next<ChevronRight /></Button></div></footer>}
        </DialogContent>
      </Dialog>
    </section>
  );
}