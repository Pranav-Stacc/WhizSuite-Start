-- AlterTable
ALTER TABLE "workflow"."workflow_definitions" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requires_client_approval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sla_hours" INTEGER,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddCheckConstraint
ALTER TABLE "workflow"."workflow_definitions" ADD CONSTRAINT "workflow_definitions_sla_hours_positive" CHECK ("sla_hours" IS NULL OR "sla_hours" > 0);
