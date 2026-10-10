import type { SupabaseClient } from '@supabase/supabase-js';

export interface AnalyticsRange {
  startDate: string;
  endDate: string;
}

interface AnalyticsEvent {
  id: string;
  user_id: string | null;
  session_id: string | null;
  event_name: string | null;
  event_category: string | null;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

interface TripAnalyticsRow {
  date: string;
  views: number | null;
  unique_visitors: number | null;
  join_requests: number | null;
  conversions: number | null;
  shares: number | null;
  saves: number | null;
}

interface UserEngagementRow {
  date: string;
  login_count: number | null;
  trips_viewed: number | null;
  messages_sent: number | null;
  trips_created: number | null;
  trips_joined: number | null;
  total_session_duration: number | null;
}

interface AnalyticsBreakdownRow {
  category: string;
  name: string;
  count: number;
}

export interface AnalyticsReport {
  overview: {
    events: { total: number; uniqueUsers: number; uniqueSessions: number };
    trips: { views: number; uniqueVisitors: number; joinRequests: number; conversions: number; shares: number; saves: number };
    engagement: { logins: number; tripsViewed: number; messagesSent: number; tripsCreated: number; tripsJoined: number; sessionDuration: number };
  };
  eventBreakdown: AnalyticsBreakdownRow[];
  tripTrend: TripAnalyticsRow[];
  engagementTrend: UserEngagementRow[];
}

export interface LivePlatformSummary {
  users_total: number;
  users_added_today: number;
  users_added_this_month: number;
  users_added_previous_month: number;
  trips_total: number;
  trips_draft: number;
  trips_published: number;
  trips_private: number;
  trips_public: number;
  registration_trend: Array<{ day: string; new_users: number }>;
  moderation: { needs_review: number; in_review: number; open_total: number } | null;
  transactions: { failed_payments: number; completed_mtd: Array<{ currency: string; records: number; amount: number }> } | null;
  affiliate: { clicks_mtd: number; conversions_today: number; reconciliation_pending: number; received_mtd: Array<{ currency: string; records: number; amount: number }> } | null;
}

export interface AdminDashboardStatistics {
  user_register_trend: Array<{ day: string; new_users: number }>;
  user_home_country: Array<{ country: string; user_count: number }>;
  user_destination: Array<{ destination: string; trip_count: number }>;
}

export interface AnalyticsMetricDetails {
  total: number;
  rows: Array<Record<string, unknown>>;
}

interface ExistingActivityDay {
  date: string;
  count: number;
}

interface ExistingSessionDay {
  date: string;
  seconds: number;
}

interface ExistingActivityAnalytics {
  join_requests: ExistingActivityDay[];
  messages_sent: ExistingActivityDay[];
  session_duration: ExistingSessionDay[];
}

const PAGE_SIZE = 1000;

async function getAllRows<T>(fetchPage: (from: number, to: number) => Promise<T[]>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await fetchPage(from, from + PAGE_SIZE - 1);
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function sum<T>(rows: T[], field: keyof T) {
  return rows.reduce((total, row) => total + Number(row[field] ?? 0), 0);
}

export async function getAnalyticsReport(supabase: SupabaseClient, range: AnalyticsRange): Promise<AnalyticsReport> {
  const endExclusive = addDays(range.endDate, 1);
  const [events, tripTrend, engagementTrend, existingActivity] = await Promise.all([
    getAllRows<AnalyticsEvent>(async (from, to) => {
      const { data, error } = await supabase.from('analytics_events')
        .select('id,user_id,session_id,event_name,event_category,event_data,created_at')
        .gte('created_at', `${range.startDate}T00:00:00.000Z`)
        .lt('created_at', `${endExclusive}T00:00:00.000Z`)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as AnalyticsEvent[];
    }),
    getAllRows<TripAnalyticsRow>(async (from, to) => {
      const { data, error } = await supabase.from('trip_analytics')
        .select('date,views,unique_visitors,join_requests,conversions,shares,saves')
        .gte('date', range.startDate)
        .lte('date', range.endDate)
        .order('date', { ascending: true })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as TripAnalyticsRow[];
    }),
    getAllRows<UserEngagementRow>(async (from, to) => {
      const { data, error } = await supabase.from('user_engagement')
        .select('date,login_count,trips_viewed,messages_sent,trips_created,trips_joined,total_session_duration')
        .gte('date', range.startDate)
        .lte('date', range.endDate)
        .order('date', { ascending: true })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as UserEngagementRow[];
    }),
    getExistingActivityAnalytics(supabase, range),
  ]);

  const breakdown = new Map<string, AnalyticsBreakdownRow>();
  const tripViewEventsByDate = new Map<string, number>();
  const tripJoinRequestEventsByDate = new Map<string, number>();
  const messageSentEventsByDate = new Map<string, number>();
  const sessionSecondsByDate = new Map<string, number>();
  for (const event of events) {
    const category = event.event_category || 'Other';
    const name = event.event_name || 'Unknown';
    const key = JSON.stringify([category, name]);
    const row = breakdown.get(key);
    if (row) row.count += 1;
    else breakdown.set(key, { category, name, count: 1 });

    if (event.event_name === 'trip_view') {
      const date = event.created_at.slice(0, 10);
      tripViewEventsByDate.set(date, (tripViewEventsByDate.get(date) ?? 0) + 1);
    } else if (event.event_name === 'trip_join_request') {
      const date = event.created_at.slice(0, 10);
      tripJoinRequestEventsByDate.set(date, (tripJoinRequestEventsByDate.get(date) ?? 0) + 1);
    } else if (event.event_name === 'message_sent') {
      const date = event.created_at.slice(0, 10);
      messageSentEventsByDate.set(date, (messageSentEventsByDate.get(date) ?? 0) + 1);
    } else if (event.event_name === 'session_duration') {
      const date = event.created_at.slice(0, 10);
      const seconds = Number(event.event_data?.duration_seconds ?? 0);
      if (Number.isFinite(seconds) && seconds > 0) {
        sessionSecondsByDate.set(date, (sessionSecondsByDate.get(date) ?? 0) + seconds);
      }
    }
  }

  const tripViewsByDate = new Map<string, TripAnalyticsRow>();
  for (const row of tripTrend) {
    const daily = tripViewsByDate.get(row.date);
    if (daily) {
      daily.views = Number(daily.views ?? 0) + Number(row.views ?? 0);
      daily.unique_visitors = Number(daily.unique_visitors ?? 0) + Number(row.unique_visitors ?? 0);
      daily.join_requests = Number(daily.join_requests ?? 0) + Number(row.join_requests ?? 0);
      daily.conversions = Number(daily.conversions ?? 0) + Number(row.conversions ?? 0);
      daily.shares = Number(daily.shares ?? 0) + Number(row.shares ?? 0);
      daily.saves = Number(daily.saves ?? 0) + Number(row.saves ?? 0);
    } else {
      tripViewsByDate.set(row.date, { ...row });
    }
  }
  for (const [date, eventViews] of tripViewEventsByDate) {
    const daily = tripViewsByDate.get(date);
    if (daily) daily.views = Math.max(Number(daily.views ?? 0), eventViews);
    else tripViewsByDate.set(date, {
      date,
      views: eventViews,
      unique_visitors: 0,
      join_requests: 0,
      conversions: 0,
      shares: 0,
      saves: 0,
    });
  }
  for (const [date, eventJoinRequests] of tripJoinRequestEventsByDate) {
    const daily = tripViewsByDate.get(date);
    if (daily) daily.join_requests = Math.max(Number(daily.join_requests ?? 0), eventJoinRequests);
    else tripViewsByDate.set(date, {
      date,
      views: 0,
      unique_visitors: 0,
      join_requests: eventJoinRequests,
      conversions: 0,
      shares: 0,
      saves: 0,
    });
  }
  for (const { date, count } of existingActivity.join_requests) {
    const daily = tripViewsByDate.get(date);
    if (daily) daily.join_requests = Math.max(Number(daily.join_requests ?? 0), Number(count ?? 0));
    else tripViewsByDate.set(date, {
      date,
      views: 0,
      unique_visitors: 0,
      join_requests: Number(count ?? 0),
      conversions: 0,
      shares: 0,
      saves: 0,
    });
  }
  const dailyTripTrend = [...tripViewsByDate.values()].sort((left, right) => left.date.localeCompare(right.date));

  const engagementByDate = new Map<string, UserEngagementRow>();
  for (const row of engagementTrend) {
    const daily = engagementByDate.get(row.date);
    if (daily) {
      daily.login_count = Number(daily.login_count ?? 0) + Number(row.login_count ?? 0);
      daily.trips_viewed = Number(daily.trips_viewed ?? 0) + Number(row.trips_viewed ?? 0);
      daily.messages_sent = Number(daily.messages_sent ?? 0) + Number(row.messages_sent ?? 0);
      daily.trips_created = Number(daily.trips_created ?? 0) + Number(row.trips_created ?? 0);
      daily.trips_joined = Number(daily.trips_joined ?? 0) + Number(row.trips_joined ?? 0);
      daily.total_session_duration = Number(daily.total_session_duration ?? 0) + Number(row.total_session_duration ?? 0);
    } else {
      engagementByDate.set(row.date, { ...row });
    }
  }
  const storedMessageCounts = new Map(existingActivity.messages_sent.map(({ date, count }) => [date, Number(count ?? 0)]));
  const storedSessionSeconds = new Map(existingActivity.session_duration.map(({ date, seconds }) => [date, Number(seconds ?? 0)]));
  for (const date of new Set([
    ...messageSentEventsByDate.keys(),
    ...sessionSecondsByDate.keys(),
    ...storedMessageCounts.keys(),
    ...storedSessionSeconds.keys(),
  ])) {
    const daily = engagementByDate.get(date) ?? {
      date,
      login_count: 0,
      trips_viewed: 0,
      messages_sent: 0,
      trips_created: 0,
      trips_joined: 0,
      total_session_duration: 0,
    };
    daily.messages_sent = Math.max(
      daily.messages_sent ?? 0,
      messageSentEventsByDate.get(date) ?? 0,
      storedMessageCounts.get(date) ?? 0,
    );
    daily.total_session_duration = Math.max(
      daily.total_session_duration ?? 0,
      sessionSecondsByDate.get(date) ?? 0,
      storedSessionSeconds.get(date) ?? 0,
    );
    engagementByDate.set(date, daily);
  }
  const dailyEngagementTrend = [...engagementByDate.values()].sort((left, right) => left.date.localeCompare(right.date));

  return {
    overview: {
      events: {
        total: events.length,
        uniqueUsers: new Set(events.map((event) => event.user_id).filter(Boolean)).size,
        uniqueSessions: new Set(events.map((event) => event.session_id).filter(Boolean)).size,
      },
      trips: {
        views: sum(dailyTripTrend, 'views'),
        uniqueVisitors: sum(dailyTripTrend, 'unique_visitors'),
        joinRequests: sum(dailyTripTrend, 'join_requests'),
        conversions: sum(dailyTripTrend, 'conversions'),
        shares: sum(dailyTripTrend, 'shares'),
        saves: sum(dailyTripTrend, 'saves'),
      },
      engagement: {
        logins: sum(dailyEngagementTrend, 'login_count'),
        tripsViewed: sum(dailyEngagementTrend, 'trips_viewed'),
        messagesSent: sum(dailyEngagementTrend, 'messages_sent'),
        tripsCreated: sum(dailyEngagementTrend, 'trips_created'),
        tripsJoined: sum(dailyEngagementTrend, 'trips_joined'),
        sessionDuration: sum(dailyEngagementTrend, 'total_session_duration'),
      },
    },
    eventBreakdown: [...breakdown.values()].sort((left, right) => right.count - left.count),
    tripTrend: dailyTripTrend,
    engagementTrend: dailyEngagementTrend,
  };
}

export async function getLivePlatformSummary(supabase: SupabaseClient): Promise<LivePlatformSummary> {
  const [summary, cardDetails] = await Promise.all([
    supabase.rpc('admin_get_command_center', { p_trend_days: 30 }),
    supabase.rpc('admin_get_analytics_card_details'),
  ]);
  if (summary.error) throw summary.error;
  if (cardDetails.error) throw cardDetails.error;
  return { ...summary.data, ...cardDetails.data } as unknown as LivePlatformSummary;
}

export async function getAdminDashboardStatistics(supabase: SupabaseClient): Promise<AdminDashboardStatistics> {
  const { data, error } = await supabase.rpc('get_admin_dashboard_statistics');
  if (error) throw error;
  return data as unknown as AdminDashboardStatistics;
}

export async function getExistingActivityAnalytics(
  supabase: SupabaseClient,
  range: AnalyticsRange,
): Promise<ExistingActivityAnalytics> {
  const { data, error } = await supabase.rpc('admin_get_existing_activity_analytics', {
    p_start_date: range.startDate,
    p_end_date: range.endDate,
  });
  if (error) throw error;
  return data as unknown as ExistingActivityAnalytics;
}

export async function getAnalyticsMetricDetails(
  supabase: SupabaseClient,
  metric: string,
  range: AnalyticsRange,
  limit = 50,
  offset = 0,
): Promise<AnalyticsMetricDetails> {
  const tripMetrics = new Set(['trip-views', 'join-requests']);
  const contextMetrics = new Set(['unique-users', 'unique-sessions', 'session-minutes']);
  const functionName = tripMetrics.has(metric)
    ? 'admin_get_analytics_trip_detail_rows'
    : contextMetrics.has(metric)
      ? 'admin_get_analytics_metric_context'
      : 'admin_get_analytics_metric_details';
  const { data, error } = await supabase.rpc(
    functionName,
    {
      p_metric: metric,
      p_start_date: range.startDate,
      p_end_date: range.endDate,
      p_limit: limit,
      p_offset: offset,
    },
  );
  if (error) throw error;
  return data as unknown as AnalyticsMetricDetails;
}

export async function getAnalyticsDayMessages(
  supabase: SupabaseClient,
  date: string,
  limit = 100,
  offset = 0,
): Promise<AnalyticsMetricDetails> {
  const { data, error } = await supabase.rpc('admin_get_analytics_day_messages', {
    p_date: date,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return data as unknown as AnalyticsMetricDetails;
}

export async function getAnalyticsTripRequests(
  supabase: SupabaseClient,
  tripId: string,
  limit = 50,
  offset = 0,
): Promise<AnalyticsMetricDetails> {
  const { data, error } = await supabase.rpc('admin_get_analytics_trip_request_details', {
    p_trip_id: tripId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return data as unknown as AnalyticsMetricDetails;
}