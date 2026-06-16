-- Initial schema for Stitchbud, ported verbatim from the original Flyway
-- migration (backend/src/main/resources/db/migration/V1__initial_schema.sql).
-- Idempotent so it runs cleanly against a fresh Supabase database or one that
-- already holds data created by the former Spring Boot backend.

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
    description varchar(255),
    name varchar(255),
    notes varchar(255),
    pinterest_board_urls TEXT,
    recipe_text varchar(255),
    tags varchar(255),
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

create index if not exists idx_friendships_requester on friendships (requester_id);
create index if not exists idx_friendships_recipient on friendships (recipient_id);
create index if not exists idx_library_items_user_id on library_items (user_id);
create index if not exists idx_projects_user_id on projects (user_id);
create index if not exists idx_projects_user_updated on projects (user_id, updated_at);

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
    if not exists (select 1 from pg_constraint where conname = 'fk_row_counters_project') then
        alter table row_counters add constraint fk_row_counters_project
            foreign key (project_id) references projects on delete cascade;
    end if;
end $$;
