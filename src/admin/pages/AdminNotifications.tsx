import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Bell, BellRing, CalendarClock, Check, CheckCircle2, ClipboardCheck, Code2, Contact, Eye,
  FileText, Filter, Globe, Inbox, LayoutTemplate, Layers, ListChecks, Mail, MailPlus, Megaphone, Monitor, MousePointerClick, PenLine, Plus, RefreshCw,
  Rocket, Save, Search, Send, ShieldCheck, Smartphone, Tag, Target, UserCheck, Users, Webhook, X, type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { centerAction, NOTIFICATION_CHANNELS, resendAction, splitIds, type NotificationChannel } from '@/admin/lib/adminNotificationCenter';
import {
  ChoiceCard, ConfirmOperation, DataTable, Field, MetricCard, Panel, ProgressBar, Segmented, StatusBadge, StepGuide, Stepper,
  type GuideStep, type Row,
} from '@/admin/components/notifications/NotificationUi';
import { cn } from '@/lib/utils';

type TabKey = 'overview' | 'send' | 'email' | 'templates' | 'broadcasts' | 'contacts' | 'segments' | 'devices' | 'domains' | 'webhooks' | 'logs';

const NAV_GROUPS: Array<{ label: string; items: Array<[TabKey, string, LucideIcon]> }> = [
  { label: 'Messaging', items: [['overview', 'Overview', BarChart3], ['send', 'Send Notification', Send], ['email', 'Email', Mail], ['templates', 'Templates', LayoutTemplate], ['broadcasts', 'Broadcasts', Megaphone]] },
  { label: 'Audience', items: [['contacts', 'Contacts', Contact], ['segments', 'Segments', Layers], ['devices', 'Push Devices', Smartphone]] },
  { label: 'Setup', items: [['domains', 'Domains', Globe], ['webhooks', 'Webhooks', Webhook]] },
  { label: 'Monitor', items: [['logs', 'Delivery Logs', Activity]] },
];

const CHANNEL_META: Record<NotificationChannel, { label: string; icon: LucideIcon; description: string }> = {
  in_app: { label: 'In-app', icon: Bell, description: 'Appears in the bell menu inside Ketravelan.' },
  push: { label: 'Push', icon: Smartphone, description: 'Lock-screen alert on phones with the app installed.' },
  email: { label: 'Email', icon: Mail, description: 'Sent through Resend to users with email enabled.' },
};

const GUIDES: Record<TabKey, { steps: GuideStep[]; tip?: string }> = {
  overview: {
    steps: [
      { icon: LayoutTemplate, title: 'Prepare a template', text: 'Write the wording once for in-app, push and email.' },
      { icon: Target, title: 'Pick recipients', text: 'Choose specific users or a preference audience.' },
      { icon: Send, title: 'Send & confirm', text: 'Review the recipient count, then confirm.' },
      { icon: Activity, title: 'Track delivery', text: 'Check Delivery Logs for sent, skipped or failed.' },
    ],
    tip: 'New here? Start with Send Notification. It walks you through each step and nothing is sent until you confirm.',
  },
  send: {
    steps: [
      { icon: Users, title: 'Recipients', text: 'Paste user IDs or pick an audience.' },
      { icon: PenLine, title: 'Message', text: 'Title, message and where the tap leads.' },
      { icon: Layers, title: 'Channels', text: 'In-app, push and/or email.' },
      { icon: ClipboardCheck, title: 'Review & send', text: 'Check the count and confirm.' },
    ],
    tip: 'Users who turned a channel off in their settings are skipped automatically.',
  },
  email: {
    steps: [
      { icon: MailPlus, title: 'Compose', text: 'Recipient, subject and HTML or text body.' },
      { icon: Eye, title: 'Preview', text: 'See the email rendered on the right.' },
      { icon: CalendarClock, title: 'Send or schedule', text: 'Send now or pick a date and time.' },
      { icon: Inbox, title: 'Track', text: 'Recent emails show the Resend status.' },
    ],
    tip: 'Use this for one-off transactional emails. For newsletters or campaigns, use Broadcasts.',
  },
  templates: {
    steps: [
      { icon: Search, title: 'Pick a template', text: 'Each type matches a notification event.' },
      { icon: PenLine, title: 'Edit per channel', text: 'In-app, push and email wording.' },
      { icon: Tag, title: 'Use variables', text: 'Insert {{variable}} placeholders.' },
      { icon: Save, title: 'Preview & save', text: 'Check with sample data, then save.' },
    ],
    tip: 'Variables are filled from the metadata sent with the notification. Missing ones show as blank.',
  },
  broadcasts: {
    steps: [
      { icon: Layers, title: 'Have a segment', text: 'Create it in Segments first.' },
      { icon: PenLine, title: 'Create a draft', text: 'Name, subject and HTML content.' },
      { icon: MousePointerClick, title: 'Select the draft', text: 'Click it in the broadcasts list.' },
      { icon: Rocket, title: 'Send or schedule', text: 'Confirm to deliver via Resend.' },
    ],
    tip: 'Broadcasts go to every contact in the segment, so double-check the segment before sending.',
  },
  contacts: {
    steps: [
      { icon: Contact, title: 'Browse', text: 'Contacts, topics or properties.' },
      { icon: MousePointerClick, title: 'Select a row', text: 'Clicking fills the ID for you.' },
      { icon: ListChecks, title: 'Choose an action', text: 'Create, update or remove.' },
      { icon: CheckCircle2, title: 'Run', text: 'The change is applied in Resend.' },
    ],
  },
  segments: {
    steps: [
      { icon: Layers, title: 'Review segments', text: 'Groups of contacts for broadcasts.' },
      { icon: Plus, title: 'Create or select', text: 'Pick a row or start a new one.' },
      { icon: ListChecks, title: 'Choose an action', text: 'Update, remove or list contacts.' },
      { icon: Megaphone, title: 'Use in broadcasts', text: 'Target a segment from Broadcasts.' },
    ],
  },
  devices: {
    steps: [
      { icon: Smartphone, title: 'User installs app', text: 'iOS, Android or web push.' },
      { icon: UserCheck, title: 'Allows notifications', text: 'A device token is registered.' },
      { icon: BellRing, title: 'Receives pushes', text: 'Push messages reach these devices.' },
    ],
    tip: 'Users with no device here will only get in-app and email notifications.',
  },
  domains: {
    steps: [
      { icon: Globe, title: 'Add domain', text: 'Register your sending domain.' },
      { icon: Code2, title: 'Add DNS records', text: 'Copy records to your DNS provider.' },
      { icon: ShieldCheck, title: 'Verify', text: 'Run verify once DNS has propagated.' },
      { icon: Send, title: 'Send', text: 'Emails can now use this domain.' },
    ],
  },
  webhooks: {
    steps: [
      { icon: Webhook, title: 'Register endpoint', text: 'Resend posts email events here.' },
      { icon: ShieldCheck, title: 'Signature check', text: 'Each event is verified on arrival.' },
      { icon: Activity, title: 'Status updates', text: 'Delivery logs get opened/bounced.' },
      { icon: Search, title: 'Inspect', text: 'Select a webhook to see attempts.' },
    ],
  },
  logs: {
    steps: [
      { icon: Send, title: 'Notification sent', text: 'One record per user and channel.' },
      { icon: Activity, title: 'Status updates', text: 'Pending → sent → delivered.' },
      { icon: AlertTriangle, title: 'Spot problems', text: 'Filter by failed to see errors.' },
    ],
    tip: 'Skipped means the user turned that channel off, or has no email or device registered.',
  },
};

/** Converts a datetime-local value to ISO 8601 for Resend scheduling. */
function localToIso(value: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/** Pages through every Resend email (100 per request), pacing calls for Resend's 2 req/s limit. */
async function fetchAllResendEmails(onProgress: (rows: Row[]) => void, isActive: () => boolean) {
  const all: Row[] = [];
  let after: string | undefined;
  let retries = 0;
  while (isActive()) {
    let page: Row;
    try {
      page = await resendAction<Row>('emails.list', after ? { limit: 100, after } : { limit: 100 });
    } catch (error) {
      if (/rate|too many/i.test(errorText(error)) && retries < 5) { retries += 1; await sleep(1200 * retries); continue; }
      throw error;
    }
    retries = 0;
    const list = (page.data ?? page) as Row;
    const rows = Array.isArray(list.data) ? list.data as Row[] : rowsFrom(page);
    all.push(...rows);
    onProgress([...all]);
    if (!list.has_more || !rows.length) break;
    after = String(rows[rows.length - 1].id);
    await sleep(550);
  }
  return all;
}

function errorText(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return error instanceof Error ? error.message : 'Request failed.';
}

function rowsFrom(value: unknown): Row[] {
  if (Array.isArray(value)) return value as Row[];
  if (!value || typeof value !== 'object') return [];
  const object = value as Row;
  for (const key of ['data', 'rows', 'templates', 'notifications', 'deliveries', 'events']) {
    const candidate = object[key];
    if (Array.isArray(candidate)) return candidate as Row[];
    if (candidate && typeof candidate === 'object' && Array.isArray((candidate as Row).data)) return (candidate as Row).data as Row[];
  }
  return [];
}

function countBy(rows: Row[], key: string) {
  const counts = new Map<string, number>();
  for (const row of rows) { const value = String(row[key] ?? 'unknown'); counts.set(value, (counts.get(value) ?? 0) + 1); }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Mirrors the public routes in src/App.tsx; anything else lands on the 404 page.
const ACTION_URL_SUGGESTIONS = [
  ['/', 'Home'], ['/explore', 'Explore trips'], ['/my-trips', 'My trips'], ['/approvals', 'Join approvals'], ['/chat', 'Messages'],
  ['/expenses', 'Expenses'], ['/community', 'Community'], ['/favourites', 'Favourites'], ['/profile', 'Profile'], ['/settings', 'Settings'],
  ['/feedback', 'Feedback'], ['/help-center', 'Help center'], ['/create', 'Create trip'],
  ['/trip/<trip-id>', 'Trip page'], ['/trip/<trip-id>/hub?tab=expenses', 'Trip expenses'], ['/trip/<trip-id>/chat', 'Trip chat'],
] as const;
const ACTION_URL_PATTERNS = [
  /^\/$/, /^\/(about|approvals|chat|community|contact|create|create-story|expenses|explore|favourites|feedback|help-center|install|my-stories|my-trips|onboarding|privacy-policy|profile|settings|terms-of-service|welcome)$/,
  /^\/(chat|community\/discussions|community\/stories|discussion|help-center|post|share\/story|share\/trip|trip|user)\/[^/]+$/,
  /^\/chat\/new\/[^/]+$/, /^\/trip\/[^/]+\/(chat|hub)$/, /^\/trip\/[^/]+\/notes\/[^/]+$/, /^\/profile\/edit$/, /^\/settings\/(blocked-users|moderation-reports)$/,
];

function actionUrlProblem(value: string) {
  const url = value.trim();
  if (!url) return 'Required. Use / to open the home page.';
  if (/^https:\/\//i.test(url)) return null;
  if (!url.startsWith('/')) return 'Start with / (for example /explore) or use a full https:// link.';
  if (url.includes('<') || url.includes('>')) return 'Replace the <placeholder> with a real ID.';
  const path = url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return ACTION_URL_PATTERNS.some((pattern) => pattern.test(path)) ? null : `${path} is not an app page and will show 404.`;
}

function ActionUrlField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const problem = actionUrlProblem(value);
  return <div className="grid min-w-0 gap-1.5 text-sm">
    <label htmlFor="action-url" className="text-muted-foreground">Where does a tap lead?</label>
    <Input id="action-url" value={value} onChange={(event) => onChange(event.target.value)} list="action-url-suggestions" placeholder="/explore" aria-invalid={Boolean(problem)} className={problem ? 'border-destructive focus-visible:ring-destructive' : undefined} />
    <datalist id="action-url-suggestions">{ACTION_URL_SUGGESTIONS.map(([url, label]) => <option key={url} value={url}>{label}</option>)}</datalist>
    <div className="flex flex-wrap gap-1">{ACTION_URL_SUGGESTIONS.slice(0, 6).map(([url, label]) => <button key={url} type="button" onClick={() => onChange(url)} className={cn('rounded-full border px-2.5 py-0.5 text-xs transition-colors', value === url ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>{label}</button>)}</div>
    <span className={`text-xs ${problem ? 'text-destructive' : 'text-muted-foreground'}`}>{problem ?? 'Pick a shortcut or type any app page.'}</span>
  </div>;
}

const SAMPLE_VALUES: Record<string, string> = {
  trip_title: 'Bali Island Hopping', trip_destination: 'Bali, Indonesia', recipient_name: 'Aisyah',
  requester_name: 'Daniel Lim', participant_name: 'Daniel Lim', invitee_name: 'Daniel Lim', inviter_name: 'Aisyah Rahman', payer_name: 'Aisyah Rahman',
  request_message: 'Hi! I have been to Bali twice and would love to join.', timeline_text: 'in 3 days', start_date: '4 Oct 2026', end_date: '12 Oct 2026',
  reason: 'Reason: Not enough travelers joined before the deadline.', expense_description: 'Villa booking', currency: 'MYR', amount: '250.00',
  reference_code: 'FB-1024', action_url: 'https://ketravelan.com/explore',
};

function sampleValuesFor(variables: unknown) {
  const keys = Array.isArray(variables) ? variables.map(String) : [];
  return Object.fromEntries([...keys, 'action_url'].map((key) => [key, SAMPLE_VALUES[key] ?? key.replace(/_/g, ' ')]));
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, (char) => entities[char]);
}

// Mirrors render() in notification-dispatcher: values are HTML-escaped inside email HTML.
function renderTemplate(template: unknown, values: Record<string, unknown>, escape = false) {
  return String(template ?? '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key: string) => {
    const value = key.split('.').reduce<unknown>((item, part) => item && typeof item === 'object' ? (item as Row)[part] : undefined, values);
    if (value == null) return '';
    return escape ? escapeHtml(String(value)) : String(value);
  });
}

function PushMock({ title, body }: { title: string; body: string }) {
  return <div className="flex justify-center rounded-xl bg-gradient-to-b from-slate-600 to-slate-900 px-4 py-8">
    <div className="w-full max-w-sm rounded-2xl bg-white/90 p-3 shadow-lg backdrop-blur">
      <div className="flex items-center gap-2 text-[11px] text-slate-500"><img src="/ketravelan_logo.png" alt="" className="h-5 w-5 rounded object-contain" />KETRAVELAN<span className="ml-auto">now</span></div>
      <p className="mt-1.5 text-sm font-semibold text-slate-900">{title || <span className="text-slate-400">Your title</span>}</p>
      <p className="line-clamp-3 text-sm text-slate-700">{body || <span className="text-slate-400">Your message</span>}</p>
    </div>
  </div>;
}

function InAppMock({ title, message }: { title: string; message: string }) {
  return <div className="rounded-xl bg-muted/40 p-4">
    <div className="mx-auto flex max-w-md gap-3 rounded-lg border bg-background p-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary"><Bell className="h-4 w-4" /></span>
      <div className="min-w-0"><p className="text-sm font-medium">{title || <span className="text-muted-foreground">Your title</span>}</p><p className="mt-0.5 text-sm text-muted-foreground">{message || 'Your message'}</p><p className="mt-1 text-xs text-muted-foreground">Just now</p></div>
      <span className="ml-auto mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
    </div>
  </div>;
}

function EmailFrame({ subject, html, emptyText }: { subject: string; html: string; emptyText: string }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  return <div className="overflow-hidden rounded-xl border bg-background">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
      <div className="min-w-0 text-sm">
        <p className="truncate text-base font-semibold">{subject || <span className="text-muted-foreground">No subject</span>}</p>
        <p className="mt-1 text-muted-foreground"><span className="font-medium text-foreground">Ketravelan</span> &lt;no-reply@ketravelan.com&gt;</p>
      </div>
      <Segmented<'desktop' | 'mobile'> size="sm" value={device} onChange={setDevice} options={[['desktop', 'Desktop', Monitor], ['mobile', 'Mobile', Smartphone]]} />
    </div>
    <div className="flex justify-center bg-[#f4f6f8] p-3">
      {html.trim()
        ? <iframe title="Email preview" sandbox="" srcDoc={html} className="h-[560px] rounded-md border-0 bg-[#f4f6f8] transition-[width]" style={{ width: device === 'mobile' ? 375 : '100%' }} />
        : <div className="py-16 text-center text-sm text-muted-foreground">{emptyText}</div>}
    </div>
  </div>;
}

function TemplatePreview({ draft, values }: { draft: Row; values: Record<string, unknown> }) {
  const subject = renderTemplate(draft.email_subject_template || draft.title_template, values);
  const html = renderTemplate(draft.email_html_template, values, true);
  const text = renderTemplate(draft.email_text_template || draft.message_template, values);
  const missing = [...new Set([...String([draft.email_subject_template, draft.email_html_template, draft.email_text_template, draft.title_template, draft.message_template, draft.push_title_template, draft.push_body_template].join(' ')).matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((match) => match[1]))].filter((key) => values[key] == null || values[key] === '');

  return <Tabs defaultValue="email" className="w-full">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <TabsList>
        <TabsTrigger value="email"><Mail className="mr-1.5 h-3.5 w-3.5" />Email</TabsTrigger>
        <TabsTrigger value="push"><Smartphone className="mr-1.5 h-3.5 w-3.5" />Push</TabsTrigger>
        <TabsTrigger value="in_app"><Bell className="mr-1.5 h-3.5 w-3.5" />In-app</TabsTrigger>
        <TabsTrigger value="text"><FileText className="mr-1.5 h-3.5 w-3.5" />Plain text</TabsTrigger>
        <TabsTrigger value="source"><Code2 className="mr-1.5 h-3.5 w-3.5" />HTML</TabsTrigger>
      </TabsList>
      {missing.length > 0 && <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">Missing sample: {missing.join(', ')}</Badge>}
    </div>
    <TabsContent value="email" className="mt-3"><EmailFrame subject={subject} html={html} emptyText="No email HTML yet. The dispatcher will use its generic layout with the subject and text." /></TabsContent>
    <TabsContent value="push" className="mt-3"><PushMock title={renderTemplate(draft.push_title_template || draft.title_template, values)} body={renderTemplate(draft.push_body_template || draft.message_template, values)} /></TabsContent>
    <TabsContent value="in_app" className="mt-3"><InAppMock title={renderTemplate(draft.title_template, values)} message={renderTemplate(draft.message_template, values)} /></TabsContent>
    <TabsContent value="text" className="mt-3"><pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-xl border bg-background p-4 font-sans text-sm leading-relaxed">{text || 'No plain-text body.'}</pre></TabsContent>
    <TabsContent value="source" className="mt-3"><pre className="max-h-[560px] overflow-auto whitespace-pre-wrap break-all rounded-xl border bg-muted/30 p-4 text-xs">{html || 'No email HTML.'}</pre></TabsContent>
  </Tabs>;
}

function useGuidePreference() {
  const [hidden, setHidden] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('admin.notifications.hiddenGuides') ?? '{}') as Record<string, boolean>; } catch { return {}; }
  });
  const toggle = useCallback((key: string) => setHidden((current) => {
    const next = { ...current, [key]: !current[key] };
    try { localStorage.setItem('admin.notifications.hiddenGuides', JSON.stringify(next)); } catch { /* storage unavailable */ }
    return next;
  }), []);
  return { isOpen: (key: string) => !hidden[key], toggle };
}

export default function AdminNotifications() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [data, setData] = useState<Row>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [contactView, setContactView] = useState<'contacts' | 'topics' | 'properties'>('contacts');
  const [webhookEvents, setWebhookEvents] = useState<Row[]>([]);
  const guides = useGuidePreference();
  const [emails, setEmails] = useState<{ rows: Row[]; loading: boolean; error: string; key: number }>({ rows: [], loading: true, error: '', key: 0 });

  // All Resend emails are fetched once when the page opens; the Email tab reads this cache.
  useEffect(() => {
    let active = true;
    setEmails((current) => ({ ...current, rows: [], loading: true, error: '' }));
    fetchAllResendEmails((rows) => { if (active) setEmails((current) => ({ ...current, rows })); }, () => active)
      .then(() => { if (active) setEmails((current) => ({ ...current, loading: false })); })
      .catch((emailError) => { if (active) setEmails((current) => ({ ...current, loading: false, error: errorText(emailError) })); });
    return () => { active = false; };
  }, [emails.key]);
  const reloadEmails = () => setEmails((current) => ({ ...current, key: current.key + 1 }));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        let next: Row = {};
        if (tab === 'overview') next = await centerAction('overview');
        else if (tab === 'send' || tab === 'templates') next = await centerAction('templates.list');
        else if (tab === 'broadcasts') next = await resendAction('broadcasts.list', { limit: 100 });
        else if (tab === 'contacts') next = await resendAction(contactView === 'contacts' ? 'contacts.list' : contactView === 'topics' ? 'topics.list' : 'contactProperties.list', { limit: 100 });
        else if (tab === 'segments') next = await resendAction('segments.list', { limit: 100 });
        else if (tab === 'domains') next = await resendAction('domains.list', { limit: 100 });
        else if (tab === 'webhooks') next = await resendAction('webhooks.list', { limit: 100 });
        else if (tab === 'devices') next = await centerAction('push_devices.list', { limit: 250 });
        else if (tab === 'logs') {
          const [deliveries, events] = await Promise.all([centerAction('deliveries.list', { limit: 250 }), centerAction('provider_events.list', { limit: 250 })]);
          next = { deliveries, events };
        }
        if (active) { setData(next); setUpdatedAt(new Date()); }
      } catch (loadError) {
        if (active) setError(errorText(loadError));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [tab, contactView, refreshKey]);

  const reload = () => { if (tab === 'email') reloadEmails(); else setRefreshKey((value) => value + 1); };
  const flash = useCallback((text: string, tone: 'success' | 'error' = 'success') => { setNotice({ text, tone }); window.setTimeout(() => setNotice(null), 7000); }, []);
  const flashError = useCallback((text: string) => flash(text, 'error'), [flash]);
  const templateRows = useMemo(() => rowsFrom(data), [data]);
  const guide = GUIDES[tab];
  const current = NAV_GROUPS.flatMap((group) => group.items).find(([key]) => key === tab);

  return <section className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex gap-3">
        <span className="hidden h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:flex"><BellRing className="h-5 w-5" /></span>
        <div><p className="text-sm font-medium text-primary">System</p><h1 className="text-2xl font-semibold tracking-tight">Notification Center</h1><p className="mt-0.5 text-sm text-muted-foreground">Send and track in-app, push and email messages from one place.</p></div>
      </div>
      <div className="flex items-center gap-2">
        {updatedAt && <span className="hidden text-xs text-muted-foreground sm:inline">Updated {updatedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>}
        <Button type="button" variant="outline" size="sm" disabled={tab === 'email' ? emails.loading : loading} onClick={reload}><RefreshCw className={cn('mr-2 h-4 w-4', (tab === 'email' ? emails.loading : loading) && 'animate-spin')} />Refresh</Button>
      </div>
    </header>

    <nav aria-label="Notification Center sections" className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex min-w-max gap-4">
        {NAV_GROUPS.map((group) => <div key={group.label} className="flex flex-col gap-1.5">
          <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</span>
          <div className="flex gap-1 rounded-xl border bg-muted/30 p-1">
            {group.items.map(([key, label, Icon]) => <button key={key} type="button" aria-current={tab === key ? 'page' : undefined} onClick={() => { setTab(key); setError(''); }} className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', tab === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/60 hover:text-foreground')}><Icon className="h-4 w-4" />{label}</button>)}
          </div>
        </div>)}
      </div>
    </nav>

    {error && <Card role="alert" className="flex items-start gap-3 rounded-xl border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div className="flex-1"><p className="font-medium">Couldn’t load this section</p><p className="mt-0.5">{error}</p></div><Button type="button" size="sm" variant="outline" onClick={reload}>Try again</Button></Card>}
    {notice && <Card role="status" className={cn('flex items-start gap-3 rounded-xl p-4 text-sm', notice.tone === 'success' ? 'border-emerald-600/20 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-destructive/30 bg-destructive/5 text-destructive')}>{notice.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}<p className="flex-1 break-words">{notice.text}</p><button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}><X className="h-4 w-4" /></button></Card>}

    {guide && current && <StepGuide title={`How ${current[1]} works`} steps={guide.steps} tip={guide.tip} open={guides.isOpen(tab)} onToggle={() => guides.toggle(tab)} />}

    {loading
      ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}<Skeleton className="h-64 rounded-xl sm:col-span-2 xl:col-span-4" /></div>
      : <>
        {tab === 'overview' && <OverviewPanel data={data} onNavigate={setTab} />}
        {tab === 'send' && <SendPanel templates={templateRows} onNotice={flash} onError={flashError} onNavigate={setTab} />}
        {tab === 'email' && <EmailPanel emails={emails} onNotice={flash} onError={flashError} onReload={reloadEmails} />}
        {tab === 'templates' && <TemplatesPanel templates={templateRows} onNotice={flash} onError={flashError} />}
        {tab === 'broadcasts' && <BroadcastsPanel data={data} onNotice={flash} onError={flashError} onReload={reload} onNavigate={setTab} />}
        {tab === 'contacts' && <ResourcePanel kind={contactView} title="Resend audience" description="Contacts live in Resend; Ketravelan does not keep a copy." data={data} views={[['contacts', 'Contacts'], ['topics', 'Topics'], ['properties', 'Properties']]} onView={(value) => setContactView(value as typeof contactView)} onNotice={flash} onError={flashError} onReload={reload} />}
        {tab === 'segments' && <ResourcePanel kind="segments" title="Segments" description="Groups of contacts you can target with a broadcast." data={data} onNotice={flash} onError={flashError} onReload={reload} />}
        {tab === 'domains' && <ResourcePanel kind="domains" title="Sending domains" description="Domains Resend is allowed to send email from." data={data} onNotice={flash} onError={flashError} onReload={reload} />}
        {tab === 'webhooks' && <ResourcePanel kind="webhooks" title="Webhooks" description="Endpoints that receive email events from Resend." data={data} onNotice={flash} onError={flashError} onReload={reload} onInspectEvents={(id) => { resendAction<Row>('webhooks.events.list', { webhookId: id }).then((result) => setWebhookEvents(rowsFrom(result))).catch((inspectError) => flashError(errorText(inspectError))); }} extraRows={webhookEvents} />}
        {tab === 'devices' && <DevicesPanel data={data} />}
        {tab === 'logs' && <LogsPanel data={data} />}
      </>}
  </section>;
}

function OverviewPanel({ data, onNavigate }: { data: Row; onNavigate: (tab: TabKey) => void }) {
  const n = (key: string) => Number(data[key] ?? 0);
  const deliveryRate = n('deliveries') ? (n('delivered') / n('deliveries')) * 100 : 0;
  const failRate = n('deliveries') ? (n('failed') / n('deliveries')) * 100 : 0;
  const readRate = n('notifications') ? ((n('notifications') - n('unread')) / n('notifications')) * 100 : 0;
  const pushReach = n('pushDevices');
  const journey: Array<[TabKey, LucideIcon, string, string]> = [
    ['templates', LayoutTemplate, 'Templates', 'Wording per channel'],
    ['send', Target, 'Send', 'Choose who & how'],
    ['devices', Smartphone, 'Devices', `${pushReach.toLocaleString()} push devices`],
    ['logs', Activity, 'Delivery Logs', `${n('deliveries').toLocaleString()} deliveries`],
  ];

  return <div className="space-y-5">
    <Card className="rounded-xl border-border/60 p-4 shadow-none sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Notification journey</h2><p className="text-sm text-muted-foreground">Click a stage to jump straight to it.</p></div><Button type="button" onClick={() => onNavigate('send')}><Send className="mr-2 h-4 w-4" />Send a notification</Button></div>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {journey.map(([key, Icon, title, detail], index) => <li key={key} className="relative">
          <button type="button" onClick={() => onNavigate(key)} className="group flex h-full w-full items-center gap-3 rounded-lg border bg-gradient-to-br from-primary/[0.05] to-transparent p-3 text-left transition-colors hover:border-primary/40">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Icon className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className="block text-[11px] uppercase tracking-wide text-muted-foreground">Stage {index + 1}</span><span className="block text-sm font-semibold">{title}</span><span className="block truncate text-xs text-muted-foreground">{detail}</span></span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
        </li>)}
      </ol>
    </Card>

    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="rounded-xl border-border/60 p-5 shadow-none">
        <div className="flex items-center justify-between"><h3 className="text-sm font-medium text-muted-foreground">Delivery success</h3><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{deliveryRate.toFixed(1)}%</p>
        <div className="mt-3"><ProgressBar value={deliveryRate} /></div>
        <p className="mt-2 text-xs text-muted-foreground">{n('delivered').toLocaleString()} of {n('deliveries').toLocaleString()} deliveries sent or delivered</p>
      </Card>
      <Card className="rounded-xl border-border/60 p-5 shadow-none">
        <div className="flex items-center justify-between"><h3 className="text-sm font-medium text-muted-foreground">Failure rate</h3><AlertTriangle className={cn('h-4 w-4', n('failed') ? 'text-red-600' : 'text-muted-foreground')} /></div>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{failRate.toFixed(1)}%</p>
        <div className="mt-3"><ProgressBar value={failRate} tone="danger" /></div>
        <p className="mt-2 text-xs text-muted-foreground">{n('failed') ? <button type="button" className="font-medium text-red-700 underline-offset-2 hover:underline" onClick={() => onNavigate('logs')}>{n('failed').toLocaleString()} failed deliveries need a look →</button> : 'No failed deliveries. All good.'}</p>
      </Card>
      <Card className="rounded-xl border-border/60 p-5 shadow-none">
        <div className="flex items-center justify-between"><h3 className="text-sm font-medium text-muted-foreground">Read rate (in-app)</h3><Eye className="h-4 w-4 text-primary" /></div>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{readRate.toFixed(1)}%</p>
        <div className="mt-3"><ProgressBar value={readRate} tone="primary" /></div>
        <p className="mt-2 text-xs text-muted-foreground">{n('unread').toLocaleString()} of {n('notifications').toLocaleString()} notifications still unread</p>
      </Card>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <MetricCard label="Notifications" value={n('notifications').toLocaleString()} detail="In-app notification records" icon={Bell} />
      <MetricCard label="Users with push" value={n('usersWithPush').toLocaleString()} detail={`${pushReach.toLocaleString()} registered devices`} icon={Users} onClick={() => onNavigate('devices')} />
      <MetricCard label="Broadcasts" value={n('broadcasts').toLocaleString()} detail="Resend drafts and campaigns" icon={Megaphone} onClick={() => onNavigate('broadcasts')} />
      <MetricCard label="Deliveries" value={n('deliveries').toLocaleString()} detail="All channel delivery attempts" icon={Send} onClick={() => onNavigate('logs')} />
      <MetricCard label="Failed" value={n('failed').toLocaleString()} detail="Needs inspection" icon={AlertTriangle} tone={n('failed') ? 'danger' : 'default'} onClick={() => onNavigate('logs')} />
      <MetricCard label="Provider events" value={n('providerEvents').toLocaleString()} detail="Verified Resend webhook events" icon={ShieldCheck} tone="success" onClick={() => onNavigate('webhooks')} />
    </div>
  </div>;
}

const SEND_STEPS = [{ title: 'Recipients', icon: Users }, { title: 'Message', icon: PenLine }, { title: 'Channels', icon: Layers }, { title: 'Review & send', icon: ClipboardCheck }];
const AUDIENCES: Array<[string, string, string, LucideIcon]> = [
  ['push_enabled', 'Push-enabled users', 'Everyone who allows push notifications.', Smartphone],
  ['email_enabled', 'Email-enabled users', 'Everyone who allows email notifications.', Mail],
  ['all', 'All users', 'Every Ketravelan account. Use sparingly.', Globe],
];

function SendPanel({ templates, onNotice, onError, onNavigate }: { templates: Row[]; onNotice: (value: string) => void; onError: (value: string) => void; onNavigate: (tab: TabKey) => void }) {
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState<'users' | 'audience'>('users');
  const [ids, setIds] = useState('');
  const [audience, setAudience] = useState('push_enabled');
  const [type, setType] = useState('system_announcement');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionUrl, setActionUrl] = useState('/');
  const [channels, setChannels] = useState<NotificationChannel[]>(['in_app', 'push']);
  const [preview, setPreview] = useState<Row | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  const parsedIds = splitIds(ids);
  const invalidIds = parsedIds.filter((id) => !UUID_RE.test(id));
  const template = templates.find((item) => item.type === type);
  const payload = { userIds: target === 'users' ? parsedIds : undefined, audience: target === 'audience' ? audience : undefined, type, title, message, actionUrl, channels };
  const valid = [target === 'audience' || (parsedIds.length > 0 && !invalidIds.length), Boolean(title.trim()) && !actionUrlProblem(actionUrl), channels.length > 0, Boolean(preview)];
  const update = <T,>(setter: (value: T) => void) => (value: T) => { setter(value); setPreview(null); setIdempotencyKey(''); };

  const preparePreview = async () => {
    setBusy(true);
    try {
      setPreview(await centerAction('send.preview', payload));
      setIdempotencyKey(crypto.randomUUID());
    } catch (sendError) { onError(errorText(sendError)); }
    finally { setBusy(false); }
  };
  const goTo = (index: number) => {
    const blocked = valid.slice(0, Math.min(index, 3)).findIndex((ok) => !ok);
    const next = blocked === -1 ? index : blocked;
    setStep(next);
    if (next === 3 && !preview) void preparePreview();
  };
  const confirmSend = async () => {
    setBusy(true);
    try {
      const result = await centerAction<Row>('send', { ...payload, confirmed: true, idempotencyKey });
      const count = Number(result.recipientCount ?? 0);
      onNotice(`Sent to ${count.toLocaleString()} recipients. Check Delivery Logs for each channel’s outcome.`);
      setSentCount(count);
      setPreview(null); setIdempotencyKey(''); setConfirmOpen(false);
    } catch (sendError) { onError(errorText(sendError)); }
    finally { setBusy(false); }
  };
  const reset = () => { setSentCount(null); setStep(0); setIds(''); setTitle(''); setMessage(''); setActionUrl('/'); };

  if (sentCount != null) {
    return <Card className="flex flex-col items-center gap-3 rounded-xl border-emerald-600/20 p-10 text-center shadow-none">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-7 w-7" /></span>
      <h2 className="text-lg font-semibold">Notification sent</h2>
      <p className="max-w-md text-sm text-muted-foreground">Delivered to {sentCount.toLocaleString()} recipients via {channels.map((channel) => CHANNEL_META[channel].label).join(', ')}. Delivery Logs show each channel’s outcome per user.</p>
      <div className="flex flex-wrap justify-center gap-2"><Button type="button" onClick={() => onNavigate('logs')}><Activity className="mr-2 h-4 w-4" />View delivery logs</Button><Button type="button" variant="outline" onClick={reset}><Plus className="mr-2 h-4 w-4" />Send another</Button></div>
    </Card>;
  }

  return <div className="space-y-4">
    <Stepper steps={SEND_STEPS} current={step} completed={(index) => valid[index]} onSelect={goTo} />
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel title={SEND_STEPS[step].title} icon={SEND_STEPS[step].icon} description={['Who should receive this notification?', 'What should it say, and where does a tap lead?', 'How should it reach people?', 'Nothing is sent until you confirm.'][step]}>
        {step === 0 && <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard icon={UserCheck} title="Specific users" description="Paste the user IDs you want to reach." selected={target === 'users'} onClick={() => update(setTarget)('users')} />
            <ChoiceCard icon={Users} title="An audience" description="Everyone matching a notification preference." selected={target === 'audience'} onClick={() => update(setTarget)('audience')} />
          </div>
          {target === 'users'
            ? <Field label="User IDs" value={ids} onChange={update(setIds)} placeholder={'Paste IDs separated by commas or new lines\n8edae7a0-27b7-4014-a382-ace2a4a493a0'} multiline mono
                error={invalidIds.length ? `${invalidIds.length} invalid ID${invalidIds.length > 1 ? 's' : ''}: ${invalidIds.slice(0, 2).join(', ')}${invalidIds.length > 2 ? '…' : ''}` : null}
                hint={parsedIds.length ? <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="h-3.5 w-3.5" />{parsedIds.length} user{parsedIds.length > 1 ? 's' : ''} ready</span> : 'Find IDs in Admin → Users.'} />
            : <div className="grid gap-2">{AUDIENCES.map(([key, label, description, Icon]) => <ChoiceCard key={key} icon={Icon} title={label} description={description} selected={audience === key} onClick={() => update(setAudience)(key)} badge={key === 'all' ? <Badge variant="outline" className="border-amber-300 text-amber-700">Wide reach</Badge> : undefined} />)}</div>}
        </div>}

        {step === 1 && <div className="space-y-4">
          <div className="grid gap-1.5 text-sm">
            <label htmlFor="template-type" className="text-muted-foreground">Template type</label>
            <select id="template-type" value={type} onChange={(event) => update(setType)(event.target.value)} className="h-10 rounded-md border bg-background px-3">{templates.map((item) => <option key={String(item.id)} value={String(item.type)}>{String(item.type).replace(/_/g, ' ')}</option>)}{!templates.some((item) => item.type === 'system_announcement') && <option value="system_announcement">system announcement</option>}</select>
            {template && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground"><span>Template wording: <span className="font-medium text-foreground">{String(template.title_template ?? '')}</span></span><Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => { update(setTitle)(String(template.title_template ?? '')); setMessage(String(template.message_template ?? '')); }}>Use template text</Button></div>}
          </div>
          <Field label="Title" value={title} onChange={update(setTitle)} placeholder="e.g. New trips just dropped ✈️" maxLength={65} />
          <Field label="Message" value={message} onChange={update(setMessage)} placeholder="e.g. Check out 12 new trips to Bali, Japan and more." multiline rows={4} maxLength={240} />
          <ActionUrlField value={actionUrl} onChange={update(setActionUrl)} />
        </div>}

        {step === 2 && <div className="space-y-3">
          {NOTIFICATION_CHANNELS.map((channel) => {
            const meta = CHANNEL_META[channel];
            const on = channels.includes(channel);
            return <ChoiceCard key={channel} icon={meta.icon} title={meta.label} description={meta.description} selected={on} onClick={() => update(setChannels)(on ? channels.filter((item) => item !== channel) : [...channels, channel])} />;
          })}
          {channels.includes('email') && <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Email here is for targeted notices. For newsletters to many people, use <button type="button" className="font-medium underline" onClick={() => onNavigate('broadcasts')}>Broadcasts</button>.</p>}
          {!channels.length && <p className="text-xs text-destructive">Pick at least one channel.</p>}
        </div>}

        {step === 3 && (busy && !preview
          ? <div className="space-y-2"><Skeleton className="h-20" /><Skeleton className="h-10" /></div>
          : !preview
            ? <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground"><AlertTriangle className="h-6 w-6" />Couldn’t prepare the review. <Button type="button" variant="outline" onClick={() => void preparePreview()}>Try again</Button></div>
            : <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-primary/5 p-3"><p className="text-xs text-muted-foreground">Recipients</p><p className="text-2xl font-semibold tabular-nums">{Number(preview.recipientCount).toLocaleString()}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Audience</p><p className="mt-1 text-sm font-medium">{target === 'users' ? 'Specific users' : AUDIENCES.find(([key]) => key === audience)?.[1]}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Channels</p><div className="mt-1 flex flex-wrap gap-1">{channels.map((channel) => <Badge key={channel} variant="secondary">{CHANNEL_META[channel].label}</Badge>)}</div></div>
              </div>
              <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2 rounded-lg border p-3 text-sm"><dt className="text-muted-foreground">Type</dt><dd>{type.replace(/_/g, ' ')}</dd><dt className="text-muted-foreground">Title</dt><dd className="break-words font-medium">{title}</dd><dt className="text-muted-foreground">Message</dt><dd className="whitespace-pre-wrap break-words">{message || '—'}</dd><dt className="text-muted-foreground">Opens</dt><dd><code className="text-xs">{actionUrl}</code></dd></dl>
              {Number(preview.recipientCount) === 0 && <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />No matching recipients. Check the user IDs or pick another audience.</p>}
            </div>)}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
          {step < 3
            ? <Button type="button" disabled={!valid[step]} onClick={() => goTo(step + 1)}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
            : <Button type="button" disabled={busy || !preview || Number(preview.recipientCount) === 0} onClick={() => setConfirmOpen(true)}><Send className="mr-2 h-4 w-4" />Send to {Number(preview?.recipientCount ?? 0).toLocaleString()} recipients</Button>}
        </div>
      </Panel>

      <div className="space-y-3 xl:sticky xl:top-4 xl:self-start">
        <p className="flex items-center gap-1.5 text-sm font-medium"><Eye className="h-4 w-4" />Live preview</p>
        {channels.includes('push') && <PushMock title={title} body={message} />}
        {channels.includes('in_app') && <InAppMock title={title} message={message} />}
        {channels.includes('email') && <div className="rounded-xl border bg-background p-3 text-xs text-muted-foreground"><Mail className="mb-1 h-4 w-4" />Email uses the <span className="font-medium text-foreground">{type.replace(/_/g, ' ')}</span> template design. Preview it in <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => onNavigate('templates')}>Templates</button>.</div>}
        {!channels.length && <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">Pick a channel to see a preview.</p>}
      </div>
    </div>
    <ConfirmOperation open={confirmOpen} onOpenChange={setConfirmOpen} title="Send this notification now?" confirmLabel="Send now" busy={busy} onConfirm={() => void confirmSend()}
      description={<>This creates <strong>{Number(preview?.recipientCount ?? 0).toLocaleString()}</strong> notifications and delivers them via {channels.map((channel) => CHANNEL_META[channel].label).join(', ')}. It can’t be undone.</>} />
  </div>;
}

function EmailPanel({ emails, onNotice, onError, onReload }: { emails: { rows: Row[]; loading: boolean; error: string }; onNotice: (value: string) => void; onError: (value: string) => void; onReload: () => void }) {
  const [openEmailId, setOpenEmailId] = useState<string | null>(null);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [text, setText] = useState('');
  const [schedule, setSchedule] = useState(false);
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [batchJson, setBatchJson] = useState('[\n  {\n    "from": "Ketravelan <no-reply@ketravelan.com>",\n    "to": ["name@example.com"],\n    "subject": "Hello",\n    "html": "<p>Welcome</p>"\n  }\n]');
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [pending, setPending] = useState<'single' | 'batch' | null>(null);
  const [busy, setBusy] = useState(false);
  const recipients = splitIds(to);
  const badEmails = recipients.filter((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  const scheduledAt = schedule ? localToIso(scheduledLocal) : '';
  const batch = (() => { try { const parsed = JSON.parse(batchJson); return Array.isArray(parsed) ? parsed as Row[] : null; } catch { return null; } })();
  const canSend = recipients.length === 1 && !badEmails.length && subject.trim() && (html.trim() || text.trim()) && (!schedule || scheduledAt);

  const send = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const result = pending === 'single'
        ? await resendAction<Row>('emails.send', { from: 'Ketravelan <no-reply@ketravelan.com>', to: recipients, subject, html: html || undefined, text: text || undefined, scheduledAt: scheduledAt || undefined, confirmed: true })
        : await resendAction<Row>('emails.batch', { batch, confirmed: true });
      const id = (result.data as Row | undefined)?.id ?? result.id;
      onNotice(pending === 'single' ? `Email ${scheduledAt ? 'scheduled' : 'accepted by Resend'}${id ? ` (ref ${String(id).slice(0, 8)})` : ''}.` : `Batch of ${batch?.length ?? 0} emails accepted by Resend.`);
      setPending(null);
      onReload();
    } catch (error) { onError(errorText(error)); }
    finally { setBusy(false); }
  };

  return <div className="space-y-4">
    <Segmented<'single' | 'batch'> value={mode} onChange={setMode} options={[['single', 'Single email', Mail], ['batch', 'Batch (advanced)', Layers]]} />
    {mode === 'single'
      ? <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Compose email" icon={MailPlus} description="One recipient per email. For campaigns, use Broadcasts.">
          <div className="space-y-4">
            <Field label="To" value={to} onChange={setTo} placeholder="name@example.com" error={badEmails.length ? `Not a valid email: ${badEmails[0]}` : recipients.length > 1 ? 'Only one recipient per email.' : null} />
            <Field label="Subject" value={subject} onChange={setSubject} placeholder="e.g. Your trip details" maxLength={78} />
            <Field label="HTML body" value={html} onChange={setHtml} multiline rows={8} mono placeholder="<p>Hi there,</p>" hint="Optional if you fill in the plain-text body." />
            <Field label="Plain-text body" value={text} onChange={setText} multiline rows={3} hint="Shown by email apps that don’t display HTML." />
            <div className="rounded-lg border p-3">
              <label className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2 font-medium"><CalendarClock className="h-4 w-4" />Schedule for later</span><Switch checked={schedule} onCheckedChange={setSchedule} /></label>
              {schedule && <Input className="mt-3" type="datetime-local" value={scheduledLocal} min={new Date().toISOString().slice(0, 16)} onChange={(event) => setScheduledLocal(event.target.value)} aria-label="Send at" />}
            </div>
            <Button type="button" className="w-full" disabled={!canSend} onClick={() => setPending('single')}><Send className="mr-2 h-4 w-4" />{schedule ? 'Review & schedule' : 'Review & send'}</Button>
          </div>
        </Panel>
        <div className="space-y-2"><p className="flex items-center gap-1.5 text-sm font-medium"><Eye className="h-4 w-4" />Preview</p><EmailFrame subject={subject} html={html || (text ? `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;padding:24px">${escapeHtml(text)}</pre>` : '')} emptyText="Start typing the body to see the preview." /></div>
      </div>
      : <Panel title="Batch email" icon={Layers} description="Send up to 100 different emails in one request, each with one recipient.">
        <Field label="Batch payload (JSON array)" value={batchJson} onChange={setBatchJson} multiline rows={12} mono error={batch ? null : 'Invalid JSON. It must be an array of email objects.'} hint={batch ? `${batch.length} email${batch.length === 1 ? '' : 's'} in this batch` : undefined} />
        <Button type="button" className="mt-3" disabled={!batch?.length} onClick={() => setPending('batch')}><Eye className="mr-2 h-4 w-4" />Review & send batch</Button>
      </Panel>}
    <Panel title="Sent emails" icon={Inbox} description="Every email sent through Resend. Click a row to see exactly what the user received."
      action={emails.loading ? <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Loading… {emails.rows.length.toLocaleString()} so far</span> : <Badge variant="secondary">{emails.rows.length.toLocaleString()} emails</Badge>}>
      {emails.error && <p className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4" />Stopped after {emails.rows.length.toLocaleString()} emails: {emails.error}<Button type="button" size="sm" variant="outline" className="ml-auto" onClick={onReload}>Retry</Button></p>}
      {emails.loading && !emails.rows.length
        ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-10" />)}</div>
        : <DataTable rows={emails.rows} columns={['to', 'subject', 'last_event', 'created_at', 'scheduled_at']} onRowClick={(row) => setOpenEmailId(String(row.id))} selectedKey={openEmailId ?? undefined} pageSize={50} empty="No emails sent yet." />}
    </Panel>
    <EmailDetailSheet emailId={openEmailId} summary={emails.rows.find((row) => String(row.id) === openEmailId)} onClose={() => setOpenEmailId(null)} />
    <ConfirmOperation open={Boolean(pending)} onOpenChange={(open) => { if (!open) setPending(null); }} title={pending === 'batch' ? 'Send this batch?' : schedule ? 'Schedule this email?' : 'Send this email?'} confirmLabel={schedule && pending === 'single' ? 'Schedule' : 'Send'} busy={busy} onConfirm={() => void send()}
      description={pending === 'batch' ? <>This submits <strong>{batch?.length ?? 0}</strong> emails to Resend. Check every recipient first.</> : <>To <strong>{recipients.join(', ')}</strong><br />Subject “{subject}”{scheduledAt && <><br />Sends at {new Date(scheduledAt).toLocaleString()}</>}</>} />
  </div>;
}

const emailDetailCache = new Map<string, Row>();

function EmailDetailSheet({ emailId, summary, onClose }: { emailId: string | null; summary?: Row; onClose: () => void }) {
  const [detail, setDetail] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!emailId) return;
    const cached = emailDetailCache.get(emailId);
    setDetail(cached ?? null);
    setError('');
    if (cached) return;
    let active = true;
    setLoading(true);
    resendAction<Row>('emails.get', { id: emailId })
      .then((result) => {
        const email = (result.data ?? result) as Row;
        emailDetailCache.set(emailId, email);
        if (active) setDetail(email);
      })
      .catch((loadError) => { if (active) setError(errorText(loadError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [emailId]);

  const email = detail ?? summary ?? {};
  const list = (value: unknown) => Array.isArray(value) ? value.join(', ') : value ? String(value) : '';
  const meta: Array<[string, string]> = [
    ['From', list(email.from)], ['To', list(email.to)], ['Cc', list(email.cc)], ['Bcc', list(email.bcc)], ['Reply to', list(email.reply_to)],
    ['Sent', email.created_at ? new Date(String(email.created_at)).toLocaleString() : ''], ['Scheduled', email.scheduled_at ? new Date(String(email.scheduled_at)).toLocaleString() : ''],
    ['Resend ID', String(email.id ?? '')],
  ];
  const html = String(detail?.html ?? '');
  const text = String(detail?.text ?? '');

  return <Sheet open={Boolean(emailId)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
      <SheetHeader className="space-y-2 text-left">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={email.last_event} />{loading && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><RefreshCw className="h-3 w-3 animate-spin" />Loading content…</span>}</div>
        <SheetTitle className="break-words pr-6">{String(email.subject ?? 'Email')}</SheetTitle>
        <SheetDescription asChild>
          <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 text-sm">{meta.filter(([, value]) => value).map(([label, value]) => <div key={label} className="contents"><dt className="text-muted-foreground">{label}</dt><dd className="break-all text-foreground">{value}</dd></div>)}</dl>
        </SheetDescription>
      </SheetHeader>
      {error && <p className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4" />Couldn’t load the email content: {error}</p>}
      <Tabs defaultValue="rendered" className="mt-5">
        <TabsList><TabsTrigger value="rendered"><Eye className="mr-1.5 h-3.5 w-3.5" />As received</TabsTrigger><TabsTrigger value="text"><FileText className="mr-1.5 h-3.5 w-3.5" />Plain text</TabsTrigger><TabsTrigger value="source"><Code2 className="mr-1.5 h-3.5 w-3.5" />HTML</TabsTrigger></TabsList>
        <TabsContent value="rendered" className="mt-3">
          {loading && !detail ? <Skeleton className="h-[560px] rounded-xl" /> : <EmailFrame subject={String(email.subject ?? '')} html={html || (text ? `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;padding:24px">${escapeHtml(text)}</pre>` : '')} emptyText="Resend has no content stored for this email." />}
        </TabsContent>
        <TabsContent value="text" className="mt-3"><pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-xl border bg-background p-4 font-sans text-sm leading-relaxed">{text || 'No plain-text version was sent.'}</pre></TabsContent>
        <TabsContent value="source" className="mt-3"><pre className="max-h-[560px] overflow-auto whitespace-pre-wrap break-all rounded-xl border bg-muted/30 p-4 text-xs">{html || 'No HTML version was sent.'}</pre></TabsContent>
      </Tabs>
    </SheetContent>
  </Sheet>;
}

function TemplatesPanel({ templates: initialTemplates, onNotice, onError }: { templates: Row[]; onNotice: (value: string) => void; onError: (value: string) => void }) {
  const blank: Row = { type: '', title_template: '', message_template: '', channels: ['in_app', 'push', 'email'], variables: [], is_active: true };
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedId, setSelectedId] = useState(String(initialTemplates[0]?.id ?? ''));
  const [search, setSearch] = useState('');
  const [previewValues, setPreviewValues] = useState('{}');
  const [draft, setDraft] = useState<Row>(initialTemplates[0] ?? blank);
  const [saving, setSaving] = useState(false);
  const [variablesText, setVariablesText] = useState(JSON.stringify(draft.variables ?? []));
  useEffect(() => { setTemplates(initialTemplates); if (!selectedId && initialTemplates[0]?.id) { setSelectedId(String(initialTemplates[0].id)); setDraft(initialTemplates[0]); } }, [initialTemplates, selectedId]);
  const draftKey = `${String(draft.id ?? '')}:${String(draft.type ?? '')}`;
  useEffect(() => {
    setPreviewValues(JSON.stringify(sampleValuesFor(draft.variables), null, 2));
    setVariablesText(JSON.stringify(draft.variables ?? []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);
  const setField = (key: string, value: unknown) => setDraft((current) => ({ ...current, [key]: value }));
  const variables = Array.isArray(draft.variables) ? (draft.variables as unknown[]).map(String) : [];
  const variablesInvalid = (() => { try { return !Array.isArray(JSON.parse(variablesText)); } catch { return true; } })();
  const selectedTemplate = templates.find((item) => String(item.id) === selectedId);
  const dirty = JSON.stringify(selectedTemplate ?? blank) !== JSON.stringify(draft);
  const filtered = templates.filter((item) => String(item.type).toLowerCase().includes(search.trim().toLowerCase()));

  const save = async () => {
    setSaving(true);
    try {
      const result = await centerAction<{ template: Row }>('templates.save', { template: draft });
      setDraft(result.template); setSelectedId(String(result.template.id));
      setTemplates((current) => current.some((item) => item.id === result.template.id) ? current.map((item) => item.id === result.template.id ? result.template : item) : [...current, result.template]);
      onNotice(`Template “${String(result.template.type)}” saved.`);
    } catch (error) { onError(errorText(error)); }
    finally { setSaving(false); }
  };
  const copyVariable = (name: string) => { void navigator.clipboard?.writeText(`{{${name}}}`).then(() => onNotice(`Copied {{${name}}}. Paste it into any field.`)).catch(() => undefined); };
  const parsedPreview = (() => { try { return JSON.parse(previewValues) as Record<string, unknown>; } catch { return null; } })();
  const channelsOf = (item: Row) => {
    const set = new Set<NotificationChannel>(['in_app']);
    if (item.push_title_template || item.push_body_template) set.add('push');
    if (item.email_subject_template || item.email_html_template) set.add('email');
    return [...set];
  };

  return <div className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)]">
    <Panel title="Templates" icon={LayoutTemplate} className="xl:sticky xl:top-4 xl:self-start">
      <div className="relative mb-3"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a template" className="h-9 pl-8" /></div>
      <div className="max-h-[60vh] space-y-1 overflow-y-auto">
        {filtered.map((item) => <button key={String(item.id)} type="button" onClick={() => { setSelectedId(String(item.id)); setDraft(item); }} className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm', String(item.id) === selectedId ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-muted/50')}>
          <span className="min-w-0 truncate">{String(item.type).replace(/_/g, ' ')}</span>
          <span className="flex shrink-0 items-center gap-1 text-muted-foreground">{item.is_active === false ? <Badge variant="outline" className="text-[10px]">Off</Badge> : channelsOf(item).map((channel) => { const Icon = CHANNEL_META[channel].icon; return <Icon key={channel} className="h-3.5 w-3.5" aria-label={CHANNEL_META[channel].label} />; })}</span>
        </button>)}
        {!filtered.length && <p className="px-3 py-4 text-center text-xs text-muted-foreground">No templates match.</p>}
      </div>
      <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => { setSelectedId(''); setDraft(blank); }}><Plus className="mr-2 h-4 w-4" />New template</Button>
    </Panel>

    <div className="space-y-4">
      <Panel title={draft.id ? `Edit “${String(draft.type).replace(/_/g, ' ')}”` : 'New template'} icon={PenLine} description="Wording for each channel. Fields left empty fall back to the in-app title and message."
        action={<div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm"><Switch checked={draft.is_active !== false} onCheckedChange={(checked) => setField('is_active', checked)} />Active</label><Button type="button" disabled={saving || !dirty || !String(draft.type ?? '').trim() || !String(draft.title_template ?? '').trim()} onClick={() => void save()}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}</Button></div>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Template type" value={String(draft.type ?? '')} onChange={(value) => setField('type', value)} hint={draft.id ? 'Must match the notification type that uses it.' : 'Lowercase with underscores, e.g. trip_update.'} />
          <Field label="Resend template ID (optional)" value={String(draft.resend_template_id ?? '')} onChange={(value) => setField('resend_template_id', value || null)} />
        </div>
        <div className="mt-4 rounded-lg border bg-muted/20 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-sm font-medium"><Tag className="h-4 w-4" />Variables</span><span className="text-xs text-muted-foreground">Click to copy, then paste into any field</span></div>
          <div className="flex flex-wrap gap-1.5">{[...variables, 'action_url'].filter((item, index, list) => list.indexOf(item) === index).map((name) => <button key={name} type="button" onClick={() => copyVariable(name)} className="rounded-md border bg-background px-2 py-1 font-mono text-xs hover:border-primary hover:text-primary">{`{{${name}}}`}</button>)}</div>
          <div className="mt-3"><Field label="Edit variable list (JSON array)" value={variablesText} mono onChange={(value) => { setVariablesText(value); try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) setField('variables', parsed); } catch { /* keep typing */ } }} error={variablesInvalid ? 'Must be a JSON array, e.g. ["trip_title"]' : null} /></div>
        </div>
        <Tabs defaultValue="in_app" className="mt-4">
          <TabsList><TabsTrigger value="in_app"><Bell className="mr-1.5 h-3.5 w-3.5" />In-app</TabsTrigger><TabsTrigger value="push"><Smartphone className="mr-1.5 h-3.5 w-3.5" />Push</TabsTrigger><TabsTrigger value="email"><Mail className="mr-1.5 h-3.5 w-3.5" />Email</TabsTrigger></TabsList>
          <TabsContent value="in_app" className="mt-3 space-y-4"><Field label="Title" value={String(draft.title_template ?? '')} onChange={(value) => setField('title_template', value)} hint="Required. Also the fallback for push and email." /><Field label="Message" value={String(draft.message_template ?? '')} onChange={(value) => setField('message_template', value)} multiline rows={3} /></TabsContent>
          <TabsContent value="push" className="mt-3 space-y-4"><Field label="Push title" value={String(draft.push_title_template ?? '')} onChange={(value) => setField('push_title_template', value)} maxLength={65} hint="Empty uses the in-app title." /><Field label="Push body" value={String(draft.push_body_template ?? '')} onChange={(value) => setField('push_body_template', value)} multiline rows={3} maxLength={240} hint="Empty uses the in-app message." /></TabsContent>
          <TabsContent value="email" className="mt-3 space-y-4"><Field label="Subject" value={String(draft.email_subject_template ?? '')} onChange={(value) => setField('email_subject_template', value)} maxLength={78} /><Field label="Plain text" value={String(draft.email_text_template ?? '')} onChange={(value) => setField('email_text_template', value)} multiline rows={4} /><Field label="HTML" value={String(draft.email_html_template ?? '')} onChange={(value) => setField('email_html_template', value)} multiline rows={8} mono hint="Empty uses Ketravelan’s generic email layout." /></TabsContent>
        </Tabs>
      </Panel>
      <Panel title="Preview" icon={Eye} description="Rendered with sample data in a sandboxed frame, escaped exactly as when sent." action={<Button type="button" size="sm" variant="ghost" onClick={() => setPreviewValues(JSON.stringify(sampleValuesFor(draft.variables), null, 2))}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Reset samples</Button>}>
        <div className="grid gap-4 2xl:grid-cols-[18rem_minmax(0,1fr)]">
          <Field label="Sample data (JSON)" value={previewValues} onChange={setPreviewValues} multiline rows={10} mono error={parsedPreview ? null : 'Invalid JSON; variables show as blank.'} />
          <TemplatePreview draft={draft} values={parsedPreview ?? {}} />
        </div>
      </Panel>
    </div>
  </div>;
}

function BroadcastsPanel({ data, onNotice, onError, onReload, onNavigate }: { data: Row; onNotice: (value: string) => void; onError: (value: string) => void; onReload: () => void; onNavigate: (tab: TabKey) => void }) {
  const [name, setName] = useState('');
  const [from, setFrom] = useState('Ketravelan <no-reply@ketravelan.com>');
  const [subject, setSubject] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [segments, setSegments] = useState<Row[]>([]);
  const [html, setHtml] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [confirm, setConfirm] = useState<'send' | 'schedule' | 'cancel' | null>(null);
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [busy, setBusy] = useState(false);
  const broadcasts = rowsFrom(data);
  const scheduledAt = localToIso(scheduledLocal);
  const counts = countBy(broadcasts, 'status');

  useEffect(() => { resendAction<Row>('segments.list', { limit: 100 }).then((result) => setSegments(rowsFrom(result))).catch(() => setSegments([])); }, []);

  const createDraft = async () => {
    setBusy(true);
    try {
      await resendAction<Row>('broadcasts.create', { name, from, subject, segmentId, html });
      onNotice(`Draft “${name}” created. Select it below to send or schedule.`);
      setName(''); setSubject(''); setHtml('');
      onReload();
    } catch (error) { onError(errorText(error)); }
    finally { setBusy(false); }
  };
  const perform = async () => {
    if (!selected || !confirm) return;
    setBusy(true);
    try {
      const id = String(selected.id);
      if (confirm === 'cancel') await resendAction<Row>('broadcasts.cancel', { id, confirmed: true });
      else await resendAction<Row>('broadcasts.send', { id, data: confirm === 'schedule' ? { scheduledAt } : {}, confirmed: true });
      onNotice(confirm === 'cancel' ? 'Broadcast cancelled.' : confirm === 'schedule' ? `Broadcast scheduled for ${new Date(scheduledAt).toLocaleString()}.` : 'Broadcast is sending.');
      setConfirm(null); setSelected(null);
      onReload();
    } catch (error) { onError(errorText(error)); }
    finally { setBusy(false); }
  };

  return <div className="space-y-4">
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="1 · Create a draft" icon={PenLine} description="Drafts aren’t sent until you send or schedule them.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Draft name (internal)" value={name} onChange={setName} placeholder="October newsletter" />
          <Field label="From" value={from} onChange={setFrom} />
          <div className="sm:col-span-2"><Field label="Subject" value={subject} onChange={setSubject} maxLength={78} /></div>
          <div className="grid gap-1.5 text-sm sm:col-span-2">
            <label htmlFor="segment" className="text-muted-foreground">Send to segment</label>
            {segments.length
              ? <select id="segment" value={segmentId} onChange={(event) => setSegmentId(event.target.value)} className="h-10 rounded-md border bg-background px-3"><option value="">Choose a segment…</option>{segments.map((segment) => <option key={String(segment.id)} value={String(segment.id)}>{String(segment.name ?? segment.id)}</option>)}</select>
              : <Input id="segment" value={segmentId} onChange={(event) => setSegmentId(event.target.value)} placeholder="Segment ID" />}
            <span className="text-xs text-muted-foreground">No suitable segment? <button type="button" className="font-medium text-primary hover:underline" onClick={() => onNavigate('segments')}>Create one in Segments</button>.</span>
          </div>
          <div className="sm:col-span-2"><Field label="HTML content" value={html} onChange={setHtml} multiline rows={6} mono placeholder="<h1>Hello {{{FIRST_NAME|there}}}</h1>" /></div>
        </div>
        <Button className="mt-3" type="button" disabled={busy || !name || !subject || !segmentId || !html} onClick={() => void createDraft()}><Plus className="mr-2 h-4 w-4" />Create draft</Button>
      </Panel>
      <div className="space-y-2"><p className="flex items-center gap-1.5 text-sm font-medium"><Eye className="h-4 w-4" />Draft preview</p><EmailFrame subject={subject} html={html} emptyText="Add HTML content to preview the broadcast." /></div>
    </div>

    <Panel title="2 · Pick a broadcast & act" icon={Megaphone} description="Click a broadcast, then send it now, schedule it, or cancel a scheduled one."
      action={<div className="flex flex-wrap gap-1">{counts.map(([status, count]) => <span key={status} className="inline-flex items-center gap-1"><StatusBadge status={status} /><span className="text-xs tabular-nums text-muted-foreground">{count}</span></span>)}</div>}>
      <DataTable rows={broadcasts} columns={['name', 'status', 'segment_id', 'created_at', 'scheduled_at', 'sent_at']} onRowClick={setSelected} selectedKey={selected ? String(selected.id) : undefined} empty="No broadcasts yet. Create a draft above." />
      <div className={cn('mt-4 rounded-lg border p-4 transition-opacity', !selected && 'opacity-60')}>
        <p className="text-sm">{selected ? <>Selected: <span className="font-semibold">{String(selected.name ?? selected.id)}</span> <StatusBadge status={selected.status} /></> : 'Select a broadcast from the list above.'}</p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Button type="button" disabled={!selected} onClick={() => setConfirm('send')}><Send className="mr-2 h-4 w-4" />Send now</Button>
          <div className="flex items-end gap-2"><div className="grid gap-1 text-xs"><label htmlFor="schedule-at" className="text-muted-foreground">Or schedule for</label><Input id="schedule-at" type="datetime-local" className="h-9" value={scheduledLocal} min={new Date().toISOString().slice(0, 16)} onChange={(event) => setScheduledLocal(event.target.value)} /></div><Button type="button" variant="outline" disabled={!selected || !scheduledAt} onClick={() => setConfirm('schedule')}><CalendarClock className="mr-2 h-4 w-4" />Schedule</Button></div>
          <Button type="button" variant="ghost" className="ml-auto text-destructive hover:text-destructive" disabled={!selected} onClick={() => setConfirm('cancel')}><X className="mr-2 h-4 w-4" />Cancel broadcast</Button>
        </div>
      </div>
    </Panel>
    <ConfirmOperation open={Boolean(confirm)} onOpenChange={(open) => { if (!open) setConfirm(null); }} busy={busy} onConfirm={() => void perform()} destructive={confirm === 'cancel'}
      title={confirm === 'cancel' ? 'Cancel this broadcast?' : confirm === 'schedule' ? 'Schedule this broadcast?' : 'Send this broadcast now?'}
      confirmLabel={confirm === 'cancel' ? 'Cancel broadcast' : confirm === 'schedule' ? 'Schedule' : 'Send now'}
      description={<>“{String(selected?.name ?? '')}” {confirm === 'cancel' ? 'will not be sent.' : <>goes to every contact in its segment{confirm === 'schedule' && scheduledAt ? <> on <strong>{new Date(scheduledAt).toLocaleString()}</strong></> : ' immediately'}.</>}</>} />
  </div>;
}

type ResourceKind = 'contacts' | 'topics' | 'properties' | 'segments' | 'domains' | 'webhooks';
interface Operation { op: string; label: string; help: string; example: Row; danger?: boolean }

const OPERATIONS: Record<ResourceKind, Operation[]> = {
  contacts: [
    { op: 'contacts.create', label: 'Add contact', help: 'Adds a new contact to Resend.', example: { email: 'name@example.com', firstName: '', lastName: '', unsubscribed: false } },
    { op: 'contacts.update', label: 'Update contact', help: 'Changes a contact’s details or subscription.', example: { idOrEmail: '', data: { unsubscribed: false } } },
    { op: 'contacts.list_segment', label: 'Contacts in a segment', help: 'Lists contacts that belong to one segment.', example: { segmentId: '' } },
    { op: 'contacts.remove', label: 'Remove contact', help: 'Permanently deletes the contact.', example: { idOrEmail: '' }, danger: true },
  ],
  topics: [
    { op: 'topics.create', label: 'Add topic', help: 'A subscription topic people can opt in or out of.', example: { name: '', defaultSubscription: 'opt_in' } },
    { op: 'topics.update', label: 'Update topic', help: 'Renames or changes a topic.', example: { id: '', data: { name: '' } } },
    { op: 'topics.remove', label: 'Remove topic', help: 'Deletes the topic.', example: { id: '' }, danger: true },
  ],
  properties: [
    { op: 'contactProperties.create', label: 'Add property', help: 'A custom field stored on each contact.', example: { key: '', type: 'string', fallbackValue: '' } },
    { op: 'contactProperties.update', label: 'Update property', help: 'Changes the fallback value.', example: { id: '', data: { fallbackValue: '' } } },
    { op: 'contactProperties.remove', label: 'Remove property', help: 'Deletes the property from all contacts.', example: { id: '' }, danger: true },
  ],
  segments: [
    { op: 'segments.create', label: 'Create segment', help: 'A new group of contacts for broadcasts.', example: { name: '' } },
    { op: 'contacts.list_segment', label: 'View contacts', help: 'Lists contacts in the selected segment.', example: { segmentId: '' } },
    { op: 'segments.remove', label: 'Remove segment', help: 'Deletes the segment (contacts are kept).', example: { id: '' }, danger: true },
  ],
  domains: [
    { op: 'domains.create', label: 'Add domain', help: 'Registers a domain and returns DNS records to add.', example: { name: 'mail.ketravelan.com' } },
    { op: 'domains.get', label: 'Show DNS records', help: 'Shows the records and their verification status.', example: { id: '' } },
    { op: 'domains.verify', label: 'Verify domain', help: 'Checks the DNS records again.', example: { id: '' } },
    { op: 'domains.remove', label: 'Remove domain', help: 'Stops sending from this domain.', example: { id: '' }, danger: true },
  ],
  webhooks: [
    { op: 'webhooks.create', label: 'Add webhook', help: 'Registers an endpoint for email events.', example: { endpoint: 'https://', events: ['email.delivered', 'email.bounced', 'email.opened'] } },
    { op: 'webhooks.get', label: 'Webhook details', help: 'Shows the configuration of one webhook.', example: { id: '' } },
    { op: 'webhooks.update', label: 'Update webhook', help: 'Changes the endpoint or events.', example: { id: '', data: { events: ['email.delivered'] } } },
    { op: 'webhooks.remove', label: 'Remove webhook', help: 'Stops sending events to this endpoint.', example: { id: '' }, danger: true },
  ],
};

const RESOURCE_COLUMNS: Partial<Record<ResourceKind, string[]>> = {
  contacts: ['email', 'first_name', 'last_name', 'unsubscribed', 'created_at', 'id'],
  segments: ['name', 'created_at', 'id'],
  domains: ['name', 'status', 'region', 'created_at', 'id'],
  webhooks: ['endpoint', 'status', 'events', 'created_at', 'id'],
};

function fillIds(example: Row, row: Row): Row {
  const next: Row = { ...example };
  if ('id' in next) next.id = row.id;
  if ('idOrEmail' in next) next.idOrEmail = row.email ?? row.id;
  if ('segmentId' in next) next.segmentId = row.id;
  if ('webhookId' in next) next.webhookId = row.id;
  return next;
}

function ResourcePanel({ kind, title, description, data, views, onView, onNotice, onError, onReload, onInspectEvents, extraRows = [] }: { kind: ResourceKind; title: string; description?: string; data: Row; views?: ReadonlyArray<readonly [string, string]>; onView?: (value: string) => void; onNotice: (value: string) => void; onError: (value: string) => void; onReload: () => void; onInspectEvents?: (id: string) => void; extraRows?: Row[] }) {
  const operations = OPERATIONS[kind];
  const [opKey, setOpKey] = useState(operations[0].op);
  const operation = operations.find((item) => item.op === opKey) ?? operations[0];
  const [payload, setPayload] = useState(JSON.stringify(operation.example, null, 2));
  const [selected, setSelected] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const rows = rowsFrom(data);
  const parsed = (() => { try { return JSON.parse(payload) as Row; } catch { return null; } })();

  useEffect(() => { setOpKey(operations[0].op); setPayload(JSON.stringify(operations[0].example, null, 2)); setSelected(null); setResult(null); }, [kind, operations]);

  const chooseOperation = (value: string) => {
    const next = operations.find((item) => item.op === value) ?? operations[0];
    setOpKey(next.op);
    setPayload(JSON.stringify(selected ? fillIds(next.example, selected) : next.example, null, 2));
    setResult(null);
  };
  const selectRow = (row: Row) => { setSelected(row); setPayload(JSON.stringify(fillIds(operation.example, row), null, 2)); if (kind === 'webhooks' && onInspectEvents) onInspectEvents(String(row.id)); };
  const execute = async () => {
    if (!parsed) return;
    setBusy(true);
    try {
      const response = await resendAction<Row>(operation.op, parsed);
      setResult(response.data ?? response);
      onNotice(`${operation.label}: done.`);
      setConfirmOpen(false);
      if (!operation.op.endsWith('.get') && operation.op !== 'contacts.list_segment') onReload();
    } catch (error) { onError(errorText(error)); }
    finally { setBusy(false); }
  };

  return <div className="space-y-4">
    <Panel title={title} description={description} action={views && onView ? <Segmented size="sm" value={kind} onChange={onView} options={views.map(([key, label]) => [key as ResourceKind, label] as const)} /> : undefined}>
      <DataTable rows={rows} columns={RESOURCE_COLUMNS[kind]} onRowClick={selectRow} selectedKey={selected ? String(selected.id) : undefined} empty={`No ${kind} yet. Use “${operations[0].label}” below.`} />
    </Panel>
    <Panel title="Take an action" icon={MousePointerClick} description={selected ? `Selected: ${String(selected.name ?? selected.email ?? selected.endpoint ?? selected.id)}` : 'Optionally click a row above to fill in its ID automatically.'}>
      <div className="flex flex-wrap gap-2">{operations.map((item) => <button key={item.op} type="button" onClick={() => chooseOperation(item.op)} aria-pressed={item.op === opKey} className={cn('rounded-lg border px-3 py-1.5 text-sm transition-colors', item.op === opKey ? (item.danger ? 'border-destructive bg-destructive/10 text-destructive' : 'border-primary bg-primary/10 text-primary') : 'hover:bg-muted/50')}>{item.label}</button>)}</div>
      <p className="mt-3 text-sm text-muted-foreground">{operation.help}</p>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Field label="Details (JSON)" value={payload} onChange={setPayload} multiline rows={7} mono error={parsed ? null : 'Invalid JSON'} hint="Fill in the empty values before running." />
        <div className="grid gap-1.5 text-sm"><span className="text-muted-foreground">Result</span><pre className="h-full min-h-32 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">{result ? JSON.stringify(result, null, 2) : 'Run an action to see the response here.'}</pre></div>
      </div>
      <Button type="button" className="mt-3" variant={operation.danger ? 'destructive' : 'default'} disabled={busy || !parsed} onClick={() => operation.danger ? setConfirmOpen(true) : void execute()}>{busy ? 'Working…' : operation.label}</Button>
    </Panel>
    {kind === 'webhooks' && <Panel title="Webhook event attempts" icon={Activity} description={selected ? 'Recent events delivered to the selected webhook.' : 'Select a webhook above to load its recent events.'}><DataTable rows={extraRows} empty="No events loaded." /></Panel>}
    <ConfirmOperation open={confirmOpen} onOpenChange={setConfirmOpen} busy={busy} destructive onConfirm={() => void execute()} title={`${operation.label}?`} confirmLabel={operation.label} description="This change is applied in Resend immediately and can’t be undone." />
  </div>;
}

function DevicesPanel({ data }: { data: Row }) {
  const rows = rowsFrom(data);
  const platforms = countBy(rows, 'platform');
  const users = new Set(rows.map((row) => row.user_id)).size;
  const platformIcon = (platform: string) => platform === 'web' ? Globe : Smartphone;
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Devices" value={rows.length.toLocaleString()} detail="Registered push tokens (latest 250)" icon={Smartphone} />
      <MetricCard label="Users" value={users.toLocaleString()} detail="Distinct people reachable by push" icon={Users} />
      {platforms.slice(0, 2).map(([platform, count]) => <MetricCard key={platform} label={platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : platform} value={count.toLocaleString()} detail={`${rows.length ? Math.round((count / rows.length) * 100) : 0}% of devices`} icon={platformIcon(platform)} />)}
    </div>
    <Panel title="Registered devices" icon={Smartphone} description="Most recently active first.">
      <DataTable rows={rows} columns={['user', 'platform', 'device_id', 'updated_at', 'created_at']} empty="No devices have registered for push yet." />
    </Panel>
  </div>;
}

function LogsPanel({ data }: { data: Row }) {
  const deliveries = rowsFrom(data.deliveries);
  const [channel, setChannel] = useState<'all' | NotificationChannel>('all');
  const [status, setStatus] = useState('all');
  const statuses = countBy(deliveries, 'status');
  const filtered = deliveries.filter((row) => (channel === 'all' || row.channel === channel) && (status === 'all' || row.status === status));
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {(['in_app', 'push', 'email'] as NotificationChannel[]).map((key) => {
        const forChannel = deliveries.filter((row) => row.channel === key);
        const ok = forChannel.filter((row) => ['sent', 'delivered'].includes(String(row.status))).length;
        return <button key={key} type="button" onClick={() => setChannel(channel === key ? 'all' : key)} className={cn('rounded-xl border bg-card p-4 text-left transition-colors', channel === key ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40')}>
          <div className="flex items-center justify-between text-sm text-muted-foreground">{CHANNEL_META[key].label}{(() => { const Icon = CHANNEL_META[key].icon; return <Icon className="h-4 w-4" />; })()}</div>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{forChannel.length.toLocaleString()}</p>
          <div className="mt-2"><ProgressBar value={forChannel.length ? (ok / forChannel.length) * 100 : 0} /></div>
          <p className="mt-1 text-xs text-muted-foreground">{ok.toLocaleString()} sent/delivered</p>
        </button>;
      })}
      <MetricCard label="Failed" value={(deliveries.filter((row) => row.status === 'failed').length).toLocaleString()} detail="Click “failed” below to filter" icon={AlertTriangle} tone={deliveries.some((row) => row.status === 'failed') ? 'danger' : 'default'} />
    </div>
    <Panel title="Delivery records" icon={Activity} description="One record per user and channel, newest first."
      action={<div className="flex flex-wrap items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><Segmented<'all' | NotificationChannel> size="sm" value={channel} onChange={setChannel} options={[['all', 'All'], ['in_app', 'In-app'], ['push', 'Push'], ['email', 'Email']]} /></div>}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setStatus('all')} className={cn('rounded-full border px-2.5 py-0.5 text-xs', status === 'all' ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>All statuses · {deliveries.length}</button>
        {statuses.map(([key, count]) => <button key={key} type="button" onClick={() => setStatus(status === key ? 'all' : key)} className={cn('inline-flex items-center gap-1 rounded-full border px-1 py-0.5 text-xs', status === key ? 'border-primary ring-1 ring-primary' : 'hover:bg-muted')}><StatusBadge status={key} /><span className="pr-1.5 tabular-nums text-muted-foreground">{count}</span></button>)}
      </div>
      <DataTable rows={filtered} columns={['user', 'channel', 'status', 'provider', 'last_error', 'attempts', 'sent_at', 'created_at']} empty="No delivery records match these filters." />
    </Panel>
    <Panel title="Verified provider events" icon={ShieldCheck} description="Signed events received from Resend (delivered, opened, bounced…).">
      <DataTable rows={rowsFrom(data.events)} empty="No provider events received yet." />
    </Panel>
  </div>;
}
