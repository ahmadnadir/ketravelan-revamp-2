import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Lightbulb, Search, type LucideIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type Row = Record<string, unknown>;

export function Panel({ title, description, icon: Icon, children, action, className }: { title: string; description?: string; icon?: LucideIcon; children: ReactNode; action?: ReactNode; className?: string }) {
  return <Card className={cn('rounded-xl border-border/60 p-4 shadow-none sm:p-5', className)}>
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 gap-3">
        {Icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>}
        <div className="min-w-0"><h2 className="font-semibold">{title}</h2>{description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}</div>
      </div>
      {action}
    </header>
    {children}
  </Card>;
}

export function Field({ label, value, onChange, placeholder, multiline = false, type = 'text', hint, error, rows = 5, maxLength, mono = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean; type?: string; hint?: ReactNode; error?: string | null; rows?: number; maxLength?: number; mono?: boolean }) {
  const over = maxLength ? value.length > maxLength : false;
  return <label className="grid min-w-0 gap-1.5 text-sm">
    <span className="flex items-center justify-between gap-2 text-muted-foreground"><span>{label}</span>{maxLength && <span className={cn('text-xs tabular-nums', over ? 'text-amber-600' : 'text-muted-foreground/70')}>{value.length}/{maxLength}</span>}</span>
    {multiline
      ? <Textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} aria-invalid={Boolean(error)} className={cn(mono && 'font-mono text-xs', error && 'border-destructive')} />
      : <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-invalid={Boolean(error)} className={cn(mono && 'font-mono text-xs', error && 'border-destructive')} />}
    {(error || hint || over) && <span className={cn('text-xs', error ? 'text-destructive' : over ? 'text-amber-600' : 'text-muted-foreground')}>{error ?? (over ? 'Longer than most devices display; it may be cut off.' : hint)}</span>}
  </label>;
}

export interface GuideStep { icon: LucideIcon; title: string; text: string }

/** Numbered "how it works" infographic shown at the top of each section. */
export function StepGuide({ title = 'How it works', steps, tip, open, onToggle }: { title?: string; steps: GuideStep[]; tip?: string; open: boolean; onToggle: () => void }) {
  return <Card className="overflow-hidden rounded-xl border-primary/15 bg-gradient-to-br from-primary/[0.06] via-background to-background shadow-none">
    <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5">
      <span className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="h-4 w-4 text-primary" />{title}<span className="font-normal text-muted-foreground">· {steps.length} steps</span></span>
      <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
    </button>
    {open && <div className="px-4 pb-4 sm:px-5 sm:pb-5">
      <ol className="flex flex-col gap-2 md:flex-row md:items-stretch">
        {steps.map((step, index) => <Fragment key={step.title}>
          <li className="relative flex flex-1 gap-3 rounded-lg border bg-background/80 p-3 md:flex-col md:gap-2">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <step.icon className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-foreground text-[10px] font-bold text-background">{index + 1}</span>
            </span>
            <div className="min-w-0"><p className="text-sm font-semibold">{step.title}</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.text}</p></div>
          </li>
          {index < steps.length - 1 && <li aria-hidden="true" className="flex items-center justify-center text-primary/50"><ArrowDown className="h-4 w-4 md:hidden" /><ArrowRight className="hidden h-4 w-4 md:block" /></li>}
        </Fragment>)}
      </ol>
      {tip && <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />{tip}</p>}
    </div>}
  </Card>;
}

/** Horizontal step indicator for multi-step forms. */
export function Stepper({ steps, current, completed, onSelect }: { steps: Array<{ title: string; icon: LucideIcon }>; current: number; completed: (index: number) => boolean; onSelect: (index: number) => void }) {
  return <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
    {steps.map((step, index) => {
      const done = completed(index) && index !== current;
      const active = index === current;
      return <li key={step.title}>
        <button type="button" onClick={() => onSelect(index)} aria-current={active ? 'step' : undefined} className={cn('flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors', active ? 'border-primary bg-primary/5' : 'hover:bg-muted/50')}>
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold', active ? 'bg-primary text-primary-foreground' : done ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground')}>{done ? <Check className="h-4 w-4" /> : index + 1}</span>
          <span className="min-w-0"><span className="block text-[11px] uppercase tracking-wide text-muted-foreground">Step {index + 1}</span><span className="block truncate text-sm font-medium">{step.title}</span></span>
        </button>
      </li>;
    })}
  </ol>;
}

export function ChoiceCard({ icon: Icon, title, description, selected, onClick, badge }: { icon: LucideIcon; title: string; description: string; selected: boolean; onClick: () => void; badge?: ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={selected} className={cn('relative flex w-full gap-3 rounded-lg border p-3 text-left transition-all', selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-foreground/20 hover:bg-muted/40')}>
    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}><Icon className="h-4 w-4" /></span>
    <span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-medium">{title}{badge}</span><span className="mt-0.5 block text-xs text-muted-foreground">{description}</span></span>
    {selected && <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />}
  </button>;
}

export function Segmented<T extends string>({ value, options, onChange, size = 'default' }: { value: T; options: ReadonlyArray<readonly [T, string, LucideIcon?]>; onChange: (value: T) => void; size?: 'default' | 'sm' }) {
  return <div role="radiogroup" className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1">
    {options.map(([key, label, Icon]) => <button key={key} type="button" role="radio" aria-checked={value === key} onClick={() => onChange(key)} className={cn('inline-flex items-center gap-1.5 rounded-md font-medium transition-colors', size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm', value === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{Icon && <Icon className="h-3.5 w-3.5" />}{label}</button>)}
  </div>;
}

const STATUS_TONES: Record<string, string> = {
  delivered: 'success', sent: 'success', opened: 'success', clicked: 'success', verified: 'success', active: 'success', completed: 'success', enabled: 'success',
  pending: 'warn', processing: 'warn', queued: 'warn', scheduled: 'warn', draft: 'muted', not_started: 'muted', skipped: 'muted', canceled: 'muted', cancelled: 'muted',
  failed: 'danger', bounced: 'danger', complained: 'danger', delivery_delayed: 'warn', error: 'danger', disabled: 'danger', temporary_failure: 'warn', failure: 'danger',
};
const TONE_CLASSES: Record<string, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300',
  warn: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
  danger: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300',
  muted: 'border-border bg-muted text-muted-foreground',
};

export function StatusBadge({ status }: { status: unknown }) {
  const value = String(status ?? '').toLowerCase();
  if (!value) return <span className="text-muted-foreground">—</span>;
  const tone = STATUS_TONES[value.replace(/^email\./, '')] ?? 'muted';
  return <Badge variant="outline" className={cn('whitespace-nowrap font-medium capitalize', TONE_CLASSES[tone])}>{value.replace(/^email\./, '').replace(/_/g, ' ')}</Badge>;
}

const CHANNEL_LABELS: Record<string, string> = { in_app: 'In-app', push: 'Push', email: 'Email' };
const COLUMN_LABELS: Record<string, string> = { id: 'ID', user: 'User', last_error: 'Error', provider_message_id: 'Provider ref', created_at: 'Created', updated_at: 'Updated', sent_at: 'Sent', delivered_at: 'Delivered' };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Cell({ column, value }: { column: string; value: unknown }) {
  if (value == null || value === '') return <span className="text-muted-foreground">—</span>;
  if (/(^|_)status$|^last_event$|^type$/.test(column) && typeof value === 'string' && column !== 'type') return <StatusBadge status={value} />;
  if (column === 'channel' && typeof value === 'string') return <Badge variant="secondary" className="font-medium">{CHANNEL_LABELS[value] ?? value}</Badge>;
  if (typeof value === 'boolean') return value ? <Check className="h-4 w-4 text-emerald-600" aria-label="Yes" /> : <span className="text-muted-foreground">No</span>;
  if ((/_at$/.test(column) || column === 'date') && typeof value === 'string') return <span className="whitespace-nowrap tabular-nums" title={value}>{formatDate(value)}</span>;
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return <span className="flex flex-wrap gap-1">{(value as string[]).map((item) => <Badge key={item} variant="outline" className="font-normal">{CHANNEL_LABELS[item] ?? item}</Badge>)}</span>;
  if (column === 'id' || /_id$/.test(column)) return <code className="rounded bg-muted px-1.5 py-0.5 text-xs" title={String(value)}>{String(value).slice(0, 8)}…</code>;
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return <span className="line-clamp-2 break-words" title={text}>{text}</span>;
}

/** Searchable table with readable headers, status badges and formatted dates. */
export function DataTable({ rows, empty = 'No records found.', hidden = [], columns: preferred, onRowClick, selectedKey, pageSize = 25, searchable = true }: { rows: Row[]; empty?: string; hidden?: string[]; columns?: string[]; onRowClick?: (row: Row) => void; selectedKey?: string; pageSize?: number; searchable?: boolean }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(pageSize);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? rows.filter((row) => JSON.stringify(row).toLowerCase().includes(needle)) : rows;
  }, [rows, query]);
  if (!rows.length) return <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground"><Search className="h-5 w-5" />{empty}</div>;
  const present = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const known = preferred?.filter((column) => present.includes(column)) ?? [];
  const columns = (known.length ? known : present).filter((column) => !hidden.includes(column)).slice(0, 8);
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * perPage;
  const visible = filtered.slice(start, start + perPage);
  return <div className="space-y-2">
    {searchable && <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="relative w-full max-w-xs"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Search records" className="h-9 pl-8" aria-label="Search records" /></div>
      <span className="text-xs text-muted-foreground">{filtered.length.toLocaleString()} of {rows.length.toLocaleString()} records{onRowClick && ' · click a row to use it'}</span>
    </div>}
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr>{columns.map((column) => <th key={column} className="px-3 py-2.5 font-medium">{COLUMN_LABELS[column] ?? column.replace(/_/g, ' ')}</th>)}</tr></thead>
        <tbody className="divide-y">{visible.map((row, index) => {
          const key = String(row.id ?? row.email ?? row.type ?? index);
          return <tr key={key} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn('align-top', onRowClick && 'cursor-pointer hover:bg-muted/40', selectedKey && selectedKey === String(row.id) && 'bg-primary/5')}>
            {columns.map((column) => <td key={column} className="max-w-72 px-3 py-2.5"><Cell column={column} value={row[column]} /></td>)}
          </tr>;
        })}</tbody>
      </table>
      {!filtered.length && <p className="px-4 py-6 text-center text-sm text-muted-foreground">No records match “{query}”.</p>}
    </div>
    {filtered.length > Math.min(perPage, 10) && <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>Rows per page</span>
        <select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(0); }} className="h-8 rounded-md border bg-background px-2 text-sm" aria-label="Rows per page">{[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select>
        <span className="tabular-nums">{(start + 1).toLocaleString()}–{Math.min(start + perPage, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 0} onClick={() => setPage(0)} aria-label="First page"><ChevronsLeft className="h-4 w-4" /></Button>
        <Button type="button" variant="outline" size="sm" className="h-8" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button>
        <span className="px-2 tabular-nums text-muted-foreground">Page <span className="font-medium text-foreground">{currentPage + 1}</span> of {pageCount.toLocaleString()}</span>
        <Button type="button" variant="outline" size="sm" className="h-8" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button>
        <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= pageCount - 1} onClick={() => setPage(pageCount - 1)} aria-label="Last page"><ChevronsRight className="h-4 w-4" /></Button>
      </div>
    </div>}
  </div>;
}

export function MetricCard({ label, value, detail, icon: Icon, tone = 'default', onClick }: { label: string; value: ReactNode; detail: string; icon: LucideIcon; tone?: 'default' | 'success' | 'danger' | 'warn'; onClick?: () => void }) {
  const toneClass = { default: 'bg-primary/10 text-primary', success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', danger: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', warn: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' }[tone];
  const body = <><div className="flex items-start justify-between gap-3"><span className="text-sm text-muted-foreground">{label}</span><span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', toneClass)}><Icon className="h-4 w-4" /></span></div><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></>;
  return onClick
    ? <button type="button" onClick={onClick} className="rounded-xl border border-border/60 bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">{body}</button>
    : <Card className="rounded-xl border-border/60 p-4 shadow-none">{body}</Card>;
}

export function ProgressBar({ value, tone = 'success' }: { value: number; tone?: 'success' | 'danger' | 'primary' }) {
  const color = { success: 'bg-emerald-500', danger: 'bg-red-500', primary: 'bg-primary' }[tone];
  return <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function ConfirmOperation({ open, onOpenChange, title, description, busy, onConfirm, confirmLabel = 'Confirm', destructive = false }: { open: boolean; onOpenChange: (value: boolean) => void; title: string; description: ReactNode; busy: boolean; onConfirm: () => void; confirmLabel?: string; destructive?: boolean }) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription asChild><div className="text-sm text-muted-foreground">{description}</div></AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Go back</AlertDialogCancel><AlertDialogAction disabled={busy} className={destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined} onClick={(event) => { event.preventDefault(); onConfirm(); }}>{busy ? 'Working…' : confirmLabel}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

