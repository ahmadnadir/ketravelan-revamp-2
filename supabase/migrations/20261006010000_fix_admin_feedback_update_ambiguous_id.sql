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
  allowed_statuses text[] := array['new','triaged','in_progress','shipped','wont_do','duplicate'];
  changed jsonb;
begin
  if not public.admin_has_permission('feedback.manage') then
    raise exception 'Forbidden';
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Invalid patch';
  end if;

  select ur.* into before_row
  from public.user_reports as ur
  where ur.id = p_feedback_id
  for update;

  if not found then
    raise exception 'Feedback not found';
  end if;

  if p_patch ? 'status' and (p_patch->>'status') <> all(allowed_statuses) then
    raise exception 'Unsupported feedback status';
  end if;

  update public.user_reports as ur
  set
    status = case when p_patch ? 'status' then p_patch->>'status' else ur.status end,
    internal_notes = case when p_patch ? 'internal_notes' then nullif(p_patch->>'internal_notes', '') else ur.internal_notes end,
    duplicate_of = case when p_patch ? 'duplicate_of' then nullif(p_patch->>'duplicate_of', '')::uuid else ur.duplicate_of end,
    linked_issue_url = case when p_patch ? 'linked_issue_url' then nullif(trim(p_patch->>'linked_issue_url'), '') else ur.linked_issue_url end
  where ur.id = p_feedback_id
  returning ur.* into after_row;

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

grant execute on function public.admin_feedback_update(uuid,jsonb) to authenticated;
revoke execute on function public.admin_feedback_update(uuid,jsonb) from public, anon;