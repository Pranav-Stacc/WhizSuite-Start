ALTER TABLE "calendar"."calendar_connections"
  ADD COLUMN IF NOT EXISTS "sync_types" JSONB NOT NULL DEFAULT '{"meetings":true,"shoots":true,"tasks":false,"posts":false}'::jsonb;
