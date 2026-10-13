-- Keeps test@gmail.com and their org membership(s); removes all other users and tenant data.
BEGIN;

DO $$
DECLARE
  keeper_email constant text := 'test@gmail.com';
  keep_user uuid;
  keep_orgs uuid[];
  r RECORD;
  excluded text[] := ARRAY[
    'permissions',
    'plans',
    'plan_versions',
    'plan_prices',
    'plan_entitlements',
    'integration_providers',
    'organizations'
  ];
BEGIN
  SELECT id INTO keep_user
  FROM identity.users
  WHERE lower(email) = lower(keeper_email);

  IF keep_user IS NULL THEN
    RAISE EXCEPTION 'Keeper user % not found', keeper_email;
  END IF;

  SELECT coalesce(array_agg(DISTINCT organization_id), '{}')
  INTO keep_orgs
  FROM access.organization_memberships
  WHERE user_id = keep_user;

  IF array_length(keep_orgs, 1) IS NULL THEN
    RAISE EXCEPTION 'Keeper user has no organization memberships';
  END IF;

  DELETE FROM identity.sessions WHERE user_id IS DISTINCT FROM keep_user;
  DELETE FROM identity.auth_email_tokens WHERE user_id IS DISTINCT FROM keep_user;
  DELETE FROM identity.oauth_accounts WHERE user_id IS DISTINCT FROM keep_user;
  DELETE FROM identity.mfa_factors WHERE user_id IS DISTINCT FROM keep_user;
  DELETE FROM identity.user_credentials WHERE user_id IS DISTINCT FROM keep_user;

  FOR r IN
    SELECT c.table_schema AS schema_name, c.table_name AS table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.column_name = 'organization_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
      AND NOT (c.table_name = ANY (excluded))
  LOOP
    EXECUTE format(
      'DELETE FROM %I.%I WHERE organization_id IS NOT NULL AND organization_id <> ALL ($1)',
      r.schema_name,
      r.table_name
    ) USING keep_orgs;
  END LOOP;

  DELETE FROM access.organization_memberships
  WHERE user_id IS DISTINCT FROM keep_user;

  DELETE FROM tenancy.organizations
  WHERE id <> ALL (keep_orgs);

  DELETE FROM identity.users
  WHERE id IS DISTINCT FROM keep_user;

  RAISE NOTICE 'Purged; kept user %', keeper_email;
END $$;

COMMIT;
