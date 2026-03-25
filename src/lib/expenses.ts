/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';

export interface CreateExpenseData {
  trip_id: string;
  description: string;
  amount: number;
  currency?: string;
  category: string;
  expense_date: string;
  receipt_url?: string;
  notes?: string;
  payer_id?: string; // Who paid the expense upfront
  receipt_file?: File; // Optional receipt file to upload
  // Multi-currency fields
  original_currency?: string;
  fx_rate_to_home?: number;
  converted_amount_home?: number;
  home_currency?: string;
  participants: Array<{
    user_id: string;
    amount_owed: number;
  }>;
}

export interface UpdateExpenseData {
  description?: string;
  amount?: number;
  category?: string;
  expense_date?: string;
  notes?: string;
}

export async function fetchTripExpenses(tripId: string) {
  const { data, error } = await supabase
    .from('trip_expenses')
    .select(`
      *,
      expense_participants(
        id,
        user_id,
        amount_owed,
        is_paid,
        paid_at
      ),
      expense_payments(
        user_id,
        amount_paid
      ),
      expense_receipts(
        id,
        participant_id,
        receipt_url,
        description,
        status,
        created_at
      )
    `)
    .eq('trip_id', tripId)
    .eq('is_deleted', false)
    .order('expense_date', { ascending: false });

  if (error) throw error;

  // Fetch creator and participant profiles separately since they reference auth.users
  if (data && data.length > 0) {
    // Get all unique user IDs (creators + participants + payers)
    const creatorIds = [...new Set(data.map(expense => expense.created_by))];
    const participantIds = [...new Set(
      data.flatMap(expense => 
        expense.expense_participants?.map((p: any) => p.user_id) || []
      )
    )];
    const payerIds = [...new Set(
      data.flatMap(expense => 
        expense.expense_payments?.map((p: any) => p.user_id) || []
      )
    )];
    const allUserIds = [...new Set([...creatorIds, ...participantIds, ...payerIds])];

    // Fetch all profiles at once
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', allUserIds);

    // Map profiles to expenses
    const enrichedData = data.map(expense => ({
      ...expense,
      creator: profiles?.find(p => p.id === expense.created_by) || null,
      expense_participants: expense.expense_participants?.map((participant: any) => ({
        ...participant,
        user: profiles?.find(p => p.id === participant.user_id) || null
      })) || [],
      expense_payments: expense.expense_payments?.map((payment: any) => ({
        ...payment,
        user: profiles?.find(p => p.id === payment.user_id) || null
      })) || [],
      expense_receipts: expense.expense_receipts || []
    }));

    return enrichedData;
  }

  return data;
}

export async function createExpense(expenseData: CreateExpenseData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { participants, payer_id, receipt_file, ...expenseInfo } = expenseData;
  const payerId = payer_id || user.id; // Default to current user if not specified

  // 1. Upload receipt to storage if provided
  let receiptUrl = expenseInfo.receipt_url;
  if (receipt_file) {
    try {
      const fileExt = receipt_file.name.split('.').pop();
      const fileName = `${Date.now()}-${user.id}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(filePath, receipt_file);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('expense-receipts')
          .getPublicUrl(filePath);
        receiptUrl = publicUrl;
      }
    } catch (error) {
      console.error('Receipt upload failed:', error);
      // Continue creating expense even if receipt upload fails
    }
  }

  // 2. Create expense record
  const { data: expense, error: expenseError } = await supabase
    .from('trip_expenses')
    .insert({
      ...expenseInfo,
      receipt_url: receiptUrl,
      created_by: user.id,
      // Include multi-currency fields
      original_currency: expenseData.original_currency,
      fx_rate_to_home: expenseData.fx_rate_to_home,
      converted_amount_home: expenseData.converted_amount_home,
      home_currency: expenseData.home_currency
    })
    .select()
    .single();

  if (expenseError) throw expenseError;

  // 3. Create expense_payments record (who paid upfront)
  const { error: paymentError } = await supabase
    .from('expense_payments')
    .insert({
      expense_id: expense.id,
      user_id: payerId,
      amount_paid: expenseData.amount
    });

  if (paymentError) throw paymentError;

  // 4. Create expense_participants with auto-paid logic
  if (participants.length > 0) {
    const { error: participantsError } = await supabase
      .from('expense_participants')
      .insert(
        participants.map(p => ({
          expense_id: expense.id,
          user_id: p.user_id,
          amount_owed: p.amount_owed,
          // Auto-mark as paid if participant is also the payer
          is_paid: p.user_id === payerId,
          paid_at: p.user_id === payerId ? new Date().toISOString() : null
        }))
      );

    if (participantsError) throw participantsError;
  }

  return expense;
}

export async function updateExpense(expenseId: string, updates: UpdateExpenseData) {
  const { data, error } = await supabase
    .from('trip_expenses')
    .update(updates)
    .eq('id', expenseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExpense(expenseId: string) {
  const { error } = await supabase
    .from('trip_expenses')
    .update({ is_deleted: true })
    .eq('id', expenseId);

  if (error) throw error;
}

export async function markExpensePaid(expenseId: string, participantUserId: string) {
  const { error } = await supabase
    .from('expense_participants')
    .update({
      is_paid: true,
      paid_at: new Date().toISOString()
    })
    .eq('expense_id', expenseId)
    .eq('user_id', participantUserId);

  if (error) throw error;
}

export async function uploadReceipt(expenseId: string, participantId: string, file: File, description?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const fileExt = file.name.split('.').pop();
  const fileName = `${expenseId}-${participantId}-${Date.now()}.${fileExt}`;
  const filePath = `receipts/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('expense-receipts')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('expense-receipts')
    .getPublicUrl(filePath);

  const { data, error } = await supabase
    .from('expense_receipts')
    .insert({
      expense_id: expenseId,
      participant_id: participantId,
      uploaded_by: user.id,
      receipt_url: publicUrl,
      description: description || null,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function approveReceipt(receiptId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('expense_receipts')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', receiptId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function rejectReceipt(receiptId: string, reason: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('expense_receipts')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason
    })
    .eq('id', receiptId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createSettlement(tripId: string, payerId: string, payeeId: string, amount: number, description?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('balance_settlements')
    .insert({
      trip_id: tripId,
      payer_id: payerId,
      payee_id: payeeId,
      amount,
      description,
      created_by: user.id
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchTripSettlements(tripId: string) {
  const { data, error } = await supabase
    .from('balance_settlements')
    .select(`
      *,
      payer:profiles!balance_settlements_payer_id_fkey(id, username, full_name, avatar_url),
      payee:profiles!balance_settlements_payee_id_fkey(id, username, full_name, avatar_url)
    `)
    .eq('trip_id', tripId)
    .order('settlement_date', { ascending: false });

  if (error) throw error;
  return data;
}

// New comprehensive balance calculation using database function
export async function calculateTripBalances(tripId: string) {
  const { data, error } = await supabase.rpc('calculate_trip_expense_balances', {
    p_trip_id: tripId
  });

  if (error) throw error;
  return data;
}

// Get simplified debt relationships (who owes who)
export async function getWhoOwesWho(tripId: string) {
  const { data, error } = await supabase.rpc('get_who_owes_who', {
    p_trip_id: tripId
  });

  if (error) throw error;
  return data;
}

// Fetch payment methods for a trip
export async function fetchTripPaymentMethods(tripId: string, userId?: string) {
  const { data, error } = await supabase.rpc('get_trip_payment_methods', {
    p_trip_id: tripId,
    p_user_id: userId || null
  });

  if (error) throw error;
  return data;
}

// Create or update payment method
export async function upsertPaymentMethod(data: {
  trip_id: string;
  name: string;
  description?: string;
  qr_code_url?: string;
  is_default?: boolean;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: paymentMethod, error } = await supabase
    .from('trip_payment_methods')
    .upsert({
      ...data,
      user_id: user.id,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  return paymentMethod;
}

// Upload QR code for payment method
export async function uploadPaymentQR(tripId: string, file: File) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const fileExt = file.name.split('.').pop();
  const fileName = `${tripId}-${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `payment-qr/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('payment-methods')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('payment-methods')
    .getPublicUrl(filePath);

  return publicUrl;
}

// Add expense payments (who paid upfront)
export async function addExpensePayments(expenseId: string, payments: Array<{ user_id: string; amount_paid: number }>) {
  const { error } = await supabase
    .from('expense_payments')
    .insert(
      payments.map(p => ({
        expense_id: expenseId,
        user_id: p.user_id,
        amount_paid: p.amount_paid
      }))
    );

  if (error) throw error;
}

// Fetch receipts for an expense
export async function fetchExpenseReceipts(expenseId: string) {
  const { data, error } = await supabase
    .from('expense_receipts')
    .select(`
      *,
      participant:profiles!participant_id(id, username, full_name, avatar_url),
      uploader:profiles!uploaded_by(id, username, full_name, avatar_url),
      reviewer:profiles!reviewed_by(id, username, full_name, avatar_url)
    `)
    .eq('expense_id', expenseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchPendingReceiptApprovalsForUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: payerExpenses, error: payerError } = await supabase
    .from('expense_payments')
    .select('expense_id')
    .eq('user_id', user.id);

  if (payerError) throw payerError;

  const expenseIds = (payerExpenses || []).map((row: any) => row.expense_id).filter(Boolean);
  if (expenseIds.length === 0) return [];

  const { data: receipts, error: receiptsError } = await supabase
    .from('expense_receipts')
    .select(`
      id,
      expense_id,
      participant_id,
      receipt_url,
      description,
      status,
      created_at,
      expense:trip_expenses(
        id,
        trip_id,
        description,
        amount,
        currency,
        original_currency,
        home_currency,
        converted_amount_home,
        category,
        expense_date,
        trip:trips(id, title, cover_image, start_date, end_date)
      )
    `)
    .in('expense_id', expenseIds)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (receiptsError) throw receiptsError;

  const participantIds = [...new Set((receipts || []).map((row: any) => row.participant_id).filter(Boolean))];
  const { data: participantProfiles, error: participantProfilesError } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', participantIds);

  if (participantProfilesError) throw participantProfilesError;

  const { data: participants, error: participantsError } = await supabase
    .from('expense_participants')
    .select('expense_id, user_id, amount_owed')
    .in('expense_id', expenseIds);

  if (participantsError) throw participantsError;

  const participantShareMap = new Map<string, number>();
  (participants || []).forEach((row: any) => {
    participantShareMap.set(`${row.expense_id}:${row.user_id}`, Number(row.amount_owed || 0));
  });

  return (receipts || []).map((row: any) => ({
    ...row,
    participant_profile: participantProfiles?.find((profile: any) => profile.id === row.participant_id) || null,
    participant_share: participantShareMap.get(`${row.expense_id}:${row.participant_id}`) || 0,
  }));
}

// Legacy method - kept for backward compatibility
export async function calculateBalances(tripId: string) {
  const expenses = await fetchTripExpenses(tripId);
  const settlements = await fetchTripSettlements(tripId);

  const balances: Record<string, Record<string, number>> = {};

  expenses.forEach(expense => {
    const paidBy = expense.created_by;
    expense.expense_participants.forEach((participant: any) => {
      if (participant.user_id !== paidBy) {
        if (!balances[participant.user_id]) {
          balances[participant.user_id] = {};
        }
        balances[participant.user_id][paidBy] =
          (balances[participant.user_id][paidBy] || 0) + Number(participant.amount_owed);
      }
    });
  });

  settlements.forEach((settlement: any) => {
    if (!balances[settlement.payer_id]) {
      balances[settlement.payer_id] = {};
    }
    balances[settlement.payer_id][settlement.payee_id] =
      (balances[settlement.payer_id][settlement.payee_id] || 0) - Number(settlement.amount);
  });

  return balances;
}

// Mark expense participants as paid (NO settlement record needed)
// Settlement records are only for direct cash payments, not expense settlements
export async function markParticipantsAsPaid(
  expenseIds: string[],
  participantId: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Mark all participants as paid - this automatically updates the balance calculation
  for (const expenseId of expenseIds) {
    const { error: updateError } = await supabase
      .from('expense_participants')
      .update({
        is_paid: true,
        paid_at: new Date().toISOString()
      })
      .eq('expense_id', expenseId)
      .eq('user_id', participantId);

    if (updateError) throw updateError;
  }

  return { success: true };
}

// Fetch all expenses created by the current user
export async function fetchUserExpenses() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('trip_expenses')
    .select(`
      id,
      trip_id,
      created_by,
      description,
      amount,
      currency,
      category,
      expense_date,
      created_at,
      updated_at,
      is_deleted,
      receipt_url,
      notes
    `)
    .eq('created_by', user.id)
    .eq('is_deleted', false)
    .order('expense_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Fetch all expenses for a specific trip grouped by trip
export async function fetchUserTripExpenses(tripId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('trip_expenses')
    .select(`
      id,
      trip_id,
      created_by,
      description,
      amount,
      currency,
      category,
      expense_date,
      created_at,
      updated_at,
      is_deleted,
      receipt_url,
      notes
    `)
    .eq('trip_id', tripId)
    .eq('created_by', user.id)
    .eq('is_deleted', false)
    .order('expense_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch a lightweight overview of all expenses for the given trips,
 * plus the current user's participant/payment rows so the caller can
 * compute accurate per-currency balances without relying on the
 * `get_who_owes_who` RPC (which sums amounts across currencies).
 */
export async function fetchTripsExpenseOverview(tripIds: string[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. All non-deleted expenses for these trips (no creator filter)
  const { data: expenses, error: expErr } = await supabase
    .from('trip_expenses')
    .select('id, trip_id, currency, amount')
    .in('trip_id', tripIds)
    .eq('is_deleted', false);
  if (expErr) throw expErr;

  const expenseIds = (expenses || []).map((e: any) => e.id);

  if (expenseIds.length === 0) {
    return { expenses: [] as any[], owed: [] as any[], credited: [] as any[] };
  }

  // 2. Rows where the current user is a participant (money they owe)
  const { data: owed, error: owedErr } = await supabase
    .from('expense_participants')
    .select('expense_id, amount_owed, is_paid')
    .eq('user_id', user.id)
    .in('expense_id', expenseIds);
  if (owedErr) throw owedErr;

  // 3. Expenses where the current user is a payer (money others owe them)
  const { data: userPayments, error: payErr } = await supabase
    .from('expense_payments')
    .select('expense_id')
    .eq('user_id', user.id)
    .in('expense_id', expenseIds);
  if (payErr) throw payErr;

  const paidExpenseIds = (userPayments || []).map((p: any) => p.expense_id);
  let credited: any[] = [];
  if (paidExpenseIds.length > 0) {
    const { data: creditData } = await supabase
      .from('expense_participants')
      .select('expense_id, amount_owed, is_paid')
      .neq('user_id', user.id)
      .in('expense_id', paidExpenseIds)
      .eq('is_paid', false);
    credited = creditData || [];
  }

  return { expenses: expenses || [], owed: owed || [], credited };
}

// Fetch expenses for multiple trips grouped by trip
export async function fetchExpensesByTrips(tripIds: string[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('trip_expenses')
    .select(`
      id,
      trip_id,
      created_by,
      description,
      amount,
      currency,
      category,
      expense_date,
      created_at,
      updated_at,
      is_deleted,
      receipt_url,
      notes
    `)
    .in('trip_id', tripIds)
    .eq('created_by', user.id)
    .eq('is_deleted', false)
    .order('expense_date', { ascending: false });

  if (error) throw error;

  // Group by trip_id
  const grouped = new Map<string, any[]>();
  (data || []).forEach((expense) => {
    if (!grouped.has(expense.trip_id)) {
      grouped.set(expense.trip_id, []);
    }
    grouped.get(expense.trip_id)!.push(expense);
  });

  return grouped;
}
