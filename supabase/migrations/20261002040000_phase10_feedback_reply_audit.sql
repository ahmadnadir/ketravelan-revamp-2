create or replace function public.admin_feedback_record_activity(
  p_feedback_id uuid,
  p_action_type text,
  p_action_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  activity_id uuid;
begin
  if not public.admin_has_permission('feedback.manage') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if p_action_type not in ('feedback_reply_sent', 'feedback_reply_failed') then
    raise exception 'Unsupported feedback activity';
  end if;
  if not exists (select 1 from public.user_reports where id = p_feedback_id) then
    raise exception 'Feedback not found';
  end if;

  insert into public.admin_feedback_activity (feedback_id, admin_id, action_type, action_data)
  values (p_feedback_id, auth.uid(), p_action_type, coalesce(p_action_data, '{}'::jsonb))
  returning id into activity_id;
  return activity_id;
end;
$$;

grant execute on function public.admin_feedback_record_activity(uuid,text,jsonb) to authenticated;
revoke execute on function public.admin_feedback_record_activity(uuid,text,jsonb) from public, anon;