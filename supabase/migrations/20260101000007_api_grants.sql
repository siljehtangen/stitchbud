-- PostgREST / supabase-js access grants. Tables created by raw SQL migrations do
-- not automatically inherit Supabase's default privileges; without these grants
-- the client receives "permission denied" even when RLS would allow the row.

grant usage on schema public to postgres, anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
    to authenticated, service_role;

grant usage, select on all sequences in schema public
    to authenticated, service_role;

grant execute on all functions in schema public
    to authenticated, service_role;

-- Future tables/sequences/functions created in public inherit the same grants.
alter default privileges in schema public
    grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema public
    grant usage, select on sequences to authenticated, service_role;

alter default privileges in schema public
    grant execute on functions to authenticated, service_role;
