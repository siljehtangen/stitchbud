-- Friends + dashboard enhancements:
--   1. get_sent_requests()  – outgoing pending requests for the current user.
--   2. send_friend_request() – now reports PENDING vs auto-accepted ACCEPTED.
--   3. uq_friendships_pair    – block duplicate friendships in either direction.
--   4. get_dashboard_stats()  – single round-trip for all dashboard counts.

-- ---------------------------------------------------------------------------
-- 1. Outgoing pending friend requests (requester = current user).
-- ---------------------------------------------------------------------------
create or replace function public.get_sent_requests()
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
                'recipientId', f.recipient_id,
                'recipientDisplayName', p.display_name,
                'recipientEmail', coalesce(p.email, ''),
                'createdAt', f.created_at
            )
            order by f.created_at desc
        ),
        '[]'::jsonb
    )
    from friendships f
    left join user_profiles p on p.user_id = f.recipient_id
    where f.requester_id = (select auth.uid())::text
      and f.status = 'PENDING';
$$;

-- ---------------------------------------------------------------------------
-- 2. send_friend_request now reports whether the result is a brand-new PENDING
--    request or an auto-accepted friendship (when the other person had already
--    sent us a request). The frontend uses this to show the right confirmation.
-- ---------------------------------------------------------------------------
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
            'status', 'ACCEPTED',
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
        'status', 'PENDING',
        'friendshipId', existing.id,
        'userId', target.user_id,
        'displayName', target.display_name,
        'email', target.email
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Guard against two friendship rows existing between the same pair of users
--    regardless of direction (A->B and B->A). The existing
--    uq_friendships_requester_recipient only blocks an exact duplicate in the
--    same direction; this normalized index also blocks the reverse-direction
--    race where both people send a request at the same instant.
-- ---------------------------------------------------------------------------
create unique index if not exists uq_friendships_pair
    on friendships (least(requester_id, recipient_id), greatest(requester_id, recipient_id));

-- ---------------------------------------------------------------------------
-- 4. Single round-trip for the dashboard: project counts per category, library
--    counts per item type, and friend/request tallies for the current user.
--    SECURITY DEFINER bypasses RLS, so every sub-select is scoped to auth.uid().
-- ---------------------------------------------------------------------------
create or replace function public.get_dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    with uid as (select (select auth.uid())::text as id)
    select jsonb_build_object(
        'projects', jsonb_build_object(
            'KNITTING', (select count(*) from projects, uid where user_id = uid.id and category = 'KNITTING'),
            'CROCHET',  (select count(*) from projects, uid where user_id = uid.id and category = 'CROCHET'),
            'SEWING',   (select count(*) from projects, uid where user_id = uid.id and category = 'SEWING')
        ),
        'library', jsonb_build_object(
            'YARN',            (select count(*) from library_items, uid where user_id = uid.id and item_type = 'YARN'),
            'FABRIC',          (select count(*) from library_items, uid where user_id = uid.id and item_type = 'FABRIC'),
            'KNITTING_NEEDLE', (select count(*) from library_items, uid where user_id = uid.id and item_type = 'KNITTING_NEEDLE'),
            'CROCHET_HOOK',    (select count(*) from library_items, uid where user_id = uid.id and item_type = 'CROCHET_HOOK')
        ),
        'friends', (
            select count(*) from friendships f, uid
            where f.status = 'ACCEPTED' and uid.id in (f.requester_id, f.recipient_id)
        ),
        'sentRequests', (
            select count(*) from friendships f, uid
            where f.status = 'PENDING' and f.requester_id = uid.id
        ),
        'incomingRequests', (
            select count(*) from friendships f, uid
            where f.status = 'PENDING' and f.recipient_id = uid.id
        )
    );
$$;
