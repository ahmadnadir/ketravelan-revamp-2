import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getSettlementDetail, type SettlementPaymentDetail } from '@/admin/lib/adminTransactions';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatMoney(value: number, currency: string | null | undefined) {
  if (!currency) {
    return `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (currency not recorded)`;
  }
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value));
  } catch {
    return `${currency} ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 py-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={`mt-1 break-words text-sm ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}

export default function AdminTransactionDetail() {
  const { settlementId = '' } = useParams();
  const [settlement, setSettlement] = useState<SettlementPaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage('');
    void getSettlementDetail(settlementId)
      .then((data) => { if (active) setSettlement(data); })
      .catch((error: unknown) => {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Unable to load settlement.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [settlementId]);

  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading settlement details…</div>;
  if (errorMessage || !settlement) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm"><Link to="/admin/transactions/settlements"><ArrowLeft className="mr-2 h-4 w-4" />Settlements</Link></Button>
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{errorMessage || 'Settlement not found.'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2"><Link to="/admin/transactions/settlements"><ArrowLeft className="mr-2 h-4 w-4" />Settlements</Link></Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Settlement payment</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settlement detail</h1>
          </div>
          <Badge variant={settlement.status === 'settled' ? 'secondary' : settlement.status === 'rejected' ? 'destructive' : 'outline'} className="w-fit capitalize">{settlement.status.replace(/_/g, ' ')}</Badge>
        </div>
      </header>

      <Card className="rounded-lg px-4 shadow-none sm:px-6">
        <dl className="grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:gap-x-8 lg:grid-cols-3">
          <DetailField label="Amount" value={formatMoney(settlement.amount, settlement.currency)} />
          <DetailField label="Currency" value={settlement.currency} />
          <DetailField label="Created" value={formatDate(settlement.created_at)} />
          <DetailField label="Trip" value={settlement.trip_name} />
          <DetailField label="Payer" value={settlement.payer_name} />
          <DetailField label="Recipient" value={settlement.recipient_name} />
          <DetailField label="Confirmed" value={formatDate(settlement.confirmed_at)} />
          <DetailField label="Rejected" value={formatDate(settlement.rejected_at)} />
          {settlement.rejection_reason && <DetailField label="Rejection reason" value={settlement.rejection_reason} />}
        </dl>
      </Card>

      <Card className="rounded-lg p-4 shadow-none sm:p-5">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div><h2 className="font-semibold">Expense allocations</h2><p className="mt-1 text-xs text-muted-foreground">Amounts applied to expense participants by the existing settlement architecture.</p></div>
          <span className="text-xs text-muted-foreground">{settlement.allocations.length} records</span>
        </div>
        {settlement.allocations.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No allocation records.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground"><tr><th className="py-2 pr-4 font-medium">Expense</th><th className="py-2 pr-4 font-medium">Participant</th><th className="py-2 pr-4 text-right font-medium">Share</th><th className="py-2 pr-4 text-right font-medium">Applied</th><th className="py-2 text-right font-medium">Expense date</th></tr></thead>
              <tbody className="divide-y divide-border">
                {settlement.allocations.map((allocation, index) => (
                  <tr key={`${allocation.expense_title}-${allocation.participant_name}-${index}`}>
                    <td className="py-3 pr-4"><span className="block font-medium">{allocation.expense_title}</span><span className="text-xs text-muted-foreground">{allocation.expense_category}</span></td>
                    <td className="py-3 pr-4">{allocation.participant_name}</td>
                    <td className="py-3 pr-4 text-right"><span className="block tabular-nums">{formatMoney(allocation.participant_share, allocation.expense_currency)}</span><Badge variant={allocation.participant_paid ? 'secondary' : 'outline'} className="mt-1 capitalize">{allocation.participant_paid ? 'paid' : 'outstanding'}</Badge></td>
                    <td className="py-3 pr-4 text-right tabular-nums">{formatMoney(allocation.amount_applied, settlement.currency)}</td>
                    <td className="py-3 text-right text-muted-foreground">{formatDate(allocation.expense_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="rounded-lg p-4 shadow-none sm:p-5">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div><h2 className="font-semibold">Receipts</h2><p className="mt-1 text-xs text-muted-foreground">Existing receipt records; this screen does not approve or reject them.</p></div>
          <span className="text-xs text-muted-foreground">{settlement.receipts.length} records</span>
        </div>
        {settlement.receipts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No receipt records.</p>
        ) : (
          <div className="space-y-3">
            {settlement.receipts.map((receipt, index) => (
              <article key={`${receipt.created_at}-${index}`} className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><Badge variant={receipt.status === 'approved' ? 'secondary' : receipt.status === 'rejected' ? 'destructive' : 'outline'} className="capitalize">{receipt.status}</Badge></div>
                  <p className="mt-2 text-sm">{receipt.description || 'No description'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Submitted by {receipt.uploaded_by_name} · {formatDate(receipt.created_at)}</p>
                  {receipt.rejection_reason && <p className="mt-1 text-xs text-destructive">{receipt.rejection_reason}</p>}
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <a href={receipt.receipt_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open receipt</a>
                </Button>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}