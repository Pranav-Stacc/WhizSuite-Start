-- Direct per-member permission grants/revocations layered on top of role permissions
CREATE TABLE "access"."member_permission_overrides" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "effect" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,

    CONSTRAINT "member_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_permission_overrides_organization_id_membership_id_idx" ON "access"."member_permission_overrides"("organization_id", "membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_permission_overrides_org_membership_permission_key" ON "access"."member_permission_overrides"("organization_id", "membership_id", "permission_id");

-- CreateIndex
CREATE INDEX "member_designations_organization_id_designation_id_idx" ON "access"."member_designations"("organization_id", "designation_id");

-- AddForeignKey
ALTER TABLE "access"."member_permission_overrides" ADD CONSTRAINT "member_permission_overrides_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "access"."organization_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access"."member_permission_overrides" ADD CONSTRAINT "member_permission_overrides_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "access"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
