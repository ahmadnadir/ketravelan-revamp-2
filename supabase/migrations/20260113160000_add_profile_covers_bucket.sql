-- Create bucket for profile cover images
insert into storage.buckets (id, name, public)
values ('profile-covers', 'profile-covers', true)
on conflict (id) do nothing;

-- Ensure clean slate for policies (CREATE POLICY does not support IF NOT EXISTS)
drop policy if exists "Allow public read profile covers" on storage.objects;
drop policy if exists "Allow authenticated upload profile covers" on storage.objects;
drop policy if exists "Allow authenticated update profile covers" on storage.objects;
drop policy if exists "Allow authenticated delete profile covers" on storage.objects;

-- Public read access for cover images
create policy "Allow public read profile covers"
  on storage.objects
  for select
  using (bucket_id = 'profile-covers');

-- Authenticated users can upload covers
create policy "Allow authenticated upload profile covers"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'profile-covers');

-- Authenticated users can update covers
create policy "Allow authenticated update profile covers"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'profile-covers');

-- Authenticated users can delete covers
create policy "Allow authenticated delete profile covers"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'profile-covers');
