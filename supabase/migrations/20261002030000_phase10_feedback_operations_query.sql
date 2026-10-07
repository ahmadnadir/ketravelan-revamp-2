create or replace function public.admin_feedback_query(
  p_filters jsonb default '{}'::jsonb,
  p_sort text default 'needs_attention',
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
  sentiment text,
  wants_reply boolean,
  status text,
  duplicate_of uuid,
  trip_id uuid,
  linked_issue_url text,
  attachment_count integer,
  username text,
  full_name text,
  account_email text,
  contact_email text,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
begin
  if not public.admin_has_permission('feedback.view') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  with filtered as (
    select
      ur.id,
      ur.reference_code,
      ur.user_id,
      ur.report_type,
      ur.area,
      ur.title,
      ur.severity,
      ur.sentiment,
      ur.wants_reply,
      ur.status,
      ur.duplicate_of,
      ur.trip_id,
      ur.linked_issue_url,
      cardinality(ur.attachments)::integer as attachment_count,
      p.username,
      p.full_name,
      au.email as account_email,
      ur.contact_email,
      ur.created_at,
      ur.updated_at
    from public.user_reports ur
    left join public.profiles p on p.id = ur.user_id
    left join auth.users au on au.id = ur.user_id
    where
      (nullif(trim(p_filters->>'search'), '') is null or
        ur.reference_code ilike '%' || trim(p_filters->>'search') || '%' or
        ur.title ilike '%' || trim(p_filters->>'search') || '%' or
        ur.details ilike '%' || trim(p_filters->>'search') || '%' or
        coalesce(p.username, '') ilike '%' || trim(p_filters->>'search') || '%' or
        coalesce(p.full_name, '') ilike '%' || trim(p_filters->>'search') || '%' or
        coalesce(au.email, '') ilike '%' || trim(p_filters->>'search') || '%' or
        coalesce(ur.contact_email, '') ilike '%' || trim(p_filters->>'search') || '%')
      and (nullif(p_filters->>'status', '') is null or ur.status = p_filters->>'status')
      and (nullif(p_filters->>'report_type', '') is null or ur.report_type = p_filters->>'report_type')
      and (nullif(p_filters->>'area', '') is null or ur.area = p_filters->>'area')
      and (nullif(p_filters->>'severity', '') is null or ur.severity = p_filters->>'severity')
      and (nullif(p_filters->>'sentiment', '') is null or ur.sentiment = p_filters->>'sentiment')
      and (p_filters->>'wants_reply' is null or ur.wants_reply = (p_filters->>'wants_reply')::boolean)
      and (p_filters->>'has_attachment' is null or (cardinality(ur.attachments) > 0) = (p_filters->>'has_attachment')::boolean)
      and (p_filters->>'has_linked_issue' is null or (nullif(trim(ur.linked_issue_url), '') is not null) = (p_filters->>'has_linked_issue')::boolean)
      and (p_filters->>'has_trip' is null or (ur.trip_id is not null) = (p_filters->>'has_trip')::boolean)
      and (nullif(p_filters->>'created_from', '') is null or ur.created_at >= (p_filters->>'created_from')::date::timestamptz)
      and (nullif(p_filters->>'created_to', '') is null or ur.created_at < ((p_filters->>'created_to')::date + 1)::timestamptz)
  ), counted as (
    select filtered.*, count(*) over () as total_count from filtered
  )
  select
    counted.id, counted.reference_code, counted.user_id, counted.report_type,
    counted.area, counted.title, counted.severity, counted.sentiment,
    counted.wants_reply, counted.status, counted.duplicate_of, counted.trip_id,
    counted.linked_issue_url,
    counted.attachment_count, counted.username, counted.full_name,
    counted.account_email, counted.contact_email, counted.created_at,
    counted.updated_at, counted.total_count
  from counted
  order by
    case when p_sort = 'oldest' then counted.created_at end asc,
    case when p_sort = 'updated' then counted.updated_at end desc,
    case when p_sort = 'needs_reply' then counted.wants_reply::integer end desc,
    case when p_sort = 'status' then array_position(array['new','triaged','in_progress','shipped','wont_do','duplicate'], counted.status) end asc,
    case when p_sort = 'severity' then array_position(array['blocking','annoying','minor'], counted.severity) end asc,
    case when p_sort = 'needs_attention' then (counted.status = 'new')::integer end desc,
    case when p_sort = 'needs_attention' then counted.wants_reply::integer end desc,
    case when p_sort = 'needs_attention' then array_position(array['blocking','annoying','minor'], counted.severity) end asc,
    case when p_sort not in ('oldest','updated','needs_reply','status','severity','needs_attention') then counted.created_at end desc,
    counted.created_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

grant execute on function public.admin_feedback_query(jsonb,text,integer,integer) to authenticated;
revoke execute on function public.admin_feedback_query(jsonb,text,integer,integer) from public, anon;