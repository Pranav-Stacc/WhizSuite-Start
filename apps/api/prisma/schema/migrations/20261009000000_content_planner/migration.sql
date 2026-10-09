-- AlterTable
ALTER TABLE "social"."content_items" ADD COLUMN     "cta_url" TEXT,
ADD COLUMN     "grid_position" INTEGER,
ADD COLUMN     "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "scheduled_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "social"."content_media" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "content_item_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_media_organization_id_media_asset_id_idx" ON "social"."content_media"("organization_id", "media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_media_content_item_id_position_key" ON "social"."content_media"("content_item_id", "position");

-- CreateIndex
CREATE INDEX "content_items_organization_id_client_id_scheduled_at_idx" ON "social"."content_items"("organization_id", "client_id", "scheduled_at");

-- AddForeignKey
ALTER TABLE "social"."content_media" ADD CONSTRAINT "content_media_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "social"."content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
