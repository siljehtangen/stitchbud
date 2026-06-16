-- Foreign-key indexes and uniqueness constraints, ported verbatim from the
-- original Flyway migration (V2__add_indexes_and_constraints.sql).
-- Idempotent so it applies cleanly to fresh and pre-existing databases.

-- Indexes on foreign keys used by joins and cascading deletes.
create index if not exists idx_materials_project_id on materials (project_id);
create index if not exists idx_project_images_project_id on project_images (project_id);
create index if not exists idx_project_files_project_id on project_files (project_id);
create index if not exists idx_pattern_grids_project_id on pattern_grids (project_id);
create index if not exists idx_library_item_images_item_id on library_item_images (library_item_id);
create index if not exists idx_user_profiles_email on user_profiles (email);

-- A user's email must be unique so friend-request lookups resolve to a single account.
create unique index if not exists uq_user_profiles_email on user_profiles (lower(email)) where email is not null;

-- Prevent duplicate friendship rows for the same ordered pair.
do $$ begin
    if not exists (
        select 1 from pg_constraint where conname = 'uq_friendships_requester_recipient'
    ) then
        alter table friendships
            add constraint uq_friendships_requester_recipient unique (requester_id, recipient_id);
    end if;
end $$;
