import { supabase } from '@/lib/supabase';

export type FinanceSource = 'standard_payment' | 'guided_payment_record' | 'settlement_payment';

export interface FinanceSummaryRow {
  source: FinanceSource;
  currency: string | null;
  status: string | null;
  record_count: number;
  total_amount: number;
}

export interface StandardPayment {
  id: string;
  booking_id: string | null;
  trip_id: string;
  user_id: string;
  agent_id: string | null;
  amount: number;
  currency: string | null;
  status: string | null;
  payment_method: string | null;
  created_at: string | null;
}

export interface GuidedPaymentRecord {
  id: string;
  booking_id: string;
  payment_schedule_id: string | null;
  amount: number;
  payment_intent_id: string;
  payment_status: string;
  transaction_reference: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementPayment {
  id: string;
  trip_id: string;
  trip: { title: string | null } | null;
  payer_id: string;
  recipient_id: string;
  amount: number;
  currency: string;
  status: string;
  confirmed_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface SettlementPaymentDetail {
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  trip_name: string;
  payer_name: string;
  recipient_name: string;
  allocations: Array<{
    expense_title: string;
    expense_category: string;
    expense_date: string;
    expense_currency: string | null;
    amount_applied: number;
    participant_name: string;
    participant_share: number;
    participant_paid: boolean;
  }>;
  receipts: Array<{
    receipt_url: string;
    description: string | null;
    status: string;
    reviewed_at: string | null;
    rejection_reason: string | null;
    created_at: string;
    uploaded_by_name: string;
  }>;
}

export interface FinancePage<T> {
  rows: T[];
  total: number;
}

const PAGE_SIZE_MAX = 100;

function pageRange(page: number, pageSize: number) {
  const safeSize = Math.min(Math.max(1, pageSize), PAGE_SIZE_MAX);
  const safePage = Math.max(1, page);
  return { from: (safePage - 1) * safeSize, to: safePage * safeSize - 1 };
}

function requireData<T>(data: T[] | null, error: { message: string } | null, count: number | null): FinancePage<T> {
  if (error) throw new Error(error.message);
  return { rows: data || [], total: count || 0 };
}

export async function getFinanceSummary(): Promise<FinanceSummaryRow[]> {
  const { data, error } = await supabase.rpc('admin_finance_summary');
  if (error) throw new Error(error.message);
  return (data || []) as FinanceSummaryRow[];
}

export async function listStandardPayments(page: number, pageSize: number, status: string) {
  const { from, to } = pageRange(page, pageSize);
  let query = supabase
    .from('payments')
    .select('id,booking_id,trip_id,user_id,agent_id,amount,currency,status,payment_method,created_at', { count: 'exact' });
  if (status !== 'all') query = query.eq('status', status);
  const result = await query.order('created_at', { ascending: false }).range(from, to);
  return requireData(result.data as StandardPayment[] | null, result.error, result.count);
}

export async function listGuidedPaymentRecords(page: number, pageSize: number, status: string) {
  const { from, to } = pageRange(page, pageSize);
  let query = supabase
    .from('guided_payment_records')
    .select('id,booking_id,payment_schedule_id,amount,payment_intent_id,payment_status,transaction_reference,paid_at,created_at,updated_at', { count: 'exact' });
  if (status !== 'all') query = query.eq('payment_status', status);
  const result = await query.order('created_at', { ascending: false }).range(from, to);
  return requireData(result.data as GuidedPaymentRecord[] | null, result.error, result.count);
}

export async function listSettlementPayments(page: number, pageSize: number, status: string, search = '') {
  const { from, to } = pageRange(page, pageSize);
  let query = supabase
    .from('settlement_payments')
    .select('id,trip_id,trip:trips!inner(title),payer_id,recipient_id,amount,currency,status,confirmed_at,rejected_at,rejection_reason,created_at', { count: 'exact' });
  if (status !== 'all') query = query.eq('status', status);
  const normalizedSearch = search.trim();
  if (normalizedSearch) query = query.ilike('trip.title', `%${normalizedSearch}%`);
  const result = await query.order('created_at', { ascending: false }).range(from, to);
  return requireData(result.data as SettlementPayment[] | null, result.error, result.count);
}

export async function getSettlementDetail(settlementId: string) {
  const { data, error } = await supabase.rpc('admin_settlement_detail', {
    p_settlement_id: settlementId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Settlement not found or you do not have permission to view it.');
  return data as unknown as SettlementPaymentDetail;
}