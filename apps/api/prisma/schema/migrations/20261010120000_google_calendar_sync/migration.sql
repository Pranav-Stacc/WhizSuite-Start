-- Google Calendar sync: per-event opt-in + org connection settings
ALTER TABLE "calendar"."calendar_items"
  ADD COLUMN IF NOT EXISTS "sync_to_google" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "external_event_id" TEXT,
  ADD COLUMN IF NOT EXISTS "external_calendar_id" TEXT;

CREATE INDEX IF NOT EXISTS "calendar_items_organization_id_sync_to_google_starts_at_idx"
  ON "calendar"."calendar_items"("organization_id", "sync_to_google", "starts_at");

CREATE UNIQUE INDEX IF NOT EXISTS "calendar_items_organization_id_external_event_id_key"
  ON "calendar"."calendar_items"("organization_id", "external_event_id");

CREATE TABLE IF NOT EXISTS "calendar"."calendar_connections" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "integration_connection_id" UUID NOT NULL,
  "external_calendar_id" TEXT NOT NULL DEFAULT 'primary',
  "sync_direction" TEXT NOT NULL DEFAULT 'OUT',
  "default_sync_new_events" BOOLEAN NOT NULL DEFAULT false,
  "last_synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "calendar_connections_integration_connection_id_key"
  ON "calendar"."calendar_connections"("integration_connection_id");

CREATE INDEX IF NOT EXISTS "calendar_connections_organization_id_idx"
  ON "calendar"."calendar_connections"("organization_id");
