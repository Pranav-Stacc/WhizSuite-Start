-- Calendar: project membership for events (shoots, meetings, etc.)
ALTER TABLE "calendar"."calendar_items"
  ADD COLUMN IF NOT EXISTS "project_id" UUID;

CREATE INDEX IF NOT EXISTS "calendar_items_organization_id_project_id_starts_at_idx"
  ON "calendar"."calendar_items"("organization_id", "project_id", "starts_at");

-- Tasks linked to a calendar event (e.g. shoot checklist)
ALTER TABLE "work"."tasks"
  ADD COLUMN IF NOT EXISTS "calendar_item_id" UUID;

CREATE INDEX IF NOT EXISTS "tasks_organization_id_calendar_item_id_idx"
  ON "work"."tasks"("organization_id", "calendar_item_id");

-- Media folders: project/shoot scope + tree
ALTER TABLE "media"."media_folders"
  ADD COLUMN IF NOT EXISTS "project_id" UUID,
  ADD COLUMN IF NOT EXISTS "calendar_item_id" UUID,
  ADD COLUMN IF NOT EXISTS "description" TEXT;

CREATE INDEX IF NOT EXISTS "media_folders_organization_id_client_id_idx"
  ON "media"."media_folders"("organization_id", "client_id");
CREATE INDEX IF NOT EXISTS "media_folders_organization_id_calendar_item_id_idx"
  ON "media"."media_folders"("organization_id", "calendar_item_id");

-- Media assets: shoot/project scope + search
ALTER TABLE "media"."media_assets"
  ADD COLUMN IF NOT EXISTS "project_id" UUID,
  ADD COLUMN IF NOT EXISTS "calendar_item_id" UUID,
  ADD COLUMN IF NOT EXISTS "search_text" TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "media_assets_organization_id_folder_id_idx"
  ON "media"."media_assets"("organization_id", "folder_id");
CREATE INDEX IF NOT EXISTS "media_assets_organization_id_calendar_item_id_idx"
  ON "media"."media_assets"("organization_id", "calendar_item_id");
CREATE INDEX IF NOT EXISTS "media_assets_organization_id_search_text_idx"
  ON "media"."media_assets"("organization_id", "search_text");

-- Tags
CREATE TABLE IF NOT EXISTS "media"."media_tags" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "media_tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "media_tags_organization_id_slug_key"
  ON "media"."media_tags"("organization_id", "slug");
CREATE INDEX IF NOT EXISTS "media_tags_organization_id_name_idx"
  ON "media"."media_tags"("organization_id", "name");

CREATE TABLE IF NOT EXISTS "media"."media_asset_tags" (
  "organization_id" UUID NOT NULL,
  "asset_id" UUID NOT NULL,
  "tag_id" UUID NOT NULL,
  CONSTRAINT "media_asset_tags_pkey" PRIMARY KEY ("asset_id", "tag_id")
);

CREATE INDEX IF NOT EXISTS "media_asset_tags_organization_id_tag_id_idx"
  ON "media"."media_asset_tags"("organization_id", "tag_id");

ALTER TABLE "media"."media_asset_tags"
  DROP CONSTRAINT IF EXISTS "media_asset_tags_asset_id_fkey",
  DROP CONSTRAINT IF EXISTS "media_asset_tags_tag_id_fkey";

ALTER TABLE "media"."media_asset_tags"
  ADD CONSTRAINT "media_asset_tags_asset_id_fkey"
    FOREIGN KEY ("asset_id") REFERENCES "media"."media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "media_asset_tags_tag_id_fkey"
    FOREIGN KEY ("tag_id") REFERENCES "media"."media_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Usage tracking (content, review, etc.)
CREATE TABLE IF NOT EXISTS "media"."media_usage_refs" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "asset_id" UUID NOT NULL,
  "subject_type" TEXT NOT NULL,
  "subject_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "media_usage_refs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "media_usage_refs_asset_id_subject_type_subject_id_key"
  ON "media"."media_usage_refs"("asset_id", "subject_type", "subject_id");
CREATE INDEX IF NOT EXISTS "media_usage_refs_organization_id_subject_type_subject_id_idx"
  ON "media"."media_usage_refs"("organization_id", "subject_type", "subject_id");

ALTER TABLE "media"."media_usage_refs"
  DROP CONSTRAINT IF EXISTS "media_usage_refs_asset_id_fkey";

ALTER TABLE "media"."media_usage_refs"
  ADD CONSTRAINT "media_usage_refs_asset_id_fkey"
    FOREIGN KEY ("asset_id") REFERENCES "media"."media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Folder self-relation (parent)
ALTER TABLE "media"."media_folders"
  DROP CONSTRAINT IF EXISTS "media_folders_parent_id_fkey";

ALTER TABLE "media"."media_folders"
  ADD CONSTRAINT "media_folders_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "media"."media_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
