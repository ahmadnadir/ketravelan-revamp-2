-- Phase 10 — Feedback Center
-- Additive admin read/update layer over the existing public.user_reports system.
-- Does not replace or loosen user_reports RLS.

create table if not exists public.admin_feedback_activity (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.user_reports(id) on delete cascade,
  admin_id uuid not null references public.profiles(id),
  action_type text not null,
  action_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_feedback_activity_feedback_idx
  on public.admin_feedback_activity(feedback_id, created_at desc);

create index if not exists admin_feedback_activity_admin_idx
  on public.admin_feedback_activity(admin_id, created_at desc);

alter table public.admin_feedback_activity enable row level security;

revoke all on table public.admin_feedback_activity from anon, authenticated;

create or replace function public.admin_permissions_for_role(p_role text)
returns text[]
language sql
immutable
set search_path to 'public'
as $$
  select case p_role
    when 'SUPER_ADMIN' then ARRAY[
      'users.view','users.manage','trips.view','trips.manage',
      'moderation.view','moderation.manage','transactions.view','transactions.manage',
      'affiliate.view','affiliate.manage','analytics.view','notifications.manage',
      'settings.manage','administration.manage','audit.view','feedback.view','feedback.manage'
    ]::text[]
    when 'ADMIN' then ARRAY[
      'users.view','users.manage','trips.view','trips.manage',
      'moderation.view','moderation.manage','transactions.view','transactions.manage',
      'affiliate.view','affiliate.manage','analytics.view','notifications.manage',
      'audit.view','feedback.view','feedback.manage'
    ]::text[]
    when 'MODERATOR' then ARRAY[
      'users.view','trips.view','moderation.view','moderation.manage','analytics.view','feedback.view'
    ]::text[]
    when 'SUPPORT' then ARRAY[
      'users.view','trips.view','moderation.view','transactions.view','analytics.view','feedback.view','feedback.manage'
    ]::text[]
    when 'FINANCE' then ARRAY[
      'transactions.view','transactions.manage','affiliate.view','affiliate.manage','analytics.view','audit.view'
    ]::text[]
    else ARRAY[]::text[]
  end;
$$;

create or replace function public.admin_feedback_overview()
returns table (
  total_reports bigint,
  new_count bigint,
  in_progress_count bigint,
  resolved_count bigint,
  closed_count bigint,
  feedback_count bigint,
  feature_request_count bigint,
  bug_count bigint,
  wants_reply_count bigint,
  attachment_count bigint
)
language plpgsql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
begin
  if not public.admin_has_permission('feedback.view') then
    raise exception 'Forbidden';
  end if;

  return query
  select
    count(*)::bigint,
    count(*) filter (where ur.status = 'new')::bigint,
    count(*) filter (where ur.status = 'in_progress')::bigint,
    count(*) filter (where ur.status = 'resolved')::bigint,
    count(*) filter (where ur.status = 'closed')::bigint,
    count(*) filter (where ur.report_type = 'feedback')::bigint,
    count(*) filter (where ur.report_type = 'feature_request')::bigint,
    count(*) filter (where ur.report_type = 'bug')::bigint,
    count(*) filter (where ur.wants_reply is true)::bigint,
    count(*) filter (where cardinality(ur.attachments) > 0)::bigint
  from public.user_reports ur;
end;
$$;

create or replace function public.admin_feedback_count(
  p_search text default null,
  p_status text default null,
  p_report_type text default null,
  p_area text default null,
  p_severity text default null,
  p_wants_reply boolean default null,
  p_created_from date default null,
  p_created_to date default null
)
returns bigint
language plpgsql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
  declare v_count bigint;
begin
  if not public.admin_has_permission('feedback.view') then
    raise exception 'Forbidden';
  end if;

  select count(*) into v_count
  from public.user_reports ur
  left join public.profiles p on p.id = ur.user_id
  where
    (nullif(trim(p_search), '') is null or
      ur.reference_code ilike '%' || trim(p_search) || '%' or
      ur.title ilike '%' || trim(p_search) || '%' or
      ur.details ilike '%' || trim(p_search) || '%' or
      coalesce(p.username, '') ilike '%' || trim(p_search) || '%' or
      coalesce(p.full_name, '') ilike '%' || trim(p_search) || '%')
    and (p_status is null or ur.status = p_status)
    and (p_report_type is null or ur.report_type = p_report_type)
    and (p_area is null or ur.area = p_area)
    and (p_severity is null or ur.severity = p_severity)
    and (p_wants_reply is null or ur.wants_reply = p_wants_reply)
    and (p_created_from is null or ur.created_at >= p_created_from::timestamptz)
    and (p_created_to is null or ur.created_at < (p_created_to + 1)::timestamptz);

  return v_count;
end;
$$;

create or replace function public.admin_feedback_list(
  p_search text default null,
  p_status text default null,
  p_report_type text default null,
  p_area text default null,
  p_severity text default null,
  p_wants_reply boolean default null,
  p_created_from date default null,
  p_created_to date default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  reference_code text,
  user_id uuid,
  report_type text,
  area text,
  title text,
  severity text,
  frequency text,
  sentiment text,
  wants_reply boolean,
  status text,
  duplicate_of uuid,
  trip_id uuid,
  attachment_count integer,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
begin
  if not public.admin_has_permission('feedback.view') then
    raise exception 'Forbidden';
  end if;

  return query
  select
    ur.id,
    ur.reference_code,
    ur.user_id,
    ur.report_type,
    ur.area,
    ur.title,
    ur.severity,
    ur.frequency,
    ur.sentiment,
    ur.wants_reply,
    ur.status,
    ur.duplicate_of,
    ur.trip_id,
    cardinality(ur.attachments),
    p.username,
    p.full_name,
    p.avatar_url,
    ur.created_at,
    ur.updated_at
  from public.user_reports ur
  left join public.profiles p on p.id = ur.user_id
  where
    (nullif(trim(p_search), '') is null or
      ur.reference_code ilike '%' || trim(p_search) || '%' or
      ur.title ilike '%' || trim(p_search) || '%' or
      ur.details ilike '%' || trim(p_search) || '%' or
      coalesce(p.username, '') ilike '%' || trim(p_search) || '%' or
      coalesce(p.full_name, '') ilike '%' || trim(p_search) || '%')
    and (p_status is null or ur.status = p_status)
    and (p_report_type is null or ur.report_type = p_report_type)
    and (p_area is null or ur.area = p_area)
    and (p_severity is null or ur.severity = p_severity)
    and (p_wants_reply is null or ur.wants_reply = p_wants_reply)
    and (p_created_from is null or ur.created_at >= p_created_from::timestamptz)
    and (p_created_to is null or ur.created_at < (p_created_to + 1)::timestamptz)
  order by ur.created_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_feedback_get(p_feedback_id uuid)
returns table (
  id uuid,
  reference_code text,
  user_id uuid,
  report_type text,
  area text,
  title text,
  details text,
  steps_to_reproduce text,
  frequency text,
  severity text,
  problem_to_solve text,
  current_workaround text,
  sentiment text,
  attachments text[],
  wants_reply boolean,
  contact_email text,
  account_email text,
  trip_id uuid,
  context jsonb,
  status text,
  duplicate_of uuid,
  linked_issue_url text,
  internal_notes text,
  created_at timestamptz,
  updated_at timestamptz,
  username text,
  full_name text,
  avatar_url text,
  activity jsonb
)
language plpgsql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
begin
  if not public.admin_has_permission('feedback.view') then
    raise exception 'Forbidden';
  end if;

  return query
  select
    ur.id,
    ur.reference_code,
    ur.user_id,
    ur.report_type,
    ur.area,
    ur.title,
    ur.details,
    ur.steps_to_reproduce,
    ur.frequency,
    ur.severity,
    ur.problem_to_solve,
    ur.current_workaround,
    ur.sentiment,
    ur.attachments,
    ur.wants_reply,
    ur.contact_email,
    au.email,
    ur.trip_id,
    ur.context,
    ur.status,
    ur.duplicate_of,
    ur.linked_issue_url,
    ur.internal_notes,
    ur.created_at,
    ur.updated_at,
    p.username,
    p.full_name,
    p.avatar_url,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'action_type', a.action_type,
        'action_data', a.action_data,
        'admin_id', a.admin_id,
        'admin_username', ap.username,
        'admin_name', ap.full_name,
        'created_at', a.created_at
      ) order by a.created_at desc)
      from public.admin_feedback_activity a
      left join public.profiles ap on ap.id = a.admin_id
      where a.feedback_id = ur.id
    ), '[]'::jsonb)
  from public.user_reports ur
  left join public.profiles p on p.id = ur.user_id
  left join auth.users au on au.id = ur.user_id
  where ur.id = p_feedback_id;
end;
$$;

create or replace function public.admin_feedback_update(
  p_feedback_id uuid,
  p_patch jsonb
)
returns table (
  id uuid,
  reference_code text,
  status text,
  internal_notes text,
  duplicate_of uuid,
  linked_issue_url text,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
  declare
    before_row public.user_reports%rowtype;
    after_row public.user_reports%rowtype;
    allowed_statuses text[] := array['new','in_progress','resolved','closed'];
    changed jsonb;
begin
  if not public.admin_has_permission('feedback.manage') then
    raise exception 'Forbidden';
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Invalid patch';
  end if;

  select * into before_row
  from public.user_reports
  where id = p_feedback_id
  for update;

  if not found then
    raise exception 'Feedback not found';
  end if;

  if p_patch ? 'status' and (p_patch->>'status') <> all(allowed_statuses) then
    raise exception 'Unsupported feedback status';
  end if;

  update public.user_reports
  set
    status = case when p_patch ? 'status' then p_patch->>'status' else status end,
    internal_notes = case when p_patch ? 'internal_notes' then nullif(p_patch->>'internal_notes', '') else internal_notes end,
    duplicate_of = case when p_patch ? 'duplicate_of' then nullif(p_patch->>'duplicate_of', '')::uuid else duplicate_of end,
    linked_issue_url = case when p_patch ? 'linked_issue_url' then nullif(trim(p_patch->>'linked_issue_url'), '') else linked_issue_url end
  where id = p_feedback_id
  returning * into after_row;

  changed := jsonb_build_object(
    'status', jsonb_build_object('before', before_row.status, 'after', after_row.status),
    'internal_notes', jsonb_build_object('before', before_row.internal_notes, 'after', after_row.internal_notes),
    'duplicate_of', jsonb_build_object('before', before_row.duplicate_of, 'after', after_row.duplicate_of),
    'linked_issue_url', jsonb_build_object('before', before_row.linked_issue_url, 'after', after_row.linked_issue_url)
  );

  insert into public.admin_feedback_activity (feedback_id, admin_id, action_type, action_data)
  values (
    p_feedback_id,
    auth.uid(),
    'feedback_updated',
    jsonb_build_object('changed', changed)
  );

  return query
  select after_row.id, after_row.reference_code, after_row.status, after_row.internal_notes,
         after_row.duplicate_of, after_row.linked_issue_url, after_row.updated_at;
end;
$$;

grant execute on function public.admin_feedback_overview() to authenticated;
grant execute on function public.admin_feedback_count(text,text,text,text,text,boolean,date,date) to authenticated;
grant execute on function public.admin_feedback_list(text,text,text,text,text,boolean,date,date,integer,integer) to authenticated;
grant execute on function public.admin_feedback_get(uuid) to authenticated;
grant execute on function public.admin_feedback_update(uuid,jsonb) to authenticated;

revoke execute on function public.admin_feedback_overview() from public, anon;
revoke execute on function public.admin_feedback_count(text,text,text,text,text,boolean,date,date) from public, anon;
revoke execute on function public.admin_feedback_list(text,text,text,text,text,boolean,date,date,integer,integer) from public, anon;
revoke execute on function public.admin_feedback_get(uuid) from public, anon;
revoke execute on function public.admin_feedback_update(uuid,jsonb) from public, anon;
