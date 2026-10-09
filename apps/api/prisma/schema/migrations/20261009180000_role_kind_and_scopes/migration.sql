-- AlterTable
ALTER TABLE "access"."roles" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'ACCESS',
ADD COLUMN "default_scope_types" JSONB NOT NULL DEFAULT '["ORGANIZATION"]';

-- CreateIndex
CREATE INDEX "roles_organization_id_kind_idx" ON "access"."roles"("organization_id", "kind");
