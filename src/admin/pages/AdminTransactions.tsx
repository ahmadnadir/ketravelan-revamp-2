import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Banknote, ChevronLeft, ChevronRight, CreditCard, RefreshCw, ReceiptText, Scale, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  getFinanceSummary,
  listGuidedPaymentRecords,
  listSettlementPayments,
  listStandardPayments,
  type FinanceSummaryRow,
  type GuidedPaymentRecord,
  type SettlementPayment,
  type StandardPayment,
} from '@/admin/lib/adminTransactions';

type TransactionsTab = 'overview' | 'payments' | 'guided' | 'settlements';
type PaymentRow = StandardPayment | GuidedPaymentRecord | SettlementPayment;
type SummaryBucket = { count: number };

const PAGE_SIZE = 20;
const TABS: { id: TransactionsTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'payments', label: 'Standard payments' },
  { id: 'guided', label: 'Guided payments' },
  { id: 'settlements', label: 'Settlements' },
];

const TAB_PATHS: Record<TransactionsTab, string> = {
  overview: '/admin/transactions',
  payments: '/admin/transactions/standard_payments',
  guided: '/admin/transactions/guided_payments',
  settlements: '/admin/transactions/settlements',
};

const STATUS_OPTIONS: Partial<Record<TransactionsTab, string[]>> = {
  payments: ['pending', 'processing', 'completed', 'failed', 'refunded'],
  guided: ['pending', 'completed', 'failed', 'cancelled'],
  settlements: ['pending', 'awaiting_confirmation', 'settled', 'rejected', 'cancelled'],
};

const SOURCE_LABELS: Record<FinanceSummaryRow['source'], string> = {
  standard_payment: 'Standard payments',
  guided_payment_record: 'Guided payment records',
  settlement_payment: 'Settlement payments',
};

const isSupportedFinanceSource = (source: string) => Object.prototype.hasOwnProperty.call(SOURCE_LABELS, source);

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatMoney(value: number | string | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  if (!currency || currency === 'UNKNOWN') return `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (currency not recorded)`;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value));
  } catch {
    return `${currency} ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const normalizedStatus = status || 'unknown';
  const variant = normalizedStatus === 'completed' || normalizedStatus === 'settled'
    ? 'secondary'
    : normalizedStatus === 'failed' || normalizedStatus === 'refunded' || normalizedStatus === 'rejected'
      ? 'destructive'
      : 'outline';
  return <Badge variant={variant} className="whitespace-nowrap capitalize">{normalizedStatus.replace(/_/g, ' ')}</Badge>;
}

function TableFrame({ headers, children, empty, centeredHeaders = [] }: { headers: string[]; children: ReactNode; empty: boolean; centeredHeaders?: string[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>{headers.map((header) => <th key={header} scope="col" className={`px-4 py-3 font-medium ${centeredHeaders.includes(header) ? 'text-center' : ''}`}>{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
      {empty && <div className="px-4 py-12 text-center text-sm text-muted-foreground">No records found for this filter.</div>}
    </div>
  );
}

export default function AdminTransactions() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = TABS.find((item) => TAB_PATHS[item.id] === location.pathname)?.id || 'overview';
  const [summary, setSummary] = useState<FinanceSummaryRow[]>([]);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [status, setStatus] = useState('all');
  const [settlementSearch, setSettlementSearch] = useState('');
  const [appliedSettlementSearch, setAppliedSettlementSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => setAppliedSettlementSearch(settlementSearch.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [settlementSearch]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage('');

    const load = async () => {
      try {
        if (tab === 'overview') {
          const data = await getFinanceSummary();
          if (active) setSummary(data);
          return;
        }

        const result = tab === 'payments'
          ? await listStandardPayments(page, PAGE_SIZE, status)
          : tab === 'guided'
            ? await listGuidedPaymentRecords(page, PAGE_SIZE, status)
              : await listSettlementPayments(page, PAGE_SIZE, status, appliedSettlementSearch);
        if (!active) return;
        setRows(result.rows);
        setTotal(result.total);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Unable to load finance records.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, [tab, status, page, refreshVersion, appliedSettlementSearch]);

  const summaryBySource = useMemo(() => {
    const map = new Map<FinanceSummaryRow['source'], SummaryBucket>();
    summary
      .filter((row) => isSupportedFinanceSource(row.source))
      .forEach((row) => {
      const bucket = map.get(row.source) || { count: 0 };
      bucket.count += Number(row.record_count) || 0;
      map.set(row.source, bucket);
      });
    return map;
  }, [summary]);

  const sourceCurrencyTotals = useMemo(() => {
    const map = new Map<string, { source: FinanceSummaryRow['source']; currency: string; amount: number }>();
    summary
      .filter((row) => isSupportedFinanceSource(row.source))
      .forEach((row) => {
        if (!row.currency) return;
        const key = `${row.source}:${row.currency}`;
        const bucket = map.get(key) || { source: row.source, currency: row.currency, amount: 0 };
        bucket.amount += Number(row.total_amount) || 0;
        map.set(key, bucket);
      });
    return Array.from(map.values()).sort((a, b) => a.source.localeCompare(b.source) || a.currency.localeCompare(b.currency));
  }, [summary]);

  const changeTab = (nextTab: TransactionsTab) => {
    setPage(1);
    setStatus('all');
    navigate(TAB_PATHS[nextTab]);
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasStatusFilter = Boolean(STATUS_OPTIONS[tab]);

  const renderRows = () => {
    if (tab === 'payments') {
      const payments = rows as StandardPayment[];
      return (
        <TableFrame headers={['Payment source', 'Amount', 'Status', 'Method', 'Created']} empty={!loading && payments.length === 0}>
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td className="px-4 py-3">Marketplace payment</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatMoney(payment.amount, payment.currency)}</td>
              <td className="px-4 py-3"><StatusBadge status={payment.status} /></td>
              <td className="px-4 py-3 capitalize">{payment.payment_method || '—'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(payment.created_at)}</td>
            </tr>
          ))}
        </TableFrame>
      );
    }

    if (tab === 'guided') {
      const records = rows as GuidedPaymentRecord[];
      return (
        <TableFrame headers={['Payment source', 'Amount', 'Payment status', 'Paid at', 'Created']} empty={!loading && records.length === 0}>
          {records.map((record) => (
            <tr key={record.id}>
              <td className="px-4 py-3">Guided trip payment</td>
              <td className="px-4 py-3">{formatMoney(record.amount, null)}</td>
              <td className="px-4 py-3"><StatusBadge status={record.payment_status} /></td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(record.paid_at)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(record.created_at)}</td>
            </tr>
          ))}
        </TableFrame>
      );
    }

    if (tab === 'settlements') {
      const settlements = rows as SettlementPayment[];
      return (
        <TableFrame headers={['Settlement trip', 'Amount', 'Status', 'Created', 'Details']} centeredHeaders={['Amount', 'Status', 'Created', 'Details']} empty={!loading && settlements.length === 0}>
          {settlements.map((settlement) => (
            <tr key={settlement.id}>
              <td className="px-4 py-3">{settlement.trip?.title?.trim() || 'Trip name unavailable'}</td>
              <td className="px-4 py-3 text-center whitespace-nowrap">{formatMoney(settlement.amount, settlement.currency)}</td>
              <td className="px-4 py-3 text-center"><StatusBadge status={settlement.status} /></td>
              <td className="px-4 py-3 text-center whitespace-nowrap text-muted-foreground">{formatDate(settlement.created_at)}</td>
              <td className="px-4 py-3 text-center"><Button asChild variant="outline" size="sm"><Link to={`/admin/transactions/settlements/${settlement.id}`}>View</Link></Button></td>
            </tr>
          ))}
        </TableFrame>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <Banknote className="h-4 w-4" /> Finance
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Read-only visibility across payments and both settlement systems.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => setRefreshVersion((version) => version + 1)} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </header>

      <nav aria-label="Finance views" className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => changeTab(item.id)}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${tab === item.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {errorMessage && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{errorMessage}</div>}

      {tab === 'overview' ? (
        <div className="space-y-6">
          {loading ? <div className="py-10 text-center text-sm text-muted-foreground">Loading finance summary…</div> : (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {(['standard_payment', 'guided_payment_record', 'settlement_payment'] as const).map((source) => {
                  const Icon = source === 'standard_payment' ? CreditCard : source === 'guided_payment_record' ? ReceiptText : Scale;
                  const bucket = summaryBySource.get(source) || { count: 0, amount: 0 };
                  return (
                    <Card key={source} className="rounded-lg p-4 shadow-none">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">{SOURCE_LABELS[source]}</span>
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="mt-3 text-2xl font-semibold tabular-nums">{bucket.count.toLocaleString()}</div>
                      <div className="mt-1 text-xs text-muted-foreground">records in this source</div>
                    </Card>
                  );
                })}
              </section>
              <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
                <Card className="rounded-lg p-4 shadow-none sm:p-5">
                  <div className="mb-4">
                    <h2 className="font-semibold">Amounts by source and status</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Amounts remain separated by currency and source; they are not combined into a universal ledger.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[460px] text-left text-sm">
                      <thead className="border-b text-xs uppercase text-muted-foreground"><tr><th className="py-2 pr-3 font-medium">Source</th><th className="py-2 pr-3 font-medium">Currency</th><th className="py-2 pr-3 font-medium">Status</th><th className="py-2 text-right font-medium">Records</th><th className="py-2 text-right font-medium">Amount</th></tr></thead>
                      <tbody className="divide-y divide-border">
                        {summary.filter((row) => isSupportedFinanceSource(row.source)).map((row) => (
                          <tr key={`${row.source}-${row.currency}-${row.status}`}>
                            <td className="py-2.5 pr-3">{SOURCE_LABELS[row.source]}</td>
                            <td className="py-2.5 pr-3">{row.currency || 'Not recorded'}</td>
                            <td className="py-2.5 pr-3"><StatusBadge status={row.status} /></td>
                            <td className="py-2.5 text-right tabular-nums">{Number(row.record_count).toLocaleString()}</td>
                            <td className="py-2.5 text-right tabular-nums">{formatMoney(row.total_amount, row.currency)}</td>
                          </tr>
                        ))}
                        {summary.every((row) => !isSupportedFinanceSource(row.source)) && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No finance records found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <Card className="rounded-lg p-4 shadow-none sm:p-5">
                  <h2 className="font-semibold">Stored amounts by source</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Grouped by source and recorded currency; no cross-source rollup.</p>
                  <div className="mt-4 divide-y divide-border">
                    {sourceCurrencyTotals.map(({ source, currency, amount }) => (
                      <div key={`${source}-${currency}`} className="flex items-center justify-between gap-4 py-3 text-sm">
                        <span className="min-w-0"><span className="block truncate font-medium">{SOURCE_LABELS[source]}</span><span className="text-xs text-muted-foreground">{currency}</span></span>
                        <span className="shrink-0 tabular-nums">{formatMoney(amount, currency)}</span>
                      </div>
                    ))}
                    {summary.some((row) => row.source === 'guided_payment_record') && (
                      <div className="py-3 text-sm text-muted-foreground">Guided payment records do not store a currency. Their amounts are shown in the Guided payments table and excluded from currency totals.</div>
                    )}
                    {sourceCurrencyTotals.length === 0 && <div className="py-6 text-sm text-muted-foreground">No currency-denominated records.</div>}
                  </div>
                </Card>
              </section>
            </>
          )}
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{total.toLocaleString()} records</span>
                {tab === 'guided' && <span className="hidden sm:inline">· Currency is not stored in this source table</span>}
              </div>
              {tab === 'settlements' && (
                <label className="relative block w-full sm:w-72">
                  <span className="sr-only">Search settlements by trip name</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={settlementSearch}
                    onChange={(event) => {
                      setSettlementSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by trip name"
                    className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </label>
              )}
            </div>
            {hasStatusFilter && (
              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Status</span>
                <select
                  value={status}
                  onChange={(event) => { setStatus(event.target.value); setPage(1); }}
                  className="h-9 min-w-48 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All statuses</option>
                  {(STATUS_OPTIONS[tab] || []).map((option) => <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>)}
                </select>
              </label>
            )}
          </div>
          {loading ? <div className="rounded-lg border bg-background py-12 text-center text-sm text-muted-foreground">Loading records…</div> : renderRows()}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Page {page} of {pageCount}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount || loading}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}