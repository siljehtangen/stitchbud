-- Consolidated baseline schema for Stitchbud. This single migration supersedes
-- the original split migrations (initial schema, indexes, defaults, RLS,
-- functions/triggers, storage, api grants) and the follow-up fixes (text-column
-- widening, function search_path pinning, project_images->materials FK, storage
-- upload limits, private bucket). It reflects the final desired state and is
-- idempotent so it runs cleanly against a fresh Supabase database, a local
-- `supabase db reset`, or one that already holds data.

-- Supabase provisions the public schema by default, but recreate it defensively
-- so this migration also recovers a database where it was dropped.
create schema if not exists public;

-- ===========================================================================
-- Tables
-- ===========================================================================
create table if not exists friendships (
    created_at bigint not null,
    id bigserial not null,
    recipient_id varchar(255),
    requester_id varchar(255),
    status varchar(255) check (status in ('PENDING','ACCEPTED')),
    primary key (id)
);

create table if not exists library_items (
    circular_length_cm integer,
    fabric_length_cm integer,
    fabric_width_cm integer,
    yarn_amountg integer,
    yarn_amountm integer,
    created_at bigint not null,
    id bigserial not null,
    colors varchar(255),
    hook_size_mm varchar(255),
    item_type varchar(255) check (item_type in ('YARN','FABRIC','KNITTING_NEEDLE','CROCHET_HOOK')),
    name varchar(255),
    needle_size_mm varchar(255),
    user_id varchar(255),
    yarn_brand varchar(255),
    yarn_material varchar(255),
    primary key (id)
);

create table if not exists library_item_images (
    is_main boolean not null,
    id bigserial not null,
    library_item_id bigint,
    original_name varchar(255),
    stored_name varchar(255),
    primary key (id)
);

create table if not exists projects (
    is_public boolean not null,
    created_at bigint not null,
    end_date bigint,
    id bigserial not null,
    start_date bigint,
    updated_at bigint not null,
    category varchar(255) check (category in ('KNITTING','CROCHET','SEWING')),
    craft_details TEXT,
    description TEXT,
    name varchar(255),
    notes TEXT,
    pinterest_board_urls TEXT,
    recipe_text TEXT,
    tags TEXT,
    user_id varchar(255),
    primary key (id)
);

create table if not exists materials (
    id bigserial not null,
    project_id bigint,
    amount varchar(255),
    color varchar(255),
    color_hex varchar(255),
    item_type varchar(255),
    name varchar(255),
    type varchar(255),
    unit varchar(255),
    primary key (id)
);

create table if not exists pattern_grids (
    cols integer not null,
    rows integer not null,
    id bigserial not null,
    project_id bigint,
    cell_data TEXT,
    primary key (id)
);

create table if not exists project_files (
    id bigserial not null,
    project_id bigint,
    uploaded_at bigint not null,
    file_type varchar(255),
    mime_type varchar(255),
    original_name varchar(255),
    stored_name varchar(255),
    primary key (id)
);

create table if not exists project_images (
    is_main boolean not null,
    id bigserial not null,
    material_id bigint,
    project_id bigint,
    original_name varchar(255),
    section varchar(255),
    stored_name varchar(255),
    primary key (id)
);

create table if not exists row_counters (
    stitches_per_round integer not null,
    total_rounds integer not null,
    id bigserial not null,
    project_id bigint unique,
    checked_stitches TEXT,
    primary key (id)
);

create table if not exists user_profiles (
    updated_at bigint not null,
    display_name varchar(255),
    email varchar(255),
    user_id varchar(255) not null,
    primary key (user_id)
);

-- ===========================================================================
-- Foreign keys (guarded so re-runs are idempotent)
-- ===========================================================================
do $$ begin
    if not exists (select 1 from pg_constraint where conname = 'fk_library_item_images_library_item') then
        alter table library_item_images add constraint fk_library_item_images_library_item
            foreign key (library_item_id) references library_items on delete cascade;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'fk_materials_project') then
        alter table materials add constraint fk_materials_project
            foreign key (project_id) references projects on delete cascade;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'fk_pattern_grids_project') then
        alter table pattern_grids add constraint fk_pattern_grids_project
            foreign key (project_id) references projects on delete cascade;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'fk_project_files_project') then
        alter table project_files add constraint fk_project_files_project
            foreign key (project_id) references projects on delete cascade;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'fk_project_images_project') then
        alter table project_images add constraint fk_project_images_project
            foreign key (project_id) references projects on delete cascade;
    end if;
    -- on delete set null so an image row survives if its material is deleted.
    if not exists (select 1 from pg_constraint where conname = 'fk_project_images_material') then
        alter table project_images add constraint fk_project_images_material
            foreign key (material_id) references materials (id) on delete set null;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'fk_row_counters_project') then
        alter table row_counters add constraint fk_row_counters_project
            foreign key (project_id) references projects on delete cascade;
    end if;
end $$;

-- ===========================================================================
-- Indexes and uniqueness constraints
-- ===========================================================================
create index if not exists idx_friendships_requester on friendships (requester_id);
create index if not exists idx_friendships_recipient on friendships (recipient_id);
create index if not exists idx_library_items_user_id on library_items (user_id);
create index if not exists idx_projects_user_id on projects (user_id);
create index if not exists idx_projects_user_updated on projects (user_id, updated_at);
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
    if not exists (select 1 from pg_constraint where conname = 'uq_friendships_requester_recipient') then
        alter table friendships
            add constraint uq_friendships_requester_recipient unique (requester_id, recipient_id);
    end if;
end $$;

-- ===========================================================================
-- Defaults. Timestamps are Unix epoch milliseconds (bigint). search_path is
-- pinned on now_millis() to satisfy Supabase's Security Advisor.
-- ===========================================================================
create or replace function public.now_millis()
returns bigint
language sql
stable
set search_path = public
as $$
    select (extract(epoch from now()) * 1000)::bigint;
$$;

alter table projects alter column is_public set default false;
alter table projects alter column created_at set default public.now_millis();
alter table projects alter column updated_at set default public.now_millis();
alter table projects alter column description set default '';
alter table projects alter column tags set default '';
alter table projects alter column notes set default '';
alter table projects alter column recipe_text set default '';
alter table projects alter column pinterest_board_urls set default '[]';
alter table projects alter column craft_details set default '{}';

alter table materials alter column color set default '';
alter table materials alter column color_hex set default '#000000';
alter table materials alter column amount set default '';
alter table materials alter column unit set default 'g';

alter table pattern_grids alter column rows set default 10;
alter table pattern_grids alter column cols set default 10;
alter table pattern_grids alter column cell_data set default '[]';

alter table row_counters alter column stitches_per_round set default 0;
alter table row_counters alter column total_rounds set default 0;
alter table row_counters alter column checked_stitches set default '[]';

alter table project_images alter column is_main set default false;
alter table project_images alter column section set default 'cover';
alter table project_files alter column uploaded_at set default public.now_millis();
alter table project_files alter column file_type set default 'other';

alter table library_items alter column created_at set default public.now_millis();
alter table library_items alter column name set default '';
alter table library_item_images alter column is_main set default false;

alter table friendships alter column created_at set default public.now_millis();
alter table friendships alter column status set default 'PENDING';

alter table user_profiles alter column updated_at set default public.now_millis();

-- ===========================================================================
-- Row-Level Security. user_id columns hold the Supabase Auth UUID as text, so
-- we compare against auth.uid()::text. Friend access to public projects is
-- served by the SECURITY DEFINER functions below (so private columns can be
-- stripped), not by RLS policies.
-- ===========================================================================

-- Helper used by the friend-access functions and the storage read policy
-- (SECURITY DEFINER so it bypasses RLS on friendships and avoids recursion).
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

-- projects (owner-only; friend reads go through SECURITY DEFINER functions)
drop policy if exists "projects_select_own" on projects;
create policy "projects_select_own" on projects
    for select using (user_id = (select auth.uid())::text);
drop policy if exists "projects_insert_own" on projects;
create policy "projects_insert_own" on projects
    for insert with check (user_id = (select auth.uid())::text);
drop policy if exists "projects_update_own" on projects;
create policy "projects_update_own" on projects
    for update using (user_id = (select auth.uid())::text)
            with check (user_id = (select auth.uid())::text);
drop policy if exists "projects_delete_own" on projects;
create policy "projects_delete_own" on projects
    for delete using (user_id = (select auth.uid())::text);

-- project child tables: ownership inferred from the parent project
drop policy if exists "materials_owner" on materials;
create policy "materials_owner" on materials
    for all
    using (exists (select 1 from projects p where p.id = materials.project_id and p.user_id = (select auth.uid())::text))
    with check (exists (select 1 from projects p where p.id = materials.project_id and p.user_id = (select auth.uid())::text));

drop policy if exists "project_images_owner" on project_images;
create policy "project_images_owner" on project_images
    for all
    using (exists (select 1 from projects p where p.id = project_images.project_id and p.user_id = (select auth.uid())::text))
    with check (exists (select 1 from projects p where p.id = project_images.project_id and p.user_id = (select auth.uid())::text));

drop policy if exists "project_files_owner" on project_files;
create policy "project_files_owner" on project_files
    for all
    using (exists (select 1 from projects p where p.id = project_files.project_id and p.user_id = (select auth.uid())::text))
    with check (exists (select 1 from projects p where p.id = project_files.project_id and p.user_id = (select auth.uid())::text));

drop policy if exists "pattern_grids_owner" on pattern_grids;
create policy "pattern_grids_owner" on pattern_grids
    for all
    using (exists (select 1 from projects p where p.id = pattern_grids.project_id and p.user_id = (select auth.uid())::text))
    with check (exists (select 1 from projects p where p.id = pattern_grids.project_id and p.user_id = (select auth.uid())::text));

drop policy if exists "row_counters_owner" on row_counters;
create policy "row_counters_owner" on row_counters
    for all
    using (exists (select 1 from projects p where p.id = row_counters.project_id and p.user_id = (select auth.uid())::text))
    with check (exists (select 1 from projects p where p.id = row_counters.project_id and p.user_id = (select auth.uid())::text));

-- library
drop policy if exists "library_items_select_own" on library_items;
create policy "library_items_select_own" on library_items
    for select using (user_id = (select auth.uid())::text);
drop policy if exists "library_items_insert_own" on library_items;
create policy "library_items_insert_own" on library_items
    for insert with check (user_id = (select auth.uid())::text);
drop policy if exists "library_items_update_own" on library_items;
create policy "library_items_update_own" on library_items
    for update using (user_id = (select auth.uid())::text)
            with check (user_id = (select auth.uid())::text);
drop policy if exists "library_items_delete_own" on library_items;
create policy "library_items_delete_own" on library_items
    for delete using (user_id = (select auth.uid())::text);

drop policy if exists "library_item_images_owner" on library_item_images;
create policy "library_item_images_owner" on library_item_images
    for all
    using (exists (select 1 from library_items li where li.id = library_item_images.library_item_id and li.user_id = (select auth.uid())::text))
    with check (exists (select 1 from library_items li where li.id = library_item_images.library_item_id and li.user_id = (select auth.uid())::text));

-- friendships: visible to either party; recipient can accept, either party can delete.
-- Inserts are only performed by send_friend_request() (SECURITY DEFINER).
drop policy if exists "friendships_select_party" on friendships;
create policy "friendships_select_party" on friendships
    for select using (
        requester_id = (select auth.uid())::text or recipient_id = (select auth.uid())::text
    );
drop policy if exists "friendships_update_recipient" on friendships;
create policy "friendships_update_recipient" on friendships
    for update using (recipient_id = (select auth.uid())::text)
            with check (recipient_id = (select auth.uid())::text);
drop policy if exists "friendships_delete_party" on friendships;
create policy "friendships_delete_party" on friendships
    for delete using (
        requester_id = (select auth.uid())::text or recipient_id = (select auth.uid())::text
    );

-- user_profiles: a user reads/updates only their own row.
drop policy if exists "user_profiles_select_own" on user_profiles;
create policy "user_profiles_select_own" on user_profiles
    for select using (user_id = (select auth.uid())::text);
drop policy if exists "user_profiles_update_own" on user_profiles;
create policy "user_profiles_update_own" on user_profiles
    for update using (user_id = (select auth.uid())::text)
            with check (user_id = (select auth.uid())::text);

-- ===========================================================================
-- Profile sync: create/update user_profiles from auth.users.
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.user_profiles (user_id, email, display_name, updated_at)
    values (
        new.id::text,
        new.email,
        coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
        public.now_millis()
    )
    on conflict (user_id) do update
        set email = excluded.email,
            display_name = coalesce(excluded.display_name, public.user_profiles.display_name),
            updated_at = excluded.updated_at;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert or update of email, raw_user_meta_data on auth.users
    for each row execute function public.handle_new_user();

-- Backfill profiles for users that already exist.
insert into public.user_profiles (user_id, email, display_name, updated_at)
select u.id::text,
       u.email,
       coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
       public.now_millis()
from auth.users u
on conflict (user_id) do nothing;

-- ===========================================================================
-- Project creation side effects: every new project gets an empty row counter
-- and one default pattern grid.
-- ===========================================================================
create or replace function public.create_project_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.row_counters (project_id, stitches_per_round, total_rounds, checked_stitches)
    values (new.id, 0, 0, '[]');
    insert into public.pattern_grids (project_id, rows, cols, cell_data)
    values (new.id, 10, 10, '[]');
    return new;
end;
$$;

drop trigger if exists trg_project_defaults on projects;
create trigger trg_project_defaults
    after insert on projects
    for each row execute function public.create_project_defaults();

-- ===========================================================================
-- updated_at maintenance. A direct project edit bumps updated_at; changes to
-- child rows also bump the parent so the "recently updated" ordering stays
-- correct. search_path pinned to satisfy the Security Advisor.
-- ===========================================================================
create or replace function public.projects_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = public.now_millis();
    return new;
end;
$$;

drop trigger if exists trg_projects_updated_at on projects;
create trigger trg_projects_updated_at
    before update on projects
    for each row execute function public.projects_set_updated_at();

create or replace function public.touch_parent_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    pid bigint;
begin
    pid := coalesce(new.project_id, old.project_id);
    if pid is not null then
        update public.projects set updated_at = public.now_millis() where id = pid;
    end if;
    return coalesce(new, old);
end;
$$;

drop trigger if exists trg_touch_project_materials on materials;
create trigger trg_touch_project_materials       after insert or update or delete on materials       for each row execute function public.touch_parent_project();
drop trigger if exists trg_touch_project_images on project_images;
create trigger trg_touch_project_images          after insert or update or delete on project_images  for each row execute function public.touch_parent_project();
drop trigger if exists trg_touch_project_files on project_files;
create trigger trg_touch_project_files           after insert or update or delete on project_files   for each row execute function public.touch_parent_project();
drop trigger if exists trg_touch_project_pattern_grids on pattern_grids;
create trigger trg_touch_project_pattern_grids   after insert or update or delete on pattern_grids   for each row execute function public.touch_parent_project();
drop trigger if exists trg_touch_project_row_counters on row_counters;
create trigger trg_touch_project_row_counters    after insert or update or delete on row_counters    for each row execute function public.touch_parent_project();

-- ===========================================================================
-- Image limits and main-image promotion. Max 3 images per cover section / per
-- material / per library item; first image becomes main; deleting the main
-- promotes another. search_path pinned to satisfy the Security Advisor.
-- ===========================================================================
create or replace function public.project_image_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    cnt int;
begin
    select count(*) into cnt
    from public.project_images
    where project_id = new.project_id
      and section = new.section
      and material_id is not distinct from new.material_id;

    if cnt >= 3 then
        raise exception 'Maximum 3 % images allowed', new.section using errcode = 'P0001';
    end if;
    if cnt = 0 then
        new.is_main = true;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_project_image_limit on project_images;
create trigger trg_project_image_limit
    before insert on project_images
    for each row execute function public.project_image_before_insert();

create or replace function public.project_image_after_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if old.is_main then
        update public.project_images
        set is_main = true
        where id = (
            select id from public.project_images
            where project_id = old.project_id
              and section = old.section
              and material_id is not distinct from old.material_id
            order by id
            limit 1
        );
    end if;
    return old;
end;
$$;

drop trigger if exists trg_project_image_promote on project_images;
create trigger trg_project_image_promote
    after delete on project_images
    for each row execute function public.project_image_after_delete();

create or replace function public.library_image_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    cnt int;
begin
    select count(*) into cnt
    from public.library_item_images
    where library_item_id = new.library_item_id;

    if cnt >= 3 then
        raise exception 'Maximum 3 images per library item' using errcode = 'P0001';
    end if;
    if cnt = 0 then
        new.is_main = true;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_library_image_limit on library_item_images;
create trigger trg_library_image_limit
    before insert on library_item_images
    for each row execute function public.library_image_before_insert();

create or replace function public.library_image_after_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if old.is_main then
        update public.library_item_images
        set is_main = true
        where id = (
            select id from public.library_item_images
            where library_item_id = old.library_item_id
            order by id
            limit 1
        );
    end if;
    return old;
end;
$$;

drop trigger if exists trg_library_image_promote on library_item_images;
create trigger trg_library_image_promote
    after delete on library_item_images
    for each row execute function public.library_image_after_delete();

-- ===========================================================================
-- Friendships (SECURITY DEFINER so they resolve other users' profiles by
-- email/id without granting broad SELECT access on user_profiles).
-- ===========================================================================
create or replace function public.send_friend_request(target_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    uid text := (select auth.uid())::text;
    requester user_profiles;
    target user_profiles;
    existing friendships;
begin
    if uid is null then
        raise exception 'Not authenticated' using errcode = 'P0001';
    end if;

    select * into requester from user_profiles where user_id = uid;
    if requester.user_id is null then
        raise exception 'Profile not found. Please try again.' using errcode = 'P0001';
    end if;
    if lower(requester.email) = lower(target_email) then
        raise exception 'You cannot add yourself as a friend.' using errcode = 'P0001';
    end if;

    select * into target from user_profiles where lower(email) = lower(target_email) limit 1;
    if target.user_id is null then
        raise exception 'No user found with that email.' using errcode = 'P0001';
    end if;

    select * into existing from friendships
    where (requester_id = uid and recipient_id = target.user_id)
       or (requester_id = target.user_id and recipient_id = uid)
    limit 1;

    if existing.id is not null then
        if existing.status = 'ACCEPTED' then
            raise exception 'You are already friends.' using errcode = 'P0001';
        end if;
        if existing.requester_id = uid then
            raise exception 'You have already sent a friend request to this person.' using errcode = 'P0001';
        end if;
        -- The other person already sent us a request: auto-accept it.
        update friendships set status = 'ACCEPTED' where id = existing.id;
        return jsonb_build_object(
            'friendshipId', existing.id,
            'userId', target.user_id,
            'displayName', target.display_name,
            'email', target.email
        );
    end if;

    insert into friendships (requester_id, recipient_id, status, created_at)
    values (uid, target.user_id, 'PENDING', public.now_millis())
    returning * into existing;

    return jsonb_build_object(
        'friendshipId', existing.id,
        'userId', target.user_id,
        'displayName', target.display_name,
        'email', target.email
    );
end;
$$;

create or replace function public.accept_friend_request(p_friendship_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    uid text := (select auth.uid())::text;
    f friendships;
    requester user_profiles;
begin
    select * into f from friendships where id = p_friendship_id;
    if f.id is null then
        raise exception 'Friend request not found.' using errcode = 'P0001';
    end if;
    if f.recipient_id <> uid then
        raise exception 'You cannot accept this request.' using errcode = 'P0001';
    end if;
    if f.status = 'ACCEPTED' then
        raise exception 'Already accepted.' using errcode = 'P0001';
    end if;

    update friendships set status = 'ACCEPTED' where id = p_friendship_id;
    select * into requester from user_profiles where user_id = f.requester_id;

    return jsonb_build_object(
        'friendshipId', f.id,
        'userId', f.requester_id,
        'displayName', requester.display_name,
        'email', coalesce(requester.email, '')
    );
end;
$$;

create or replace function public.get_friends()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'friendshipId', f.id,
                'userId', friend_id,
                'displayName', p.display_name,
                'email', coalesce(p.email, '')
            )
        ),
        '[]'::jsonb
    )
    from (
        select f.id,
               case when f.requester_id = (select auth.uid())::text
                    then f.recipient_id else f.requester_id end as friend_id
        from friendships f
        where f.status = 'ACCEPTED'
          and ((select auth.uid())::text in (f.requester_id, f.recipient_id))
    ) f
    left join user_profiles p on p.user_id = f.friend_id;
$$;

create or replace function public.get_pending_requests()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'friendshipId', f.id,
                'requesterId', f.requester_id,
                'requesterDisplayName', p.display_name,
                'requesterEmail', coalesce(p.email, ''),
                'createdAt', f.created_at
            )
            order by f.created_at desc
        ),
        '[]'::jsonb
    )
    from friendships f
    left join user_profiles p on p.user_id = f.requester_id
    where f.recipient_id = (select auth.uid())::text
      and f.status = 'PENDING';
$$;

-- ===========================================================================
-- Friend project views. Returns the same nested, snake_case shape as a normal
-- PostgREST embed select. notes and recipe_text are stripped for friend views.
-- ===========================================================================
create or replace function public.project_to_json(p projects, include_notes boolean)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select to_jsonb(p)
        || jsonb_build_object(
            'notes', case when include_notes then p.notes else '' end,
            'recipe_text', case when include_notes then p.recipe_text else '' end,
            'materials', (select coalesce(jsonb_agg(to_jsonb(m) order by m.id), '[]'::jsonb) from materials m where m.project_id = p.id),
            'project_images', (select coalesce(jsonb_agg(to_jsonb(i) order by i.id), '[]'::jsonb) from project_images i where i.project_id = p.id),
            'project_files', (select coalesce(jsonb_agg(to_jsonb(fl) order by fl.id), '[]'::jsonb) from project_files fl where fl.project_id = p.id),
            'pattern_grids', (select coalesce(jsonb_agg(to_jsonb(g) order by g.id), '[]'::jsonb) from pattern_grids g where g.project_id = p.id),
            'row_counters', (select coalesce(jsonb_agg(to_jsonb(rc)), '[]'::jsonb) from row_counters rc where rc.project_id = p.id)
        );
$$;

create or replace function public.get_friend_projects(friend_user_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
    if not public.is_friend(friend_user_id) then
        raise exception 'You are not friends.' using errcode = 'P0001';
    end if;
    return (
        select coalesce(jsonb_agg(public.project_to_json(p, false) order by p.updated_at desc), '[]'::jsonb)
        from projects p
        where p.user_id = friend_user_id and p.is_public
    );
end;
$$;

create or replace function public.get_friend_project(friend_user_id text, p_project_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    p projects;
begin
    if not public.is_friend(friend_user_id) then
        raise exception 'You are not friends.' using errcode = 'P0001';
    end if;
    select * into p from projects where id = p_project_id;
    if p.id is null or p.user_id <> friend_user_id then
        raise exception 'Project not found.' using errcode = 'P0001';
    end if;
    if not p.is_public then
        raise exception 'This project is not public.' using errcode = 'P0001';
    end if;
    return public.project_to_json(p, false);
end;
$$;

-- ===========================================================================
-- Storage bucket and access policies. Private bucket served via short-lived
-- signed URLs minted at fetch time; the SELECT policy authorises signing for an
-- owner or an accepted friend. Uploads are size/type capped at the storage
-- layer.
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'stitchbud-files',
    'stitchbud-files',
    false,
    26214400, -- 25 MB
    array[
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream'
    ]
)
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- Read: owner or accepted friend, authenticated only.
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

-- ===========================================================================
-- PostgREST / supabase-js access grants. Tables created by raw SQL do not
-- inherit Supabase's default privileges; without these the client gets
-- "permission denied" even when RLS would allow the row.
-- ===========================================================================
grant usage on schema public to postgres, anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
    to authenticated, service_role;

grant usage, select on all sequences in schema public
    to authenticated, service_role;

grant execute on all functions in schema public
    to authenticated, service_role;

alter default privileges in schema public
    grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema public
    grant usage, select on sequences to authenticated, service_role;

alter default privileges in schema public
    grant execute on functions to authenticated, service_role;
