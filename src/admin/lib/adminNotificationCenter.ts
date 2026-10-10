import { supabase } from '@/lib/supabase';

export type NotificationChannel = 'in_app' | 'push' | 'email';
export const NOTIFICATION_CHANNELS: NotificationChannel[] = ['in_app', 'push', 'email'];

export async function centerAction<T = Record<string, unknown>>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-notification-center', { body: { action, ...payload } });
  if (error) throw error;
  if (data?.error) {
    const providerError = data.error as { message?: unknown; name?: unknown } | string;
    throw new Error(typeof providerError === 'string' ? providerError : String(providerError.message ?? providerError.name ?? 'Request failed'));
  }
  return data as T;
}

export async function resendAction<T = Record<string, unknown>>(operation: string, payload: Record<string, unknown> = {}): Promise<T> {
  return centerAction<T>('resend', { operation, payload });
}

export function splitIds(value: string) {
  return [...new Set(value.split(/[\s,]+/).map((part) => part.trim()).filter(Boolean))];
}
