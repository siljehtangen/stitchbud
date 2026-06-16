-- Storage bucket and access policies for image/file uploads. The React client
-- uploads directly to this public bucket and deletes its own objects, which
-- replaces the backend SupabaseStorageService per-item deletes. Bulk cleanup
-- on account deletion is handled by the delete-account Edge Function using the
-- service-role key.

insert into storage.buckets (id, name, public)
values ('stitchbud-files', 'stitchbud-files', true)
on conflict (id) do nothing;

-- Public bucket: anyone can read objects (matches the public URLs persisted in
-- stored_name). Writes are restricted to the authenticated owner.
drop policy if exists "stitchbud_files_read" on storage.objects;
create policy "stitchbud_files_read" on storage.objects
    for select
    using (bucket_id = 'stitchbud-files');

drop policy if exists "stitchbud_files_insert_own" on storage.objects;
create policy "stitchbud_files_insert_own" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'stitchbud-files' and owner = (select auth.uid()));

drop policy if exists "stitchbud_files_update_own" on storage.objects;
create policy "stitchbud_files_update_own" on storage.objects
    for update to authenticated
    using (bucket_id = 'stitchbud-files' and owner = (select auth.uid()))
    with check (bucket_id = 'stitchbud-files' and owner = (select auth.uid()));

drop policy if exists "stitchbud_files_delete_own" on storage.objects;
create policy "stitchbud_files_delete_own" on storage.objects
    for delete to authenticated
    using (bucket_id = 'stitchbud-files' and owner = (select auth.uid()));
