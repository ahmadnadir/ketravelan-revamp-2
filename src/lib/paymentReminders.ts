import { supabase } from './supabase';

export interface SendPaymentReminderParams {
  expenseId: string;
  memberId?: string; // Send to specific member
  remindAll?: boolean; // Send to all unpaid members
}

export interface PaymentReminderResponse {
  message: string;
  sent: number;
  total: number;
  results: Array<{
    memberId: string;
    email: string;
    status: 'sent' | 'failed';
    error?: string;
  }>;
}

/**
 * Send payment reminder email(s) for an expense
 * @param params - Parameters for sending reminder
 * @returns Response with send results
 */
export async function sendPaymentReminder(
  params: SendPaymentReminderParams
): Promise<PaymentReminderResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('send-payment-reminder', {
      body: params,
    });

    if (error) {
      console.error('Error sending payment reminder:', error);
      throw new Error(error.message || 'Failed to send payment reminder');
    }

    return data;
  } catch (error) {
    console.error('Exception in sendPaymentReminder:', error);
    throw error;
  }
}

/**
 * Send payment reminder to a specific member
 */
export async function sendPaymentReminderToMember(
  expenseId: string,
  memberId: string
): Promise<PaymentReminderResponse> {
  return sendPaymentReminder({ expenseId, memberId });
}

/**
 * Send payment reminders to all unpaid members
 */
export async function sendPaymentReminderToAll(
  expenseId: string
): Promise<PaymentReminderResponse> {
  return sendPaymentReminder({ expenseId, remindAll: true });
}
