drop function if exists public.admin_feedback_get(uuid);

create function public.admin_feedback_get(p_feedback_id uuid)
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
    raise exception 'Forbidden' using errcode = '42501';
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
    ur.contact_email::text,
    au.email::text,
    ur.trip_id,
    ur.context,
    ur.status,
    ur.duplicate_of,
    ur.linked_issue_url,
    ur.internal_notes,
    ur.created_at,
    ur.updated_at,
    p.username::text,
    p.full_name::text,
    p.avatar_url::text,
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

grant execute on function public.admin_feedback_get(uuid) to authenticated;
revoke execute on function public.admin_feedback_get(uuid) from public, anon;