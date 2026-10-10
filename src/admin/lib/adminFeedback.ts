import type { SupabaseClient } from "@supabase/supabase-js";

export const FEEDBACK_REPORT_TYPES = [
  { value: "feedback", label: "Feedback" },
  { value: "feature_request", label: "Feature request" },
  { value: "bug", label: "Bug report" },
] as const;

export const FEEDBACK_STATUSES = [
  { value: "new", label: "New" },
  { value: "triaged", label: "Triaged" },
  { value: "in_progress", label: "In progress" },
  { value: "shipped", label: "Shipped" },
  { value: "wont_do", label: "Won't do" },
  { value: "duplicate", label: "Duplicate" },
] as const;

export const FEEDBACK_AREAS = [
  { value: "explore_public_trips", label: "Explore & public trips" },
  { value: "create_trip", label: "Creating a trip" },
  { value: "join_requests_invites", label: "Join requests & invites" },
  { value: "trip_chat", label: "Trip chat" },
  { value: "expenses_splitting", label: "Expenses & splitting" },
  { value: "settlement_payment", label: "Settlement & payment" },
  { value: "notes", label: "Notes" },
  { value: "community", label: "Community" },
  { value: "profile_account", label: "Profile & account" },
  { value: "notifications_email", label: "Notifications & email" },
  { value: "other", label: "Something else" },
] as const;

export type FeedbackListFilters = {
  search?: string;
  status?: string;
  reportType?: string;
  area?: string;
  severity?: string;
  wantsReply?: boolean | null;
  createdFrom?: string;
  createdTo?: string;
  sentiment?: string;
  hasAttachment?: boolean | null;
  hasLinkedIssue?: boolean | null;
  hasTrip?: boolean | null;
  sort?: string;
  limit?: number;
  offset?: number;
};

export interface FeedbackOverview {
  total_reports: number;
  new_count: number;
  in_progress_count: number;
  resolved_count: number;
  closed_count: number;
  feedback_count: number;
  feature_request_count: number;
  bug_count: number;
  wants_reply_count: number;
  attachment_count: number;
}

export interface FeedbackListRow {
  id: string;
  reference_code: string;
  report_type: string;
  area: string;
  title: string;
  severity: string | null;
  status: string;
  wants_reply: boolean;
  username: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  sentiment: string | null;
  attachment_count: number;
  duplicate_of: string | null;
  trip_id: string | null;
  linked_issue_url: string | null;
}

export interface FeedbackActivity {
  id: string;
  action_type: string;
  action_data: unknown;
  admin_id: string;
  admin_username: string | null;
  admin_name: string | null;
  created_at: string;
}

export interface FeedbackDetail {
  id: string;
  user_id: string;
  reference_code: string;
  report_type: string;
  area: string;
  title: string;
  details: string;
  steps_to_reproduce: string | null;
  frequency: string | null;
  severity: string | null;
  problem_to_solve: string | null;
  current_workaround: string | null;
  sentiment: string | null;
  attachments: string[] | null;
  wants_reply: boolean;
  contact_email: string | null;
  account_email: string | null;
  trip_id: string | null;
  context: unknown;
  status: string;
  duplicate_of: string | null;
  linked_issue_url: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  activity: FeedbackActivity[] | null;
}

export async function feedbackAction(
  supabase: Pick<SupabaseClient, "rpc" | "auth">,
  operation: string,
  payload: Record<string, unknown> = {},
): Promise<unknown> {
  if (operation === "attachment-url" || operation === "reply-preview" || operation === "reply") {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(sessionError.message);
    let session = sessionData.session;
    if (!session) throw new Error("Your session is missing. Sign in again and retry.");

    if (!session.expires_at || session.expires_at <= Math.floor(Date.now() / 1000) + 60) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshed.session) {
        throw new Error(refreshError?.message || "Your session expired. Sign in again and retry.");
      }
      session = refreshed.session;
    }

    const response = await fetch("/api/admin-feedback-actions", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: operation === "attachment-url" ? "attachment.url" : operation === "reply-preview" ? "reply.preview" : "reply", ...payload }),
    });
    const data = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) throw new Error(data?.error || `Feedback request failed (${response.status}).`);
    if (data?.error) throw new Error(data.error);
    return data;
  }

  if (operation === "duplicate-search") {
    const { data, error } = await supabase.rpc("admin_feedback_query", {
      p_filters: { search: payload.search ?? null },
      p_sort: "newest",
      p_limit: 8,
      p_offset: 0,
    });
    if (error) throw error;
    return data ?? [];
  }

  if (operation === "query") {
    const { data, error } = await supabase.rpc("admin_feedback_query", {
      p_filters: {
        search: payload.search ?? null,
        status: payload.status ?? null,
        report_type: payload.reportType ?? null,
        area: payload.area ?? null,
        severity: payload.severity ?? null,
        sentiment: payload.sentiment ?? null,
        wants_reply: payload.wantsReply ?? null,
        has_attachment: payload.hasAttachment ?? null,
        has_linked_issue: payload.hasLinkedIssue ?? null,
        has_trip: payload.hasTrip ?? null,
        created_from: payload.createdFrom ?? null,
        created_to: payload.createdTo ?? null,
      },
      p_sort: payload.sort ?? "needs_attention",
      p_limit: payload.limit ?? 25,
      p_offset: payload.offset ?? 0,
    });
    if (error) throw error;
    return data ?? [];
  }

  if (operation === "overview") {
    const { data, error } = await supabase.rpc("admin_feedback_overview");
    if (error) throw error;
    return data;
  }

  if (operation === "list") {
    const { data, error } = await supabase.rpc("admin_feedback_list", {
      p_search: payload.search ?? null,
      p_status: payload.status ?? null,
      p_report_type: payload.reportType ?? null,
      p_area: payload.area ?? null,
      p_severity: payload.severity ?? null,
      p_wants_reply: payload.wantsReply ?? null,
      p_created_from: payload.createdFrom ?? null,
      p_created_to: payload.createdTo ?? null,
      p_limit: payload.limit ?? 25,
      p_offset: payload.offset ?? 0,
    });
    if (error) throw error;
    return data ?? [];
  }

  if (operation === "count") {
    const { data, error } = await supabase.rpc("admin_feedback_count", {
      p_search: payload.search ?? null,
      p_status: payload.status ?? null,
      p_report_type: payload.reportType ?? null,
      p_area: payload.area ?? null,
      p_severity: payload.severity ?? null,
      p_wants_reply: payload.wantsReply ?? null,
      p_created_from: payload.createdFrom ?? null,
      p_created_to: payload.createdTo ?? null,
    });
    if (error) throw error;
    return Number(data ?? 0);
  }

  if (operation === "get") {
    const { data, error } = await supabase.rpc("admin_feedback_get", {
      p_feedback_id: payload.feedbackId,
    });
    if (error) throw error;
    return data;
  }

  if (operation === "update") {
    const { data, error } = await supabase.rpc("admin_feedback_update", {
      p_feedback_id: payload.feedbackId,
      p_patch: payload.patch ?? {},
    });
    if (error) throw error;
    return data;
  }

  throw new Error(`Unsupported feedback operation: ${operation}`);
}

export function feedbackTypeLabel(value: string | null | undefined) {
  return FEEDBACK_REPORT_TYPES.find((item) => item.value === value)?.label ?? value ?? "—";
}

export function feedbackStatusLabel(value: string | null | undefined) {
  return FEEDBACK_STATUSES.find((item) => item.value === value)?.label ?? value ?? "—";
}

export function feedbackAreaLabel(value: string | null | undefined) {
  return FEEDBACK_AREAS.find((item) => item.value === value)?.label ?? value ?? "—";
}

export function formatFeedbackDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
