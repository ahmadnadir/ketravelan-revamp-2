import { supabase } from '@/lib/supabase';

export const MODERATION_STATUSES = ['open', 'under_review', 'resolved', 'dismissed'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const MODERATION_CONTENT_TYPES = [
  'story', 'story_comment', 'discussion', 'discussion_reply',
  'trip', 'trip_chat_message', 'direct_chat_message', 'user_profile',
] as const;
export type ModerationContentType = (typeof MODERATION_CONTENT_TYPES)[number];

export type ModerationActionType =
  | 'hide' | 'unhide' | 'delete' | 'restore' | 'lock' | 'unlock'
  | 'report_under_review' | 'report_resolved' | 'report_dismissed';

export interface ModerationReport {
  id: string;
  reporter_id: string;
  reporter_name: string | null;
  reporter_username: string | null;
  reporter_avatar: string | null;
  reported_user_id: string | null;
  reported_user_name: string | null;
  reported_user_username: string | null;
  reported_user_avatar: string | null;
  reported_user_status: 'active' | 'suspended' | 'deleted' | null;
  content_type: ModerationContentType;
  content_id: string;
  reason: string;
  details: string | null;
  description: string | null;
  status: ModerationStatus;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  reported_at: string;
}

export interface ModerationAction {
  id: string;
  moderator_id: string;
  moderator_name: string | null;
  moderator_username: string | null;
  content_type: ModerationContentType;
  content_id: string;
  action_type: ModerationActionType;
  reason: string | null;
  report_id: string | null;
  created_at: string;
}

export interface ModerationReportDetail extends ModerationReport {
  content: Record<string, unknown> | null;
  actions: ModerationAction[];
}

export async function listModerationReports(params: {
  search: string;
  status: ModerationStatus | 'all';
  contentType: ModerationContentType | 'all';
  limit: number;
  offset: number;
}): Promise<ModerationReport[]> {
  const { data, error } = await supabase.rpc('admin_list_moderation_reports', {
    p_search: params.search.trim() || null,
    p_status: params.status,
    p_content_type: params.contentType,
    p_limit: params.limit,
    p_offset: params.offset,
  });
  if (error) throw error;
  return (data ?? []) as ModerationReport[];
}

export async function countModerationReports(params: {
  search: string;
  status: ModerationStatus | 'all';
  contentType: ModerationContentType | 'all';
}): Promise<number> {
  const { data, error } = await supabase.rpc('admin_count_moderation_reports', {
    p_search: params.search.trim() || null,
    p_status: params.status,
    p_content_type: params.contentType,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function getModerationReport(reportId: string): Promise<ModerationReportDetail | null> {
  const { data, error } = await supabase.rpc('admin_get_moderation_report', { p_report_id: reportId });
  if (error) throw error;
  return (data as ModerationReportDetail | null) ?? null;
}

export async function transitionModerationReport(
  reportId: string,
  status: Exclude<ModerationStatus, 'open'>,
  resolutionNotes: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_transition_moderation_report', {
    p_report_id: reportId,
    p_status: status,
    p_resolution_notes: resolutionNotes.trim() || null,
  });
  if (error) throw error;
}

export async function executeModerationAction(params: {
  reportId: string;
  contentType: ModerationContentType;
  contentId: string;
  actionType: 'hide' | 'unhide' | 'delete' | 'restore' | 'lock' | 'unlock';
  reason: string;
}): Promise<void> {
  const { error } = await supabase.rpc('admin_execute_moderation_action', {
    p_report_id: params.reportId,
    p_content_type: params.contentType,
    p_content_id: params.contentId,
    p_action_type: params.actionType,
    p_reason: params.reason.trim(),
  });
  if (error) throw error;
}
