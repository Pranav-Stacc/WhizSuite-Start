"""Patch live API CORS / WEB_APP_URL on EC2 via SSM (whizsuite profile)."""
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
upsert() {
  local key="$1" value="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}
upsert CORS_ORIGINS 'https://whizsuite.com,https://www.whizsuite.com,https://*.whizsuite.com,https://whizsuite.praanav.in,https://www.whizsuite.praanav.in,https://*.whizsuite.praanav.in,http://localhost:3000'
upsert WEB_APP_URL 'https://whizsuite.com'
echo Updated:
grep -E '^(CORS_ORIGINS|WEB_APP_URL|API_DOMAIN|COOKIE_DOMAIN)=' .env
"""


def main() -> int:
    payload = {
        "commands": [
            "echo "
            + base64.b64encode(REMOTE.encode()).decode()
            + " | base64 -d > /tmp/ops-update-cors-env.sh && bash /tmp/ops-update-cors-env.sh"
        ]
    }
    path = Path.home() / "AppData/Local/Temp/ssm-cors.json"
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
            "120",
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
    for _ in range(40):
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
        time.sleep(3)
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
    print(out.get("StandardErrorContent", ""))
    print("STATUS", out.get("Status"))
    return 0 if out.get("Status") == "Success" else 1


if __name__ == "__main__":
    raise SystemExit(main())
