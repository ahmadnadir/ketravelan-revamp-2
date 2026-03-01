import { supabase } from './supabase';

export interface SendSettlementReminderParams {
  tripId: string;
  payerId: string;
  recipientId: string;
  amount: number;
  currency: string;
  message: string;
  channels?: string[];
}

export interface SettlementReminderResponse {
  ok: boolean;
  results?: Record<string, { status: string; [key: string]: unknown }>;
}

export async function sendSettlementReminder(
  params: SendSettlementReminderParams
): Promise<SettlementReminderResponse> {
  const { data, error } = await supabase.functions.invoke('send-settlement-reminder', {
    body: params,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send settlement reminder');
  }

  return data as SettlementReminderResponse;
}
