import { supabase } from '@/lib/supabase';

const SESSION_STORAGE_KEY = 'ketravelan_analytics_session_id';
let fallbackSessionId: string | null = null;

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getSessionId() {
  try {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) return stored;
    const sessionId = createSessionId();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    return sessionId;
  } catch {
    fallbackSessionId ??= createSessionId();
    return fallbackSessionId;
  }
}

async function recordAnalyticsEvent(eventName: string, eventCategory: string, eventData: Record<string, unknown>) {
  try {
    const [{ data: authData }, sessionId] = await Promise.all([
      supabase.auth.getSession(),
      Promise.resolve(getSessionId()),
    ]);
    const { error } = await supabase.from('analytics_events').insert({
      user_id: authData.session?.user.id ?? null,
      session_id: sessionId,
      event_name: eventName,
      event_category: eventCategory,
      event_data: eventData,
      page_url: window.location.href,
      referrer_url: document.referrer || null,
      user_agent: navigator.userAgent,
    });
    if (error) console.warn(`[Analytics] Could not record ${eventName}:`, error.message);
  } catch (error) {
    console.warn(`[Analytics] Could not record ${eventName}:`, error);
  }
}

export function recordTripShare(tripId: string, method: string) {
  return recordAnalyticsEvent('trip_share', 'trip', { trip_id: tripId, method });
}

export function recordTripView(tripId: string) {
  return recordAnalyticsEvent('trip_view', 'trip', { trip_id: tripId });
}

export function recordTripJoinRequest(tripId: string) {
  return recordAnalyticsEvent('trip_join_request', 'trip', { trip_id: tripId });
}

export function recordMessageSent(conversationId: string, messageId: string) {
  return recordAnalyticsEvent('message_sent', 'engagement', {
    conversation_id: conversationId,
    message_id: messageId,
  });
}

export function recordSessionDuration(durationSeconds: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return Promise.resolve();
  return recordAnalyticsEvent('session_duration', 'engagement', { duration_seconds: Math.floor(durationSeconds) });
}