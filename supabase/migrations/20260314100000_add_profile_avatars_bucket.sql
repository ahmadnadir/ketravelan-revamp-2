-- Create bucket for profile avatar images
insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do nothing;

-- Ensure clean slate for policies
drop policy if exists "Allow public read profile avatars" on storage.objects;
drop policy if exists "Allow authenticated upload profile avatars" on storage.objects;
drop policy if exists "Allow authenticated update profile avatars" on storage.objects;
drop policy if exists "Allow authenticated delete profile avatars" on storage.objects;

-- Public read access for avatar images
create policy "Allow public read profile avatars"
  on storage.objects
  for select
  using (bucket_id = 'profile-avatars');

-- Authenticated users can upload avatars
create policy "Allow authenticated upload profile avatars"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'profile-avatars');

-- Authenticated users can update avatars
create policy "Allow authenticated update profile avatars"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'profile-avatars');

-- Authenticated users can delete avatars
create policy "Allow authenticated delete profile avatars"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'profile-avatars');
