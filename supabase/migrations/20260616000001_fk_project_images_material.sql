-- Add missing foreign key from project_images.material_id to materials.id.
-- on delete set null so the image row survives if the material is deleted
-- (the application also deletes material images explicitly, but this is a
-- safety net for direct DB operations).

alter table project_images
    add constraint fk_project_images_material
    foreign key (material_id) references materials (id) on delete set null;
