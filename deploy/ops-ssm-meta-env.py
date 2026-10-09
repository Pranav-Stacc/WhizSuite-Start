"""Set Meta Instagram OAuth env on EC2 + restart API (whizsuite profile)."""
from __future__ import annotations

import base64
import json
import subprocess
import time
from pathlib import Path

INSTANCE = "i-01b06d5c681c0907f"
PROFILE = "whizsuite"
REGION = "ap-south-1"

# Values injected at runtime via env / argv — do not hardcode secrets in git.
# This script reads META_APP_SECRET from the process environment.

REMOTE_TEMPLATE = r"""#!/bin/bash
set -euo pipefail
cd /opt/whizsuite/deploy
upsert() {
  local key="$1" value="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}
upsert META_APP_ID '__META_APP_ID__'
upsert META_APP_SECRET '__META_APP_SECRET__'
upsert META_REDIRECT_URI '__META_REDIRECT_URI__'
upsert META_GRAPH_API_VERSION '__META_GRAPH_API_VERSION__'
upsert WEB_APP_URL 'https://whizsuite.com'
echo Updated Meta env:
grep -E '^(META_APP_ID|META_REDIRECT_URI|META_GRAPH_API_VERSION|WEB_APP_URL)=' .env
grep -E '^META_APP_SECRET=' .env | sed 's/=.*/=***redacted***/'
COMPOSE=(docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml)
"${COMPOSE[@]}" up -d api
"${COMPOSE[@]}" ps api
"""


def main() -> int:
    import os

    app_id = os.environ.get("META_APP_ID", "1487656058918587")
    secret = os.environ.get("META_APP_SECRET", "")
    redirect = os.environ.get(
        "META_REDIRECT_URI",
        "https://api.whizsuite.praanav.in/api/platforms/callback",
    )
    version = os.environ.get("META_GRAPH_API_VERSION", "v21.0")
    if not secret:
        print("META_APP_SECRET env required")
        return 1

    remote = (
        REMOTE_TEMPLATE.replace("__META_APP_ID__", app_id)
        .replace("__META_APP_SECRET__", secret)
        .replace("__META_REDIRECT_URI__", redirect)
        .replace("__META_GRAPH_API_VERSION__", version)
    )
    payload = {
        "commands": [
            "echo "
            + base64.b64encode(remote.encode()).decode()
            + " | base64 -d > /tmp/ops-meta-env.sh && bash /tmp/ops-meta-env.sh && rm -f /tmp/ops-meta-env.sh"
        ]
    }
    path = Path.home() / "AppData/Local/Temp/ssm-meta-env.json"
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
            "180",
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
    for _ in range(48):
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
