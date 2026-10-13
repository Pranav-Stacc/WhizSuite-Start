"""Purge production tenant data except one user (default test@gmail.com) via SSM.

DESTRUCTIVE — run only on production with explicit intent.
"""
from __future__ import annotations

import argparse
import base64
import json
import subprocess
import sys
import time
from pathlib import Path

INSTANCE = "i-01b06d5c681c0907f"
PROFILE = "whizsuite"
REGION = "ap-south-1"
ROOT = Path(__file__).resolve().parents[1]
SQL_FILE = Path(__file__).resolve().parent / "sql" / "purge-except-user.sql"


def remote_script(sql_b64: str) -> str:
    return f"""#!/bin/bash
set -euo pipefail
git config --global --add safe.directory /opt/whizsuite 2>/dev/null || true
cd /opt/whizsuite/deploy
COMPOSE=(docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml)
echo "{sql_b64}" | base64 -d > /tmp/purge-except-user.sql
"${{COMPOSE[@]}}" stop api || true
cat /tmp/purge-except-user.sql | "${{COMPOSE[@]}}" exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'
"${{COMPOSE[@]}}" exec -T redis redis-cli FLUSHALL || true
"${{COMPOSE[@]}}" up -d api
sleep 6
"${{COMPOSE[@]}}" exec -T postgres psql -U whizsuite -d whizsuite -tAc "SELECT email FROM identity.users ORDER BY 1"
echo '=== purge complete ==='
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--email",
        default="test@gmail.com",
        help="User email to keep (SQL file must match; edit sql if changing)",
    )
    args = parser.parse_args()
    if args.email.lower() != "test@gmail.com":
        print("Only test@gmail.com is wired in deploy/sql/purge-except-user.sql", file=sys.stderr)
        return 2
    if not SQL_FILE.is_file():
        print(f"Missing {SQL_FILE}", file=sys.stderr)
        return 2
    sql_b64 = base64.b64encode(SQL_FILE.read_bytes()).decode("ascii")
    script = remote_script(sql_b64)
    payload = {
        "commands": [
            "echo "
            + base64.b64encode(script.encode()).decode()
            + " | base64 -d > /tmp/ops-purge.sh && bash /tmp/ops-purge.sh"
        ]
    }
    path = Path.home() / "AppData/Local/Temp/ssm-purge-except-user.json"
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
            "900",
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
    print("ssm command id:", cid)
    status = "Pending"
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
        if status not in ("Pending", "InProgress", "Delayed"):
            break
        time.sleep(5)
    out = subprocess.check_output(
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
            "[Status,StandardOutputContent,StandardErrorContent]",
            "--output",
            "text",
        ],
        text=True,
    )
    print(out)
    return 0 if status == "Success" else 1


if __name__ == "__main__":
    raise SystemExit(main())
