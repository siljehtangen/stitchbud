-- Business logic that previously lived in the Spring Boot services, expressed
-- as Postgres triggers and SECURITY DEFINER functions so the React client can
-- talk to Supabase directly while keeping the same behaviour.

-- ===========================================================================
-- Profile sync: create/update user_profiles from auth.users (replaces the old
-- PUT /api/users/me + frontend usersApi.syncMe()).
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

-- Backfill profiles for users that already exist (preserves data on migration).
insert into public.user_profiles (user_id, email, display_name, updated_at)
select u.id::text,
       u.email,
       coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
       public.now_millis()
from auth.users u
on conflict (user_id) do nothing;

-- ===========================================================================
-- Project creation side effects: every new project gets an empty row counter
-- and one default pattern grid (replaces ProjectService.createProject()).
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
-- child rows also bump the parent so the "recently updated" ordering on the
-- dashboard stays correct (replaces ProjectService.touchAndSave()).
-- ===========================================================================
create or replace function public.projects_set_updated_at()
returns trigger
language plpgsql
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

create trigger trg_touch_project_materials       after insert or update or delete on materials       for each row execute function public.touch_parent_project();
create trigger trg_touch_project_images          after insert or update or delete on project_images  for each row execute function public.touch_parent_project();
create trigger trg_touch_project_files           after insert or update or delete on project_files   for each row execute function public.touch_parent_project();
create trigger trg_touch_project_pattern_grids   after insert or update or delete on pattern_grids   for each row execute function public.touch_parent_project();
create trigger trg_touch_project_row_counters    after insert or update or delete on row_counters    for each row execute function public.touch_parent_project();

-- ===========================================================================
-- Image limits and main-image promotion (replaces the doRegisterImage /
-- doDeleteImage logic). Max 3 images per cover section / per material / per
-- library item; first image becomes main; deleting the main promotes another.
-- ===========================================================================
create or replace function public.project_image_before_insert()
returns trigger
language plpgsql
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
-- Friendships (replaces FriendshipService). All read/mutation helpers run as
-- SECURITY DEFINER so they can resolve other users' profiles by email/id
-- without granting broad SELECT access on user_profiles.
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
-- PostgREST embed select so the frontend mapper handles both. notes and
-- recipe_text are stripped for friend views (replaces ProjectMapper
-- includeNotes = false).
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
