"""Wipe production Postgres + Redis and re-migrate/seed via SSM (whizsuite profile).

DESTRUCTIVE: deletes all tenant data on the live API host.
"""
from __future__ import annotations

import base64
import json
import subprocess
import time
from pathlib import Path

INSTANCE = "i-01b06d5c681c0907f"
PROFILE = "whizsuite"
REGION = "ap-south-1"

REMOTE = r"""#!/bin/bash
set -euo pipefail
cd /opt/whizsuite/deploy
COMPOSE=(docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml)

echo '=== stopping api + migrate dependents ==='
"${COMPOSE[@]}" stop api || true

echo '=== wiping all non-system schemas (multi-schema Prisma) ==='
"${COMPOSE[@]}" exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'"'"'SQL'"'"'
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database() AND pid <> pg_backend_pid();

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT nspname
    FROM pg_namespace
    WHERE nspname NOT LIKE '"'"'pg_%'"'"'
      AND nspname <> '"'"'information_schema'"'"'
  LOOP
    EXECUTE format('"'"'DROP SCHEMA IF EXISTS %I CASCADE'"'"', r.nspname);
  END LOOP;
END $$;

CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO CURRENT_USER;
GRANT ALL ON SCHEMA public TO public;
SQL'

echo '=== flushing redis ==='
"${COMPOSE[@]}" exec -T redis redis-cli FLUSHALL || true

echo '=== migrate deploy + seed ==='
"${COMPOSE[@]}" run --rm migrate

echo '=== restart api ==='
"${COMPOSE[@]}" up -d api
sleep 8
"${COMPOSE[@]}" ps api
"${COMPOSE[@]}" logs --tail 30 api
echo '=== done: database wiped and reseeded ==='
"""


def main() -> int:
    payload = {
        "commands": [
            "echo "
            + base64.b64encode(REMOTE.encode()).decode()
            + " | base64 -d > /tmp/ops-db-reset.sh && bash /tmp/ops-db-reset.sh"
        ]
    }
    path = Path.home() / "AppData/Local/Temp/ssm-db-reset.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    cid = subprocess.check_output(
        [
            "aws",
            "ssm",
            "send-command",
            "--instance-ids",
            INSTANCE,
            "--document-name",
            "AWS-RunShellScript",
            "--timeout-seconds",
            "600",
            "--parameters",
            f"file://{path}",
            "--profile",
            PROFILE,
            "--region",
            REGION,
            "--query",
            "Command.CommandId",
            "--output",
            "text",
        ],
        text=True,
    ).strip()
    print("cid", cid)
    for _ in range(120):
        status = subprocess.check_output(
            [
                "aws",
                "ssm",
                "get-command-invocation",
                "--command-id",
                cid,
                "--instance-id",
                INSTANCE,
                "--profile",
                PROFILE,
                "--region",
                REGION,
                "--query",
                "Status",
                "--output",
                "text",
            ],
            text=True,
        ).strip()
        print("status", status)
        if status not in ("Pending", "InProgress", "Delayed"):
            break
        time.sleep(5)
    out = json.loads(
        subprocess.check_output(
            [
                "aws",
                "ssm",
                "get-command-invocation",
                "--command-id",
                cid,
                "--instance-id",
                INSTANCE,
                "--profile",
                PROFILE,
                "--region",
                REGION,
                "--output",
                "json",
            ],
            text=True,
        )
    )
    print(out.get("StandardOutputContent", ""))
    err = out.get("StandardErrorContent", "")
    if err:
        print("STDERR:", err[-4000:])
    print("STATUS", out.get("Status"))
    return 0 if out.get("Status") == "Success" else 1


if __name__ == "__main__":
    raise SystemExit(main())
