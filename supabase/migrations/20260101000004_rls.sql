-- Row-Level Security. Replaces the former application-layer ownership checks
-- (findByIdAndUserId(...)) with database-enforced policies. user_id columns
-- hold the Supabase Auth UUID as text, so we compare against auth.uid()::text.
--
-- Ownership model:
--   * projects, library_items, user_profiles, friendships -> direct user check
--   * child tables -> ownership inferred from the parent row
--   * friend access to public projects is NOT granted here; it is served by the
--     SECURITY DEFINER functions in the next migration so that private columns
--     (notes, recipe_text) can be stripped. RLS cannot hide columns.

-- Helper used by the friend-access functions (defined SECURITY DEFINER so it
-- bypasses RLS on friendships and avoids recursive policy evaluation).
create or replace function public.is_friend(other_user_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from friendships f
        where f.status = 'ACCEPTED'
          and (
                (f.requester_id = (select auth.uid())::text and f.recipient_id = other_user_id)
             or (f.recipient_id = (select auth.uid())::text and f.requester_id = other_user_id)
          )
    );
$$;

alter table projects            enable row level security;
alter table materials           enable row level security;
alter table project_images      enable row level security;
alter table project_files       enable row level security;
alter table pattern_grids       enable row level security;
alter table row_counters        enable row level security;
alter table library_items       enable row level security;
alter table library_item_images enable row level security;
alter table friendships         enable row level security;
alter table user_profiles       enable row level security;

-- ---------------------------------------------------------------------------
-- projects (owner-only; friend reads go through SECURITY DEFINER functions)
-- ---------------------------------------------------------------------------
create policy "projects_select_own" on projects
    for select using (user_id = (select auth.uid())::text);
create policy "projects_insert_own" on projects
    for insert with check (user_id = (select auth.uid())::text);
create policy "projects_update_own" on projects
    for update using (user_id = (select auth.uid())::text)
            with check (user_id = (select auth.uid())::text);
create policy "projects_delete_own" on projects
    for delete using (user_id = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- project child tables: ownership inferred from the parent project
-- ---------------------------------------------------------------------------
create policy "materials_owner" on materials
    for all
    using (exists (select 1 from projects p where p.id = materials.project_id and p.user_id = (select auth.uid())::text))
    with check (exists (select 1 from projects p where p.id = materials.project_id and p.user_id = (select auth.uid())::text));

create policy "project_images_owner" on project_images
    for all
    using (exists (select 1 from projects p where p.id = project_images.project_id and p.user_id = (select auth.uid())::text))
    with check (exists (select 1 from projects p where p.id = project_images.project_id and p.user_id = (select auth.uid())::text));

create policy "project_files_owner" on project_files
    for all
    using (exists (select 1 from projects p where p.id = project_files.project_id and p.user_id = (select auth.uid())::text))
    with check (exists (select 1 from projects p where p.id = project_files.project_id and p.user_id = (select auth.uid())::text));

create policy "pattern_grids_owner" on pattern_grids
    for all
    using (exists (select 1 from projects p where p.id = pattern_grids.project_id and p.user_id = (select auth.uid())::text))
    with check (exists (select 1 from projects p where p.id = pattern_grids.project_id and p.user_id = (select auth.uid())::text));

create policy "row_counters_owner" on row_counters
    for all
    using (exists (select 1 from projects p where p.id = row_counters.project_id and p.user_id = (select auth.uid())::text))
    with check (exists (select 1 from projects p where p.id = row_counters.project_id and p.user_id = (select auth.uid())::text));

-- ---------------------------------------------------------------------------
-- library
-- ---------------------------------------------------------------------------
create policy "library_items_select_own" on library_items
    for select using (user_id = (select auth.uid())::text);
create policy "library_items_insert_own" on library_items
    for insert with check (user_id = (select auth.uid())::text);
create policy "library_items_update_own" on library_items
    for update using (user_id = (select auth.uid())::text)
            with check (user_id = (select auth.uid())::text);
create policy "library_items_delete_own" on library_items
    for delete using (user_id = (select auth.uid())::text);

create policy "library_item_images_owner" on library_item_images
    for all
    using (exists (select 1 from library_items li where li.id = library_item_images.library_item_id and li.user_id = (select auth.uid())::text))
    with check (exists (select 1 from library_items li where li.id = library_item_images.library_item_id and li.user_id = (select auth.uid())::text));

-- ---------------------------------------------------------------------------
-- friendships: visible to either party; mutations go through functions but we
-- still allow a recipient to accept and either party to delete directly.
-- ---------------------------------------------------------------------------
create policy "friendships_select_party" on friendships
    for select using (
        requester_id = (select auth.uid())::text or recipient_id = (select auth.uid())::text
    );
create policy "friendships_update_recipient" on friendships
    for update using (recipient_id = (select auth.uid())::text)
            with check (recipient_id = (select auth.uid())::text);
create policy "friendships_delete_party" on friendships
    for delete using (
        requester_id = (select auth.uid())::text or recipient_id = (select auth.uid())::text
    );
-- Inserts are only performed by send_friend_request() (SECURITY DEFINER), so no
-- INSERT policy is granted to regular clients.

-- ---------------------------------------------------------------------------
-- user_profiles: a user reads/updates only their own row. Friend lookups by
-- email are resolved inside send_friend_request() (SECURITY DEFINER), and
-- friend display names are returned by the friends functions, so no broad
-- read access to other profiles is needed.
-- ---------------------------------------------------------------------------
create policy "user_profiles_select_own" on user_profiles
    for select using (user_id = (select auth.uid())::text);
create policy "user_profiles_update_own" on user_profiles
    for update using (user_id = (select auth.uid())::text)
            with check (user_id = (select auth.uid())::text);
