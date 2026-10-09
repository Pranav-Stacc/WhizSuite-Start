-- AlterTable: signature metadata + immutable signed PDF artifact
ALTER TABLE "finance"."contracts" ADD COLUMN IF NOT EXISTS "signature_name" TEXT;
ALTER TABLE "finance"."contracts" ADD COLUMN IF NOT EXISTS "signature_method" TEXT;
ALTER TABLE "finance"."contracts" ADD COLUMN IF NOT EXISTS "signed_storage_key" TEXT;
ALTER TABLE "finance"."contracts" ADD COLUMN IF NOT EXISTS "content_hash" TEXT;
ALTER TABLE "finance"."contracts" ADD COLUMN IF NOT EXISTS "signature_ip" TEXT;
ALTER TABLE "finance"."contracts" ADD COLUMN IF NOT EXISTS "signature_user_agent" TEXT;

-- Media project indexes for project ↔ asset linking
CREATE INDEX IF NOT EXISTS "media_assets_organization_id_project_id_idx" ON "media"."media_assets"("organization_id", "project_id");
CREATE INDEX IF NOT EXISTS "media_folders_organization_id_project_id_idx" ON "media"."media_folders"("organization_id", "project_id");
