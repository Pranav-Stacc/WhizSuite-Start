-- Tasks may exist without a project (inbox / personal work), like Asana My Tasks / Linear unscoped issues.
ALTER TABLE "work"."tasks" DROP CONSTRAINT IF EXISTS "tasks_project_id_fkey";

ALTER TABLE "work"."tasks" ALTER COLUMN "project_id" DROP NOT NULL;

ALTER TABLE "work"."tasks" ADD COLUMN IF NOT EXISTS "client_id" UUID;

-- Preserve client linkage when the project is later removed.
UPDATE "work"."tasks" AS t
SET "client_id" = p."client_id"
FROM "work"."projects" AS p
WHERE t."project_id" = p."id"
  AND t."client_id" IS NULL;

ALTER TABLE "work"."tasks"
  ADD CONSTRAINT "tasks_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "work"."projects"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "tasks_organization_id_client_id_status_idx"
  ON "work"."tasks"("organization_id", "client_id", "status");
