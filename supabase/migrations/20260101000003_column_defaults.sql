-- Column defaults so the React client can insert rows directly (the former
-- Spring Boot entities supplied these defaults in Java). Timestamps are Unix
-- epoch milliseconds (bigint), matching the original data model.

-- Returns the current time as epoch milliseconds, the timestamp format used
-- across every table in this schema.
create or replace function public.now_millis()
returns bigint
language sql
stable
as $$
    select (extract(epoch from now()) * 1000)::bigint;
$$;

-- projects
alter table projects alter column is_public set default false;
alter table projects alter column created_at set default public.now_millis();
alter table projects alter column updated_at set default public.now_millis();
alter table projects alter column description set default '';
alter table projects alter column tags set default '';
alter table projects alter column notes set default '';
alter table projects alter column recipe_text set default '';
alter table projects alter column pinterest_board_urls set default '[]';
alter table projects alter column craft_details set default '{}';

-- materials
alter table materials alter column color set default '';
alter table materials alter column color_hex set default '#000000';
alter table materials alter column amount set default '';
alter table materials alter column unit set default 'g';

-- pattern_grids
alter table pattern_grids alter column rows set default 10;
alter table pattern_grids alter column cols set default 10;
alter table pattern_grids alter column cell_data set default '[]';

-- row_counters
alter table row_counters alter column stitches_per_round set default 0;
alter table row_counters alter column total_rounds set default 0;
alter table row_counters alter column checked_stitches set default '[]';

-- project_images / project_files
alter table project_images alter column is_main set default false;
alter table project_images alter column section set default 'cover';
alter table project_files alter column uploaded_at set default public.now_millis();
alter table project_files alter column file_type set default 'other';

-- library_items / library_item_images
alter table library_items alter column created_at set default public.now_millis();
alter table library_items alter column name set default '';
alter table library_item_images alter column is_main set default false;

-- friendships
alter table friendships alter column created_at set default public.now_millis();
alter table friendships alter column status set default 'PENDING';

-- user_profiles
alter table user_profiles alter column updated_at set default public.now_millis();
