import { supabase } from '@/lib/supabase';
import { blockUser } from '@/lib/blockUser';

export type ReportReasonValue =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'inappropriate'
  | 'scam_or_fraud'
  | 'violence'
  | 'other';

export type ReportType = 'TRIP' | 'STORY' | 'DISCUSSION' | 'TRIP_CHAT' | 'DIRECT_CHAT' | 'USER';

export interface ReportReasonOption {
  value: ReportReasonValue;
  label: string;
}

export interface SubmitReportInput {
  reportType: ReportType;
  targetId: string;
  reportedUserId: string;
  reason: ReportReasonValue;
  description?: string;
  reportedAt?: string;
}

export interface ModerationReportRecord {
  id: string;
  reportType: string;
  targetId: string;
  reportedUserId: string | null;
  reporterUserId: string;
  reason: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  createdAt: string;
  reportedAt: string;
  reporter?: {
    id: string;
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
  reportedUser?: {
    id: string;
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
}

export const REPORT_REASON_OPTIONS: ReportReasonOption[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate_speech', label: 'Hate Speech' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'scam_or_fraud', label: 'Scam or Fraud' },
  { value: 'violence', label: 'Violence' },
  { value: 'other', label: 'Other' },
];

const REPORT_TYPE_MAP: Record<ReportType, string> = {
  TRIP: 'trip',
  STORY: 'story',
  DISCUSSION: 'discussion',
  TRIP_CHAT: 'trip_chat_message',
  DIRECT_CHAT: 'direct_chat_message',
  USER: 'user_profile',
};

function isMissingColumn(error: unknown, column: string): boolean {
  const candidate = error as { code?: string; message?: string } | null;
  return (
    candidate?.code === 'PGRST204' &&
    typeof candidate.message === 'string' &&
    candidate.message.includes(`'${column}' column`)
  );
}

function mapModerationReport(row: any): ModerationReportRecord {
  return {
    id: row.id,
    reportType: String(row.content_type || '').toUpperCase(),
    targetId: row.content_id,
    reportedUserId: row.reported_user_id,
    reporterUserId: row.reporter_id,
    reason: row.reason,
    description: row.description || row.details || '',
    status: row.status,
    createdAt: row.created_at,
    reportedAt: row.reported_at || row.created_at,
    reporter: Array.isArray(row.reporter) ? row.reporter[0] : row.reporter,
    reportedUser: Array.isArray(row.reported_user) ? row.reported_user[0] : row.reported_user,
  };
}

export async function submitReport(input: SubmitReportInput): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const payload = {
    content_type: REPORT_TYPE_MAP[input.reportType],
    content_id: input.targetId,
    reported_user_id: input.reportedUserId || null,
    reporter_id: user.id,
    reason: input.reason,
    description: input.description || '',
    details: input.description || '',
    reported_at: input.reportedAt || new Date().toISOString(),
    status: 'open',
  };

  const { error } = await supabase.from('reports').insert(payload);

  if (!error) return;
  const missingDescription = isMissingColumn(error, 'description');
  const missingReportedAt = isMissingColumn(error, 'reported_at');
  if (!missingDescription && !missingReportedAt) throw error;

  // Backward-compatible fallback while DB schema/cache doesn't include newer columns yet.
  const { error: fallbackError } = await supabase.from('reports').insert({
    content_type: payload.content_type,
    content_id: payload.content_id,
    reported_user_id: payload.reported_user_id,
    reporter_id: payload.reporter_id,
    reason: payload.reason,
    details: payload.details,
    status: payload.status,
  });

  if (fallbackError) throw fallbackError;
}

export async function blockUserViaApi(blockedUserId: string): Promise<void> {
  await blockUser(blockedUserId);
}

export async function getBlockedRelationshipUserIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const rpc = await supabase.rpc('get_block_related_user_ids', {
    p_user_id: user.id,
  });

  if (!rpc.error) {
    return (rpc.data || []).map((row: { user_id: string }) => row.user_id).filter(Boolean);
  }

  console.warn('Falling back to one-sided block filtering:', rpc.error);

  const direct = await supabase
    .from('blocked_users')
    .select('blocked_user_id')
    .eq('user_id', user.id);

  if (direct.error) {
    console.error('Unable to load blocked relationships:', direct.error);
    return [];
  }

  return (direct.data || []).map((row: { blocked_user_id: string }) => row.blocked_user_id).filter(Boolean);
}

export async function filterItemsByBlockedRelationship<T>(
  items: T[],
  getUserId: (item: T) => string | null | undefined,
): Promise<T[]> {
  const ids = await getBlockedRelationshipUserIds();
  if (ids.length === 0) return items;

  const blockedSet = new Set(ids);
  return items.filter((item) => {
    const userId = getUserId(item);
    return !userId || !blockedSet.has(userId);
  });
}

export async function fetchModerationReports(): Promise<ModerationReportRecord[]> {
  const queryWithDescription = await supabase
    .from('reports')
    .select(`
      id,
      content_type,
      content_id,
      reported_user_id,
      reporter_id,
      reason,
      description,
      details,
      status,
      created_at,
      reported_at,
      reporter:profiles!reports_reporter_id_fkey(id, full_name, username, avatar_url),
      reported_user:profiles!reports_reported_user_id_fkey(id, full_name, username, avatar_url)
    `)
    .order('created_at', { ascending: false });

  if (!queryWithDescription.error) {
    return (queryWithDescription.data || []).map(mapModerationReport);
  }

  const missingDescription = isMissingColumn(queryWithDescription.error, 'description');
  const missingReportedAt = isMissingColumn(queryWithDescription.error, 'reported_at');
  if (!missingDescription && !missingReportedAt) {
    throw queryWithDescription.error;
  }

  const fallbackQuery = await supabase
    .from('reports')
    .select(`
      id,
      content_type,
      content_id,
      reported_user_id,
      reporter_id,
      reason,
      details,
      status,
      created_at,
      reporter:profiles!reports_reporter_id_fkey(id, full_name, username, avatar_url),
      reported_user:profiles!reports_reported_user_id_fkey(id, full_name, username, avatar_url)
    `)
    .order('created_at', { ascending: false });

  if (fallbackQuery.error) throw fallbackQuery.error;

  return (fallbackQuery.data || []).map(mapModerationReport);
}

export async function updateModerationReportStatus(
  reportId: string,
  status: ModerationReportRecord['status'],
  resolutionNotes?: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const updates: Record<string, unknown> = {
    status,
  };

  if (status === 'resolved' || status === 'dismissed') {
    updates.resolution_notes = resolutionNotes || null;
    updates.resolved_by = user.id;
    updates.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('reports')
    .update(updates)
    .eq('id', reportId);

  if (error) throw error;
}