-- Reliable trip currency settings updater that is resilient to client-side RLS/schema-cache edge cases.
create or replace function public.set_trip_currency_settings(
  p_trip_id uuid,
  p_home_currency text,
  p_travel_currencies text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_allowed boolean := false;
  v_home text := nullif(upper(trim(coalesce(p_home_currency, ''))), '');
  v_travel text[] := coalesce(p_travel_currencies, array[]::text[]);
  v_has_home_column boolean := false;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select (
    exists (
      select 1
      from public.trips t
      where t.id = p_trip_id
        and t.creator_id = v_uid
    )
    or exists (
      select 1
      from public.trip_members tm
      where tm.trip_id = p_trip_id
        and tm.user_id = v_uid
        and tm.left_at is null
        and tm.is_admin = true
    )
  )
  into v_is_allowed;

  if not v_is_allowed then
    raise exception 'Not allowed to update this trip currency settings';
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'trips'
      and column_name = 'home_currency'
  )
  into v_has_home_column;

  if v_has_home_column then
    update public.trips
    set
      home_currency = v_home,
      currency_settings = jsonb_set(
        coalesce(currency_settings, '{}'::jsonb),
        '{home_currency}',
        to_jsonb(v_home),
        true
      )
    where id = p_trip_id;
  else
    update public.trips
    set
      currency_settings = jsonb_set(
        coalesce(currency_settings, '{}'::jsonb),
        '{home_currency}',
        to_jsonb(v_home),
        true
      )
    where id = p_trip_id;
  end if;

  update public.trips
  set
    currency_settings = jsonb_set(
      coalesce(currency_settings, '{}'::jsonb),
      '{travel_currencies}',
      to_jsonb(v_travel),
      true
    )
  where id = p_trip_id;
end;
$$;

grant execute on function public.set_trip_currency_settings(uuid, text, text[]) to authenticated;