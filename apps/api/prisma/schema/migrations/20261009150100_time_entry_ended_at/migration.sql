-- Finished entries always carry an end time; a NULL "ended_at" now marks a running timer.
UPDATE "time"."time_entries"
SET "ended_at" = "started_at" + make_interval(mins => "minutes")
WHERE "ended_at" IS NULL;

-- CreateIndex
CREATE INDEX "time_entries_organization_id_membership_id_ended_at_idx" ON "time"."time_entries"("organization_id", "membership_id", "ended_at");
