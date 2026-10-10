-- Member employment classification and HR document records.
ALTER TABLE "access"."organization_memberships"
  ADD COLUMN IF NOT EXISTS "employment_type" TEXT;

CREATE TABLE IF NOT EXISTS "access"."member_documents" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "membership_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "template_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "member_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "member_documents_organization_id_membership_id_idx"
  ON "access"."member_documents"("organization_id", "membership_id");

ALTER TABLE "access"."member_documents"
  ADD CONSTRAINT "member_documents_membership_id_fkey"
  FOREIGN KEY ("membership_id") REFERENCES "access"."organization_memberships"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
