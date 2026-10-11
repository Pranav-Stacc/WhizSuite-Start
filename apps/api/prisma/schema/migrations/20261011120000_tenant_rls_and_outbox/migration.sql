-- Outbox delivery scheduling
ALTER TABLE shared.outbox_events
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE shared.outbox_events
SET next_attempt_at = created_at
WHERE next_attempt_at IS NULL;

DROP INDEX IF EXISTS shared."outbox_events_status_created_at_idx";
CREATE INDEX IF NOT EXISTS outbox_events_status_next_attempt_at_idx
  ON shared.outbox_events (status, next_attempt_at);

-- PostgreSQL RLS: enforce tenant isolation when app.current_org_id is set (see Prisma tenant extension).
DO $$
DECLARE
  r RECORD;
  policy_name TEXT;
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE column_name = 'organization_id'
      AND table_schema NOT IN ('pg_catalog', 'information_schema', 'public')
  LOOP
    policy_name := r.table_name || '_tenant_isolation';
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.table_schema, r.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.table_schema, r.table_name);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = r.table_schema
        AND tablename = r.table_name
        AND policyname = policy_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I USING (
          current_setting(''app.current_org_id'', true) IS NULL
          OR current_setting(''app.current_org_id'', true) = ''''
          OR organization_id::text = current_setting(''app.current_org_id'', true)
        ) WITH CHECK (
          current_setting(''app.current_org_id'', true) IS NULL
          OR current_setting(''app.current_org_id'', true) = ''''
          OR organization_id::text = current_setting(''app.current_org_id'', true)
        )',
        policy_name,
        r.table_schema,
        r.table_name
      );
    END IF;
  END LOOP;
END $$;
