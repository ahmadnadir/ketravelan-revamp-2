-- Ensure moderation report fields exist across all environments.
alter table if exists public.reports
  add column if not exists description text;

alter table if exists public.reports
  add column if not exists reported_at timestamptz;

-- Backfill legacy rows so moderation timelines have a value.
update public.reports
set reported_at = coalesce(reported_at, created_at, timezone('utc', now()))
where reported_at is null;

alter table if exists public.reports
  alter column reported_at set default timezone('utc', now());