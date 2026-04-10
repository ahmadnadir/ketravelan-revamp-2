import { supabase } from '../lib/supabase';

export interface InitiatePaymentInput {
  bookingId: string;
  paymentScheduleId: string;
  amount: number;
  customerEmail: string;
  customerName: string;
  bookingReference: string;
}

export interface PaymentInitiationResult {
  success: boolean;
  paymentIntentId?: string;
  redirectUrl?: string;
  error?: string;
}

export interface PaymentConfirmationInput {
  paymentIntentId: string;
  bookingId: string;
  paymentScheduleId: string;
  transactionReference: string;
}

export interface PaymentConfirmationResult {
  success: boolean;
  error?: string;
}

export async function initiatePayment(
  input: InitiatePaymentInput
): Promise<PaymentInitiationResult> {
  try {
    const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const { error: paymentRecordError } = await supabase
      .from('guided_payment_records')
      .insert({
        booking_id: input.bookingId,
        payment_schedule_id: input.paymentScheduleId,
        amount: input.amount,
        payment_intent_id: paymentIntentId,
        payment_status: 'pending',
      });

    if (paymentRecordError) {
      return {
        success: false,
        error: `Failed to create payment record: ${paymentRecordError.message}`,
      };
    }

    const redirectUrl = `${window.location.origin}/payment-gateway?payment_intent=${paymentIntentId}&booking_reference=${input.bookingReference}`;

    return {
      success: true,
      paymentIntentId,
      redirectUrl,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

export async function confirmPayment(
  input: PaymentConfirmationInput
): Promise<PaymentConfirmationResult> {
  try {
    const { data: updatedRecords, error: recordError } = await supabase
      .from('guided_payment_records')
      .update({
        payment_status: 'completed',
        transaction_reference: input.transactionReference,
        paid_at: new Date().toISOString(),
      })
      .eq('payment_intent_id', input.paymentIntentId)
      .select('id')
      .limit(1);

    if (recordError) {
      return {
        success: false,
        error: `Failed to update payment record: ${recordError.message}`,
      };
    }

    if (!updatedRecords || updatedRecords.length === 0) {
      return {
        success: false,
        error: 'Payment record was not updated. Please retry payment confirmation.',
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function handlePaymentFailure(
  paymentIntentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('guided_payment_records')
      .update({
        payment_status: 'failed',
      })
      .eq('payment_intent_id', paymentIntentId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function handlePaymentCancellation(
  paymentIntentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('guided_payment_records')
      .update({
        payment_status: 'cancelled',
      })
      .eq('payment_intent_id', paymentIntentId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function getPaymentRecord(paymentIntentId: string) {
  const { data, error } = await supabase
    .from('guided_payment_records')
    .select('*')
    .eq('payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}
