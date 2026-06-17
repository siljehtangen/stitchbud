-- pgTAP tests for the Stitchbud schema, run by `supabase test db`.
-- These run as a superuser (RLS is bypassed) and focus on the database-side
-- business logic that replaced the Spring Boot services: object existence,
-- the project-defaults trigger, image limits / main promotion, and the
-- friend-request flow (auto-accept).

begin;
select plan(22);

-- Use fixed UUIDs so auth.uid() (which casts the JWT sub to uuid) is happy.
\set u1 '00000000-0000-0000-0000-000000000001'
\set u2 '00000000-0000-0000-0000-000000000002'

-- ── Object existence ───────────────────────────────────────────────────────
select has_table('public', 'projects', 'projects table exists');
select has_function('public', 'send_friend_request', ARRAY['text'], 'send_friend_request exists');
select has_function('public', 'get_friend_project', ARRAY['text', 'bigint'], 'get_friend_project exists');
select has_function('public', 'now_millis', 'now_millis exists');
select has_function('public', 'get_dashboard_stats', 'get_dashboard_stats exists');

-- ── Project creation side-effects (create_project_defaults trigger) ──────────
select lives_ok(
  $$insert into projects (id, user_id, name, category) values (90001, '00000000-0000-0000-0000-000000000001', 'Test', 'KNITTING')$$,
  'can insert a project'
);
select is(
  (select count(*)::int from row_counters where project_id = 90001),
  1,
  'project insert auto-creates a row counter'
);
select is(
  (select count(*)::int from pattern_grids where project_id = 90001),
  1,
  'project insert auto-creates a default pattern grid'
);
select is(
  (select created_at > 0 from projects where id = 90001),
  true,
  'created_at default is populated'
);

-- ── Image limit + main promotion (project_image triggers) ────────────────────
insert into project_images (id, project_id, section, stored_name, original_name, material_id)
values (91001, 90001, 'cover', 'https://x/1.jpg', '1.jpg', null);
insert into project_images (id, project_id, section, stored_name, original_name, material_id)
values (91002, 90001, 'cover', 'https://x/2.jpg', '2.jpg', null);
insert into project_images (id, project_id, section, stored_name, original_name, material_id)
values (91003, 90001, 'cover', 'https://x/3.jpg', '3.jpg', null);

select is(
  (select is_main from project_images where id = 91001),
  true,
  'first cover image is marked main'
);
select is(
  (select (count(*) filter (where is_main))::int from project_images where project_id = 90001 and section = 'cover'),
  1,
  'only one main cover image'
);
select throws_ok(
  $$insert into project_images (project_id, section, stored_name, original_name, material_id)
    values (90001, 'cover', 'https://x/4.jpg', '4.jpg', null)$$,
  'P0001',
  null,
  'rejects a 4th cover image'
);

delete from project_images where id = 91001;
select is(
  (select is_main from project_images where id = 91002),
  true,
  'main is promoted to the next image after deleting the main'
);

-- ── Friendship flow with auth context ────────────────────────────────────────
insert into user_profiles (user_id, email, display_name, updated_at)
values ('00000000-0000-0000-0000-000000000001', 'one@test.com', 'One', 0),
       ('00000000-0000-0000-0000-000000000002', 'two@test.com', 'Two', 0);

-- Act as user 1 and send a request to user 2.
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001')::text, true);
select is(
  (select send_friend_request('two@test.com') ->> 'status'),
  'PENDING',
  'sending a new request returns PENDING status'
);
select is(
  (select status from friendships
    where requester_id = '00000000-0000-0000-0000-000000000001'
      and recipient_id = '00000000-0000-0000-0000-000000000002'),
  'PENDING',
  'new friend request is PENDING'
);
select is(
  jsonb_array_length(get_sent_requests()),
  1,
  'requester sees one outgoing pending request'
);
select throws_ok(
  $$select send_friend_request('two@test.com')$$,
  'P0001',
  null,
  'cannot send a duplicate request'
);
select throws_ok(
  $$select send_friend_request('one@test.com')$$,
  'P0001',
  null,
  'cannot add yourself'
);

select throws_ok(
  $$select send_friend_request('nobody@example.com')$$,
  'P0001',
  null,
  'cannot send request to email without a Stitchbud account'
);

-- Act as user 2 and send back: should auto-accept the existing request.
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000002')::text, true);
select is(
  (select send_friend_request('one@test.com') ->> 'status'),
  'ACCEPTED',
  'reverse request auto-accepts and returns ACCEPTED status'
);
select is(
  (select status from friendships
    where requester_id = '00000000-0000-0000-0000-000000000001'
      and recipient_id = '00000000-0000-0000-0000-000000000002'),
  'ACCEPTED',
  'friendship is now ACCEPTED'
);
select is(
  (get_dashboard_stats() ->> 'friends')::int,
  1,
  'dashboard stats report one accepted friend'
);

select * from finish();
rollback;
