-- Make the storage bucket private. Previously anyone with an object URL could
-- read any image/file, which undercut the private-project / friends model.
--
-- Objects are now served via short-lived signed URLs minted at fetch time
-- (frontend/src/api/media.ts). The SELECT policy below is what authorises that
-- signing: an owner can sign their own objects, and a friend can sign a friend's
-- objects. Friends only ever learn the paths of *public* projects (the
-- get_friend_project* SECURITY DEFINER functions only return those), and private
-- object paths carry an unguessable random suffix, so granting friends read on
-- an owner's objects does not expose private-project media.

update storage.buckets set public = false where id = 'stitchbud-files';

-- Replace the open read policy with owner-or-friend, authenticated only.
drop policy if exists "stitchbud_files_read" on storage.objects;
create policy "stitchbud_files_read" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'stitchbud-files'
        and (
            owner = (select auth.uid())
            or public.is_friend(owner::text)
        )
    );

-- Insert/update/delete remain owner-only (unchanged from the storage migration).
