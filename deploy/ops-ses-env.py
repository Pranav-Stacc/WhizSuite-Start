"""Patch production API .env for SES SMTP on EC2 via SSM (profile whizsuite).

Requires env:
  SMTP_USER  — SES SMTP username (IAM access key id)
  SMTP_PASS  — SES SMTP password (derived from secret key)

Optional:
  RUN_MIGRATE=1  — run prisma migrate deploy in compose after restart
"""
from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import time
from pathlib import Path

INSTANCE = "i-01b06d5c681c0907f"
PROFILE = "whizsuite"
REGION = "ap-south-1"


def esc(value: str) -> str:
    return value.replace("'", "'\"'\"'")


def remote_script(smtp_user: str, smtp_pass: str, run_migrate: bool) -> str:
    migrate_block = ""
    if run_migrate:
        migrate_block = """
COMPOSE=(docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml)
"${COMPOSE[@]}" run --rm migrate
"""
    smtp_pass_b64 = base64.b64encode(smtp_pass.encode("utf-8")).decode("ascii")
    return f"""#!/bin/bash
set -euo pipefail
cd /opt/whizsuite/deploy
upsert() {{
  python3 - "$1" "$2" <<'PY'
import pathlib
import sys
key, value = sys.argv[1], sys.argv[2]
path = pathlib.Path(".env")
lines = path.read_text(encoding="utf-8").splitlines() if path.is_file() else []
out: list[str] = []
found = False
for line in lines:
    if line.startswith(key + "="):
        out.append(f"{{key}}={{value}}")
        found = True
    else:
        out.append(line)
if not found:
    out.append(f"{{key}}={{value}}")
path.write_text("\\n".join(out) + "\\n", encoding="utf-8")
PY
}}
SMTP_PASS="$(printf '%s' '{smtp_pass_b64}' | base64 -d)"
upsert EMAIL_PROVIDER 'ses-smtp'
upsert SMTP_HOST 'email-smtp.ap-south-1.amazonaws.com'
upsert SMTP_PORT '587'
upsert SMTP_SECURE 'false'
upsert SMTP_USER '{esc(smtp_user)}'
upsert SMTP_PASS "$SMTP_PASS"
upsert EMAIL_FROM 'WhizSuite <noreply@whizsuite.com>'
upsert EMAIL_LOGO_URL 'https://whizsuite.com/brand/logo-primary.png'
upsert NOTIFICATION_EMAIL_ENABLED 'true'
upsert WEB_APP_URL 'https://whizsuite.com'
echo '=== email env (redacted) ==='
grep -E '^(EMAIL_|SMTP_|NOTIFICATION_EMAIL|WEB_APP_URL)=' .env | sed -E 's/SMTP_PASS=.*/SMTP_PASS=***REDACTED***/'
COMPOSE=(docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml)
{migrate_block}
"${{COMPOSE[@]}}" up -d --force-recreate api
sleep 10
"${{COMPOSE[@]}}" ps api
"""


def ssm_run(script: str, timeout: int = 300) -> int:
    payload = {
        "commands": [
            "echo "
            + base64.b64encode(script.encode()).decode()
            + " | base64 -d > /tmp/ops-ses-env.sh && bash /tmp/ops-ses-env.sh && rm -f /tmp/ops-ses-env.sh"
        ]
    }
    path = Path.home() / "AppData/Local/Temp/ssm-ses-env.json"
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
            str(timeout),
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
    for _ in range(60):
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


def main() -> int:
    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASS", "").strip()
    if not user or not password:
        print("SMTP_USER and SMTP_PASS env vars are required", file=sys.stderr)
        return 1
    run_migrate = os.environ.get("RUN_MIGRATE", "1").strip() not in ("0", "false", "no")
    return ssm_run(remote_script(user, password, run_migrate))


if __name__ == "__main__":
    raise SystemExit(main())
