import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Banknote, BarChart3, Building2, ChevronLeft, ChevronRight, CircleDollarSign, Link2, Pause, Pencil, PlayCircle, Plus, RefreshCw, ShieldCheck, Target, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getAdminAccess, hasPermission } from '@/admin/lib/adminAccess';
import {
  createAffiliateRecord,
  deleteAffiliateRecord,
  editAffiliateRecord,
  getAffiliateDependencyCounts,
  getAffiliateOptions,
  getAffiliateRevenueOverview,
  listAffiliateRecords,
  updateAffiliateRecordStatus,
  type AffiliateEntity,
  type AffiliateOptions,
  type AffiliateRevenueOverview,
  type AffiliateRow,
  type AffiliateTab,
} from '@/admin/lib/adminAffiliateRevenue';

const DEPENDENT_LABELS: Partial<Record<AffiliateEntity, string>> = {
  providers: 'programs or commissions',
  programs: 'campaigns or commissions',
  campaigns: 'affiliate links',
  links: 'clicks or conversions',
};

const PAGE_SIZE = 20;
const TAB_ROUTES: Array<{ tab: AffiliateTab; label: string; path: string }> = [
  { tab: 'overview', label: 'Overview', path: '/admin/affiliate' },
  { tab: 'providers', label: 'Providers / Networks', path: '/admin/affiliate/providers' },
  { tab: 'programs', label: 'Programs', path: '/admin/affiliate/programs' },
  { tab: 'campaigns', label: 'Campaigns', path: '/admin/affiliate/campaigns' },
  { tab: 'links', label: 'Affiliate links', path: '/admin/affiliate/links' },
  { tab: 'clicks', label: 'Click tracking', path: '/admin/affiliate/clicks' },
  { tab: 'conversions', label: 'Conversions', path: '/admin/affiliate/conversions' },
  { tab: 'commissions', label: 'Commissions / revenue', path: '/admin/affiliate/commissions' },
  { tab: 'reconciliation', label: 'Reconciliation', path: '/admin/affiliate/reconciliation' },
];

const STATUS_OPTIONS: Partial<Record<AffiliateEntity, string[]>> = {
  providers: ['active', 'paused', 'inactive'],
  programs: ['active', 'paused', 'inactive'],
  campaigns: ['active', 'paused', 'completed'],
  links: ['active', 'paused', 'expired'],
  conversions: ['pending', 'approved', 'rejected', 'cancelled'],
  commissions: ['pending', 'approved', 'received', 'reconciled', 'rejected'],
};

const SOURCE_TITLES: Record<AffiliateEntity, string> = {
  providers: 'Providers / Networks',
  programs: 'Programs',
  campaigns: 'Campaigns',
  links: 'Affiliate links',
  clicks: 'Click tracking',
  conversions: 'Conversions',
  commissions: 'Commissions / revenue',
};

function asObject(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown> | undefined) || {};
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = '—') {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function toDateTimeLocal(value: unknown) {
  if (typeof value !== 'string' || !value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function formatMoney(value: unknown, currency: unknown) {
  const amount = Number(value);
  const code = typeof currency === 'string' ? currency : '';
  if (!Number.isFinite(amount)) return '—';
  if (!code) return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (currency not recorded)`;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

function StatusBadge({ value }: { value: unknown }) {
  const status = text(value, 'unknown');
  const variant = ['active', 'approved', 'received', 'reconciled'].includes(status)
    ? 'secondary'
    : ['rejected', 'inactive', 'expired'].includes(status)
      ? 'destructive'
      : 'outline';
  return <Badge variant={variant} className="whitespace-nowrap capitalize">{status.replace(/_/g, ' ')}</Badge>;
}

function TableFrame({ headers, children, emptyMessage, centered = false }: { headers: string[]; children: ReactNode; emptyMessage: string; centered?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="overflow-x-auto">
        <table className={`w-full min-w-[760px] text-sm ${centered ? 'text-center' : 'text-left'}`}>
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-medium">{header}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
      {emptyMessage && <div className="px-4 py-12 text-center text-sm text-muted-foreground">{emptyMessage}</div>}
    </div>
  );
}

export default function AdminAffiliateRevenue() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = TAB_ROUTES.find((item) => item.path === location.pathname)?.tab || 'overview';
  const [overview, setOverview] = useState<AffiliateRevenueOverview | null>(null);
  const [rows, setRows] = useState<AffiliateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AffiliateRow | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [options, setOptions] = useState<AffiliateOptions>({ providers: [], programs: [], campaigns: [] });
  const [refreshKey, setRefreshKey] = useState(0);
  const [dependencyCounts, setDependencyCounts] = useState<Record<string, number>>({});
  const [deleteTarget, setDeleteTarget] = useState<AffiliateRow | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const entity: AffiliateEntity | null = activeTab === 'overview' || activeTab === 'reconciliation'
    ? activeTab === 'reconciliation' ? 'commissions' : null
    : activeTab;
  const isReconciliation = activeTab === 'reconciliation';
  const hasStatusFilter = Boolean(entity && STATUS_OPTIONS[entity]);

  useEffect(() => {
    let active = true;
    void getAdminAccess().then((access) => {
      if (active) setCanManage(hasPermission(access, 'affiliate.manage'));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage('');
    const load = async () => {
      try {
        if (!entity) {
          const result = await getAffiliateRevenueOverview();
          if (active) setOverview(result);
          return;
        }
        const result = await listAffiliateRecords(entity, page, PAGE_SIZE, status);
        if (!active) return;
        setRows(result.rows);
        setTotal(result.total);

        if (['providers', 'programs', 'campaigns', 'links'].includes(entity)) {
          const ids = result.rows.map((row) => String(row.id)).filter(Boolean);
          const counts = await getAffiliateDependencyCounts(entity as 'providers' | 'programs' | 'campaigns' | 'links', ids);
          if (active) setDependencyCounts(counts);
        } else if (active) {
          setDependencyCounts({});
        }
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Unable to load affiliate revenue data.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [entity, page, status, refreshKey]);

  useEffect(() => {
    if (!canManage || !['programs', 'campaigns', 'links'].includes(activeTab)) return;
    let active = true;
    void getAffiliateOptions()
      .then((value) => { if (active) setOptions(value); })
      .catch((error: unknown) => {
        if (active) setFormError(error instanceof Error ? error.message : 'Unable to load affiliate relationships.');
      });
    return () => { active = false; };
  }, [activeTab, canManage]);

  const revenueByCurrency = useMemo(() => overview?.revenue || [], [overview]);
  const commissionStatusTotals = useMemo(() => {
    const totals = new Map<string, { status: string; currency: string; records: number; amount: number }>();
    revenueByCurrency.forEach((item) => {
      const key = `${item.status}:${item.currency}`;
      const total = totals.get(key) || { status: item.status, currency: item.currency, records: 0, amount: 0 };
      total.records += Number(item.records) || 0;
      total.amount += Number(item.amount) || 0;
      totals.set(key, total);
    });
    return Array.from(totals.values()).sort((a, b) => a.status.localeCompare(b.status) || a.currency.localeCompare(b.currency));
  }, [revenueByCurrency]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const changeTab = (tab: AffiliateTab) => {
    setPage(1);
    setStatus('all');
    setFormOpen(false);
    setEditingRecord(null);
    navigate(TAB_ROUTES.find((item) => item.tab === tab)?.path || '/admin/affiliate');
  };

  const openCreateForm = async () => {
    setFormError('');
    setEditingRecord(null);
    if (['programs', 'campaigns', 'links'].includes(activeTab)) {
      try {
        setOptions(await getAffiliateOptions());
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Unable to load affiliate relationships.');
        return;
      }
    }
    setFormOpen(true);
  };

  const openEditForm = async (row: AffiliateRow) => {
    if (!canManage || !['providers', 'programs', 'campaigns', 'links'].includes(activeTab)) return;
    setFormError('');
    if (['programs', 'campaigns', 'links'].includes(activeTab)) {
      try {
        setOptions(await getAffiliateOptions());
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Unable to load affiliate relationships.');
        return;
      }
    }
    setEditingRecord(row);
    setFormOpen(true);
  };

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage || !['providers', 'programs', 'campaigns', 'links'].includes(activeTab)) return;
    const form = new FormData(event.currentTarget);
    const raw = Object.fromEntries(form.entries());
    const stringValue = (key: string) => String(raw[key] || '').trim();
    let values: Record<string, unknown>;
    if (activeTab === 'providers') {
      values = { name: stringValue('name'), network_type: stringValue('network_type'), base_url: stringValue('base_url') || null };
    } else if (activeTab === 'programs') {
      const model = stringValue('commission_model');
      values = {
        provider_id: stringValue('provider_id'), name: stringValue('name'), category: stringValue('category') || null,
        commission_model: model,
        commission_rate: model === 'percentage' ? Number(stringValue('commission_rate')) : null,
        fixed_commission_amount: model === 'fixed' ? Number(stringValue('fixed_commission_amount')) : null,
        currency: stringValue('currency').toUpperCase() || null,
        starts_at: stringValue('starts_at') || null,
        ends_at: stringValue('ends_at') || null,
      };
    } else if (activeTab === 'campaigns') {
      values = { program_id: stringValue('program_id'), name: stringValue('name'), tracking_marker: stringValue('tracking_marker'), destination_url: stringValue('destination_url'), starts_at: stringValue('starts_at') || null, ends_at: stringValue('ends_at') || null };
    } else {
      values = { campaign_id: stringValue('campaign_id'), code: stringValue('code'), destination_url: stringValue('destination_url'), expires_at: stringValue('expires_at') || null };
    }

    setFormSaving(true);
    setFormError('');
    try {
      const editableEntity = activeTab as 'providers' | 'programs' | 'campaigns' | 'links';
      if (editingRecord) {
        await editAffiliateRecord(editableEntity, String(editingRecord.id), values);
      } else {
        await createAffiliateRecord(editableEntity, { ...values, status: 'active' });
      }
      setFormOpen(false);
      setEditingRecord(null);
      setPage(1);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create affiliate record.');
    } finally {
      setFormSaving(false);
    }
  };

  const toggleRecordStatus = async (row: AffiliateRow) => {
    if (!canManage || !['providers', 'programs', 'campaigns', 'links'].includes(activeTab)) return;
    const nextStatus = row.status === 'active' ? 'paused' : 'active';
    try {
      await updateAffiliateRecordStatus(activeTab as 'providers' | 'programs' | 'campaigns' | 'links', String(row.id), nextStatus);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update affiliate status.');
    }
  };

  const confirmDeleteRecord = async () => {
    if (!canManage || !deleteTarget || !['providers', 'programs', 'campaigns', 'links'].includes(activeTab)) return;
    setDeleteSaving(true);
    setDeleteError('');
    try {
      await deleteAffiliateRecord(activeTab as 'providers' | 'programs' | 'campaigns' | 'links', String(deleteTarget.id));
      setDeleteTarget(null);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete this record.');
    } finally {
      setDeleteSaving(false);
    }
  };

  const renderFormFields = () => {
    if (activeTab === 'providers') return (
      <>
        <Field label="Provider / network name"><input name="name" required maxLength={120} defaultValue={text(editingRecord?.name, '')} placeholder="Travelpayouts" /></Field>
        <Field label="Network type"><select name="network_type" defaultValue={text(editingRecord?.network_type, 'network')}><option value="network">Affiliate network</option><option value="direct">Direct program</option></select></Field>
        <Field label="Website"><input name="base_url" type="url" defaultValue={text(editingRecord?.base_url, '')} placeholder="https://example.com" /></Field>
      </>
    );
    if (activeTab === 'programs') return (
      <>
        <Field label="Provider"><select name="provider_id" required defaultValue={text(editingRecord?.provider_id, '')}><option value="" disabled>Select provider</option>{options.providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></Field>
        <Field label="Program name"><input name="name" required maxLength={120} defaultValue={text(editingRecord?.name, '')} /></Field>
        <Field label="Category"><input name="category" maxLength={80} defaultValue={text(editingRecord?.category, '')} placeholder="Hotels" /></Field>
        <Field label="Commission model"><select name="commission_model" defaultValue={text(editingRecord?.commission_model, 'percentage')}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></Field>
        <Field label="Commission rate (%)"><input name="commission_rate" type="number" min="0" max="100" step="0.0001" defaultValue={text(editingRecord?.commission_rate, '')} /></Field>
        <Field label="Fixed amount"><input name="fixed_commission_amount" type="number" min="0" step="0.01" defaultValue={text(editingRecord?.fixed_commission_amount, '')} /></Field>
        <Field label="Currency"><input name="currency" minLength={3} maxLength={3} defaultValue={text(editingRecord?.currency, '')} placeholder="USD" /></Field>
        <Field label="Starts at"><input name="starts_at" type="datetime-local" defaultValue={toDateTimeLocal(editingRecord?.starts_at)} /></Field>
        <Field label="Ends at"><input name="ends_at" type="datetime-local" defaultValue={toDateTimeLocal(editingRecord?.ends_at)} /></Field>
      </>
    );
    if (activeTab === 'campaigns') return (
      <>
        <Field label="Program"><select name="program_id" required defaultValue={text(editingRecord?.program_id, '')}><option value="" disabled>Select program</option>{options.programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></Field>
        <Field label="Campaign name"><input name="name" required maxLength={120} defaultValue={text(editingRecord?.name, '')} /></Field>
        <Field label="Tracking marker"><input name="tracking_marker" required maxLength={120} defaultValue={text(editingRecord?.tracking_marker, '')} /></Field>
        <Field label="Destination URL"><input name="destination_url" type="url" required defaultValue={text(editingRecord?.destination_url, '')} /></Field>
        <Field label="Starts at"><input name="starts_at" type="datetime-local" defaultValue={toDateTimeLocal(editingRecord?.starts_at)} /></Field>
        <Field label="Ends at"><input name="ends_at" type="datetime-local" defaultValue={toDateTimeLocal(editingRecord?.ends_at)} /></Field>
      </>
    );
    return (
      <>
        <Field label="Campaign"><select name="campaign_id" required defaultValue={text(editingRecord?.campaign_id, '')}><option value="" disabled>Select campaign</option>{options.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></Field>
        <Field label="Link code"><input name="code" required maxLength={100} defaultValue={text(editingRecord?.code, '')} /></Field>
        <Field label="Destination URL"><input name="destination_url" type="url" required defaultValue={text(editingRecord?.destination_url, '')} /></Field>
        <Field label="Expires at"><input name="expires_at" type="datetime-local" defaultValue={toDateTimeLocal(editingRecord?.expires_at)} /></Field>
      </>
    );
  };

  const renderRow = (row: AffiliateRow) => {
    const provider = asObject(row.provider);
    const program = asObject(row.program);
    const campaign = asObject(row.campaign);
    const nestedProvider = asObject(program.provider);
    const nestedProgram = asObject(campaign.program);
    if (activeTab === 'providers') return <><td>{text(row.name)}</td><td className="capitalize">{text(row.network_type)}</td><td>{text(row.base_url)}</td><td><StatusBadge value={row.status} /></td><td>{formatDate(row.created_at)}</td></>;
    if (activeTab === 'programs') return <><td>{text(row.name)}</td><td>{text(provider.name)}</td><td>{text(row.category)}</td><td className="capitalize">{text(row.commission_model)}</td><td>{row.commission_rate === null ? text(row.fixed_commission_amount) : `${text(row.commission_rate)}%`}</td><td><StatusBadge value={row.status} /></td></>;
    if (activeTab === 'campaigns') return <><td>{text(row.name)}</td><td>{text(program.name)}</td><td>{text(row.tracking_marker)}</td><td className="max-w-64 truncate">{text(row.destination_url)}</td><td><StatusBadge value={row.status} /></td></>;
    if (activeTab === 'links') return <><td className="font-mono">{text(row.code)}</td><td>{text(campaign.name)}</td><td>{text(nestedProgram.name)}</td><td className="max-w-64 truncate">{text(row.destination_url)}</td><td><StatusBadge value={row.status} /></td><td>{formatDate(row.expires_at)}</td></>;
    if (activeTab === 'clicks') return <><td>{text(provider.name, text(campaign.name, text(row.code, text(asObject(row.link).code))))}</td><td>{text(asObject(asObject(row.link).campaign).name)}</td><td>{formatDate(row.created_at)}</td><td>{text(asObject(row.device_metadata).type, 'Unknown')}</td></>;
    if (activeTab === 'conversions') return <><td>{text(asObject(row.link).code)}</td><td>{text(asObject(asObject(row.link).campaign).name)}</td><td><StatusBadge value={row.status} /></td><td>{formatMoney(row.conversion_amount, row.currency)}</td><td>{formatDate(row.converted_at || row.created_at)}</td></>;
    return <><td>{text(provider.name)}</td><td>{text(program.name)}</td><td><StatusBadge value={row.status} /></td><td>{formatMoney(row.commission_amount, row.currency)}</td><td>{formatDate(row.received_at)}</td><td>{formatDate(row.reconciled_at)}</td><td>{text(row.reconciliation_reference)}</td></>;
  };

  const headers: Partial<Record<AffiliateEntity, string[]>> = {
    providers: ['Provider', 'Network type', 'Website', 'Status', 'Added'],
    programs: ['Program', 'Provider', 'Category', 'Commission model', 'Rate', 'Status'],
    campaigns: ['Campaign', 'Program', 'Tracking marker', 'Destination', 'Status'],
    links: ['Link code', 'Campaign', 'Program', 'Destination', 'Status', 'Expires'],
    clicks: ['Link / campaign', 'Campaign', 'Click time', 'Device'],
    conversions: ['Link code', 'Campaign', 'Status', 'Booking value', 'Converted'],
    commissions: ['Provider', 'Program', 'Status', 'Commission', 'Received', 'Reconciled', 'Reference'],
  };

  const addable = canManage && ['providers', 'programs', 'campaigns', 'links'].includes(activeTab);
  const canToggleStatus = canManage && ['providers', 'programs', 'campaigns', 'links'].includes(activeTab);
  const pageTitle = isReconciliation ? 'Reconciliation foundation' : entity ? SOURCE_TITLES[entity] : 'Affiliate & Partner Revenue';

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"><Building2 className="h-4 w-4" /> Internal operator</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{pageTitle}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Ketravelan-managed affiliate providers, tracking, attribution, partner commissions and revenue reconciliation.</p>
        </div>
        {entity && <Button type="button" variant="outline" onClick={() => setRefreshKey((current) => current + 1)} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>}
      </header>

      <nav aria-label="Affiliate revenue sections" className="flex gap-1 overflow-x-auto border-b border-border">
        {TAB_ROUTES.map((item) => (
          <Link key={item.tab} to={item.path} aria-current={activeTab === item.tab ? 'page' : undefined} className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === item.tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {item.label}
          </Link>
        ))}
      </nav>

      {errorMessage && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{errorMessage}</div>}

      {activeTab === 'overview' ? (
        loading ? <LoadingState /> : overview ? (
          <AffiliateOverview overview={overview} commissionStatusTotals={commissionStatusTotals} />
        ) : <EmptyState title="No overview data" />
      ) : (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">{total.toLocaleString()} records</div>
            <div className="flex flex-wrap items-center gap-2">
              {hasStatusFilter && <label className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Status</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-9 min-w-40 rounded-md border border-input bg-background px-3"><option value="all">All statuses</option>{STATUS_OPTIONS[entity as AffiliateEntity]?.map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}</select></label>}
              {addable && <Button type="button" size="sm" onClick={() => void openCreateForm()}><Plus className="mr-2 h-4 w-4" />Add {activeTab === 'providers' ? 'provider' : activeTab === 'links' ? 'link' : activeTab.slice(0, -1)}</Button>}
            </div>
          </div>

          {['clicks', 'conversions', 'commissions', 'reconciliation'].includes(activeTab) && (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>Read-only audit records. Clicks, attributed conversions and commission/reconciliation entries are written by trusted ingestion workflows; direct edits are disabled to preserve financial and attribution integrity.</p>
            </div>
          )}

          {formOpen && entity && (
            <Card className="rounded-lg p-4 shadow-none sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-4"><h2 className="font-semibold">{editingRecord ? 'Edit' : 'Add'} {activeTab === 'providers' ? 'provider / network' : activeTab.slice(0, -1)}</h2><Button type="button" variant="ghost" size="sm" onClick={() => { setFormOpen(false); setEditingRecord(null); }}>Cancel</Button></div>
              {formError && <div role="alert" className="mb-4 rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{formError}</div>}
              <form key={`${activeTab}-${String(editingRecord?.id || 'new')}`} onSubmit={(event) => void submitCreate(event)} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {renderFormFields()}
                <div className="flex items-end"><Button type="submit" disabled={formSaving}>{formSaving ? 'Saving…' : editingRecord ? 'Save changes' : 'Create record'}</Button></div>
              </form>
              <p className="mt-3 text-xs text-muted-foreground">Provider credentials are not entered or stored in this console. Configure secrets only through approved secret management.</p>
            </Card>
          )}

          {loading ? <LoadingState /> : rows.length === 0 ? <EmptyState title={`No ${pageTitle.toLowerCase()} found`} /> : (
            <TableFrame headers={[...(headers[entity as AffiliateEntity] || []), ...(canToggleStatus ? ['Actions'] : [])]} emptyMessage="" centered={activeTab === 'providers'}>
              {rows.map((row, index) => {
                const dependents = dependencyCounts[String(row.id)] || 0;
                const dependentLabel = DEPENDENT_LABELS[activeTab as AffiliateEntity];
                return (
                  <tr key={String(row.id || index)}>
                    {renderRow(row)}
                    {canToggleStatus && (
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Edit" aria-label="Edit" onClick={() => void openEditForm(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <span className="h-5 w-px bg-border" />
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title={row.status === 'active' ? 'Pause' : 'Activate'} aria-label={row.status === 'active' ? 'Pause' : 'Activate'} onClick={() => void toggleRecordStatus(row)}>
                            {row.status === 'active' ? <Pause className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                          </Button>
                          <span className="h-5 w-px bg-border" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title={dependents > 0 ? `Cannot delete: still referenced by ${dependentLabel}` : 'Delete'}
                            aria-label="Delete"
                            disabled={dependents > 0}
                            onClick={() => { setDeleteError(''); setDeleteTarget(row); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </TableFrame>
          )}

          <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteError(''); } }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this {activeTab === 'providers' ? 'provider' : activeTab.slice(0, -1)}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the record. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError && <div role="alert" className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{deleteError}</div>}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteSaving}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={(event) => { event.preventDefault(); void confirmDeleteRecord(); }} disabled={deleteSaving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleteSaving ? 'Deleting…' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">Page {page} of {pageCount}</p><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount || loading}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div>
          {isReconciliation && <p className="rounded-md border border-border px-4 py-3 text-sm text-muted-foreground">Reconciliation is a read-only foundation based on commission status, receipt date and reconciliation reference. No external payout or reconciliation mutation is configured.</p>}
        </section>
      )}
    </div>
  );
}

function AffiliateOverview({
  overview,
  commissionStatusTotals,
}: {
  overview: AffiliateRevenueOverview;
  commissionStatusTotals: Array<{ status: string; currency: string; records: number; amount: number }>;
}) {
  const stages: Array<{ label: string; value: number; icon: typeof Users; tab: AffiliateTab }> = [
    { label: 'Providers', value: overview.providers, icon: Users, tab: 'providers' },
    { label: 'Programs', value: overview.programs, icon: Target, tab: 'programs' },
    { label: 'Campaigns', value: overview.campaigns, icon: BarChart3, tab: 'campaigns' },
    { label: 'Links', value: overview.links, icon: Link2, tab: 'links' },
    { label: 'Clicks', value: overview.clicks, icon: Activity, tab: 'clicks' },
    { label: 'Conversions', value: overview.conversions, icon: ArrowRight, tab: 'conversions' },
    { label: 'Commissions', value: overview.commissions, icon: Banknote, tab: 'commissions' },
  ];
  const kpis: Array<{ label: string; value: number; detail: string; icon: typeof Users; tone: string }> = [
    { label: 'Tracked clicks', value: overview.clicks, detail: 'Attribution activity', icon: Activity, tone: 'text-cyan-700 bg-cyan-50' },
    { label: 'Conversions', value: overview.conversions, detail: 'Attributed bookings', icon: Target, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Commission records', value: overview.commissions, detail: 'Partner revenue entries', icon: Banknote, tone: 'text-amber-700 bg-amber-50' },
    { label: 'Active setup records', value: overview.providers + overview.programs + overview.campaigns + overview.links, detail: 'Providers, programs, campaigns and links', icon: ShieldCheck, tone: 'text-slate-700 bg-slate-100' },
  ];
  const routeFor = (tab: AffiliateTab) => TAB_ROUTES.find((item) => item.tab === tab)?.path || '/admin/affiliate';

  return (
    <div className="space-y-6">
      <section aria-label="Affiliate operating metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, detail, icon: Icon, tone }) => (
          <Card key={label} className="rounded-lg p-4 shadow-none sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-md ${tone}`}><Icon className="h-4 w-4" /></div>
              <span className="text-xs text-muted-foreground">All time</span>
            </div>
            <div className="mt-4 text-2xl font-semibold tabular-nums">{Number(value || 0).toLocaleString()}</div>
            <div className="mt-1 text-sm font-medium">{label}</div>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </Card>
        ))}
      </section>

      <Card className="rounded-lg p-4 shadow-none sm:p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="font-semibold">Attribution pipeline</h2><p className="mt-1 text-sm text-muted-foreground">Follow the operator-managed path from provider setup to recorded commission.</p></div>
          <span className="text-xs text-muted-foreground">Click a stage to inspect records</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {stages.map(({ label, value, icon: Icon, tab }, index) => (
            <Link key={tab} to={routeFor(tab)} className="group relative flex min-h-24 flex-col justify-between rounded-md border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex items-center justify-between gap-2"><Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />{index < stages.length - 1 && <ArrowRight className="hidden h-3.5 w-3.5 text-muted-foreground/60 xl:block" />}</div>
              <div><div className="text-xl font-semibold tabular-nums">{Number(value || 0).toLocaleString()}</div><div className="text-xs text-muted-foreground">{label}</div></div>
            </Link>
          ))}
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.8fr)]">
        <Card className="rounded-lg p-4 shadow-none sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="font-semibold">Commission status queue</h2><p className="mt-1 text-sm text-muted-foreground">Commission amounts remain separated by currency.</p></div>
            <Link to={routeFor('commissions')} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">All commissions <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          {commissionStatusTotals.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center"><Banknote className="mx-auto h-5 w-5 text-muted-foreground" /><p className="mt-2 text-sm font-medium">No commission records yet</p><p className="mt-1 text-xs text-muted-foreground">Commission entries appear here after secure provider ingestion.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground"><tr><th className="py-2 pr-3 font-medium">Status</th><th className="py-2 pr-3 font-medium">Currency</th><th className="py-2 pr-3 text-right font-medium">Records</th><th className="py-2 text-right font-medium">Commission amount</th><th className="py-2 pl-3 text-right font-medium">Queue</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {commissionStatusTotals.map((item) => {
                    const destination = item.status === 'received' ? 'reconciliation' : 'commissions';
                    return <tr key={`${item.status}-${item.currency}`}><td className="py-3 pr-3"><StatusBadge value={item.status} /></td><td className="py-3 pr-3">{item.currency}</td><td className="py-3 pr-3 text-right tabular-nums">{Number(item.records).toLocaleString()}</td><td className="py-3 text-right tabular-nums">{formatMoney(item.amount, item.currency)}</td><td className="py-3 pl-3 text-right"><Link to={routeFor(destination)} className="text-sm font-medium text-primary hover:underline">Review</Link></td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="rounded-lg p-4 shadow-none sm:p-5">
          <div className="mb-4"><h2 className="font-semibold">Operations</h2><p className="mt-1 text-sm text-muted-foreground">Common setup and review destinations.</p></div>
          <div className="divide-y divide-border">
            {[
              { title: 'Manage providers', description: `${overview.providers.toLocaleString()} provider / network records`, tab: 'providers' as const, icon: Users },
              { title: 'Configure campaigns', description: `${overview.campaigns.toLocaleString()} campaigns · ${overview.links.toLocaleString()} links`, tab: 'campaigns' as const, icon: Target },
              { title: 'Review conversions', description: `${overview.conversions.toLocaleString()} attributed bookings`, tab: 'conversions' as const, icon: BarChart3 },
              { title: 'Reconcile commissions', description: `${overview.commissions.toLocaleString()} commission records`, tab: 'reconciliation' as const, icon: CircleDollarSign },
            ].map(({ title, description, tab, icon: Icon }) => (
              <Link key={tab} to={routeFor(tab)} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:text-foreground"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{title}</span><span className="block truncate text-xs text-muted-foreground">{description}</span></span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <div className="flex items-start gap-3 rounded-md border border-border px-4 py-3 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p>Internal operator console only. Clicks, conversions and commission records are read-only here; secure provider ingestion and reconciliation mutations are not enabled.</p></div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <Card className="rounded-lg p-4 shadow-none"><div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-muted-foreground" /></div><div className="mt-3 text-2xl font-semibold tabular-nums">{Number(value || 0).toLocaleString()}</div></Card>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm"><span className="text-muted-foreground">{label}</span><span className="[&_input]:h-9 [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-input [&_input]:bg-background [&_input]:px-3 [&_input]:text-sm [&_select]:h-9 [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-input [&_select]:bg-background [&_select]:px-3 [&_select]:text-sm">{children}</span></label>;
}

function LoadingState() {
  return <div className="rounded-lg border bg-background py-14 text-center text-sm text-muted-foreground">Loading affiliate revenue data…</div>;
}

function EmptyState({ title }: { title: string }) {
  return <div className="rounded-lg border bg-background py-14 text-center text-sm text-muted-foreground">{title}</div>;
}
