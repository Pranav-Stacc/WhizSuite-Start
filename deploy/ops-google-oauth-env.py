"""Patch live API Google Drive / Calendar OAuth env on EC2 via SSM.

Usage (client secret is never logged):
  set GOOGLE_DRIVE_CLIENT_SECRET=<web-client-secret>
  python deploy/ops-google-oauth-env.py

Optional:
  set GOOGLE_DRIVE_CLIENT_ID=9465040813-....apps.googleusercontent.com
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

DEFAULT_CLIENT_ID = (
    "9465040813-c2o7a0t2b86tqnareuods7evo5ge355v.apps.googleusercontent.com"
)
API_ORIGIN = "https://api.whizsuite.praanav.in"
DRIVE_REDIRECT = f"{API_ORIGIN}/api/v1/integrations/google-drive/callback"
CALENDAR_REDIRECT = f"{API_ORIGIN}/api/v1/integrations/google-calendar/callback"


def remote_script(client_id: str, client_secret: str) -> str:
    # Escape single quotes for bash
    def esc(value: str) -> str:
        return value.replace("'", "'\"'\"'")

    secret_line = (
        f"upsert GOOGLE_DRIVE_CLIENT_SECRET '{esc(client_secret)}'"
        if client_secret
        else "echo 'skip GOOGLE_DRIVE_CLIENT_SECRET (not provided)'"
    )
    return f"""#!/bin/bash
set -euo pipefail
cd /opt/whizsuite/deploy
upsert() {{
  local key="$1" value="$2"
  if grep -q "^${{key}}=" .env; then
    sed -i "s|^${{key}}=.*|${{key}}=${{value}}|" .env
  else
    printf '%s=%s\\n' "$key" "$value" >> .env
  fi
}}
upsert GOOGLE_DRIVE_CLIENT_ID '{esc(client_id)}'
{secret_line}
upsert GOOGLE_AUTH_ENABLED 'true'
upsert GOOGLE_OAUTH_CLIENT_IDS '{esc(client_id)}'
upsert GOOGLE_OAUTH_WEB_CLIENT_ID '{esc(client_id)}'
upsert GOOGLE_DRIVE_REDIRECT_URI '{esc(DRIVE_REDIRECT)}'
upsert GOOGLE_CALENDAR_REDIRECT_URI '{esc(CALENDAR_REDIRECT)}'
upsert WEB_APP_URL 'https://whizsuite.com'
echo '=== google oauth (redacted) ==='
grep -E '^GOOGLE_' .env | sed -E 's/CLIENT_SECRET=.*/CLIENT_SECRET=***REDACTED***/'
docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml up -d --force-recreate api
sleep 8
docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml ps api
"""


def ssm_run(script: str, timeout: int = 180) -> dict:
    payload = {
        "commands": [
            "echo "
            + base64.b64encode(script.encode()).decode()
            + " | base64 -d > /tmp/ops-google-oauth.sh && bash /tmp/ops-google-oauth.sh"
        ]
    }
    path = Path.home() / "AppData/Local/Temp/ssm-google-oauth.json"
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
    for _ in range(60):
        time.sleep(3)
        raw = subprocess.check_output(
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
            encoding="utf-8",
            errors="replace",
        )
        inv = json.loads(raw)
        status = inv.get("Status")
        if status in ("Success", "Failed", "Cancelled", "TimedOut"):
            return inv
    return {"Status": "TimedOut", "StandardOutputContent": "", "StandardErrorContent": ""}


def main() -> int:
    secret = os.environ.get("GOOGLE_DRIVE_CLIENT_SECRET", "").strip()
    client_id = os.environ.get("GOOGLE_DRIVE_CLIENT_ID", DEFAULT_CLIENT_ID).strip()
    if not secret:
        print(
            "GOOGLE_DRIVE_CLIENT_SECRET is not set. "
            "Set it from Google Cloud Console → Web client → Client secret, then re-run.",
            file=sys.stderr,
        )
        print(
            "Will still patch CLIENT_ID and REDIRECT_URI on the server if you pass "
            "--allow-missing-secret",
            file=sys.stderr,
        )
        if "--allow-missing-secret" not in sys.argv:
            return 1

    inv = ssm_run(remote_script(client_id, secret))
    out = inv.get("StandardOutputContent", "") or ""
    sys.stdout.buffer.write(out.encode("utf-8", errors="replace") + b"\n")
    err = inv.get("StandardErrorContent", "") or ""
    if err:
        print(err, file=sys.stderr)
    status = inv.get("Status")
    if status != "Success":
        print("SSM failed:", status, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
