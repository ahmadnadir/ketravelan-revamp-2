create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique
    default upper(substring(replace(gen_random_uuid()::text, '-', '') for 8)),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null
    check (report_type in ('bug', 'feedback', 'feature_request')),
  area text not null check (area in (
    'explore_public_trips',
    'create_trip',
    'join_requests_invites',
    'trip_chat',
    'expenses_splitting',
    'settlement_payment',
    'notes',
    'community',
    'profile_account',
    'notifications_email',
    'other'
  )),
  title text not null check (char_length(trim(title)) between 3 and 80),
  details text not null check (char_length(trim(details)) >= 15),
  steps_to_reproduce text,
  frequency text check (frequency in ('once', 'sometimes', 'every_time')),
  severity text check (severity in ('minor', 'annoying', 'blocking')),
  problem_to_solve text,
  current_workaround text,
  sentiment text check (sentiment in ('positive', 'mixed', 'negative')),
  attachments text[] not null default '{}',
  wants_reply boolean not null default true,
  contact_email text,
  trip_id uuid references public.trips(id) on delete set null,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'new'
    check (status in ('new', 'triaged', 'in_progress', 'shipped', 'wont_do', 'duplicate')),
  duplicate_of uuid references public.user_reports(id) on delete set null,
  linked_issue_url text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_reports_user_idx on public.user_reports (user_id, created_at desc);
create index if not exists user_reports_triage_idx on public.user_reports (status, report_type, area, created_at desc);
create index if not exists user_reports_trip_idx on public.user_reports (trip_id) where trip_id is not null;

create or replace function public.touch_user_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_reports_touch on public.user_reports;
create trigger user_reports_touch
before update on public.user_reports
for each row execute function public.touch_user_reports_updated_at();

create or replace function public.check_user_report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare recent_count int;
begin
  select count(*) into recent_count
  from public.user_reports
  where user_id = new.user_id
    and created_at > now() - interval '1 hour';

  if recent_count >= 5 then
    raise exception 'Too many reports submitted. Try again in an hour.';
  end if;

  return new;
end;
$$;

drop trigger if exists user_reports_rate_limit on public.user_reports;
create trigger user_reports_rate_limit
before insert on public.user_reports
for each row execute function public.check_user_report_rate_limit();

alter table public.user_reports enable row level security;

drop policy if exists "insert own reports" on public.user_reports;
create policy "insert own reports" on public.user_reports
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "read own reports" on public.user_reports;
create policy "read own reports" on public.user_reports
for select
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-attachments',
  'report-attachments',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

drop policy if exists "upload own report attachments" on storage.objects;
create policy "upload own report attachments" on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'report-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "read own report attachments" on storage.objects;
create policy "read own report attachments" on storage.objects
for select
to authenticated
using (
  bucket_id = 'report-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);