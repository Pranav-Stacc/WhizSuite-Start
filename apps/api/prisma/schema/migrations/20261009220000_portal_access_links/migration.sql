-- Shareable client portal access links (InvitationLink) — scope, access mode, status.
ALTER TABLE "invitations"."invitation_links"
  ADD COLUMN IF NOT EXISTS "scope_payload" JSONB,
  ADD COLUMN IF NOT EXISTS "access_mode" TEXT NOT NULL DEFAULT 'TEMPORARY',
  ADD COLUMN IF NOT EXISTS "membership_ttl_hours" INTEGER,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "created_by_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Drop the placeholder default once column exists for future inserts (app always sets created_by_id).
ALTER TABLE "invitations"."invitation_links"
  ALTER COLUMN "created_by_id" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "invitation_links_token_hash_key"
  ON "invitations"."invitation_links"("token_hash");

DROP INDEX IF EXISTS "invitations"."invitation_links_organization_id_idx";
CREATE INDEX IF NOT EXISTS "invitation_links_organization_id_status_idx"
  ON "invitations"."invitation_links"("organization_id", "status");
