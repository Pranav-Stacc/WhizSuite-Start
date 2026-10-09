"""Enable FCM push on the EC2 API host from a Firebase service-account JSON.

Usage:
  python deploy/ops-enable-push.py path/to/whizsuite-*-adminsdk-*.json

Never prints the private key.
"""
from __future__ import annotations

import base64
import json
import subprocess
import sys
import time
from pathlib import Path

INSTANCE = "i-01b06d5c681c0907f"
PROFILE = "whizsuite"
REGION = "ap-south-1"
CHANNEL = "whizsuite_default"


def remote_script(payload_b64: str) -> str:
    return f"""#!/bin/bash
set -euo pipefail
cd /opt/whizsuite/deploy
echo '{payload_b64}' | base64 -d > /tmp/fcm-sa.json
python3 <<'PY'
import json
from pathlib import Path

sa = json.loads(Path("/tmp/fcm-sa.json").read_text())
env_path = Path(".env")
lines = env_path.read_text().splitlines()
keys = {{
    "PUSH_ENABLED": "true",
    "PUSH_ANDROID_CHANNEL_ID": "{CHANNEL}",
    "FCM_PROJECT_ID": sa["project_id"],
    "FCM_CLIENT_EMAIL": sa["client_email"],
    "FCM_PRIVATE_KEY": sa["private_key"].replace("\\n", "\\\\n"),
}}
drop = set(keys)
kept = [line for line in lines if line.split("=", 1)[0] not in drop]
for key, value in keys.items():
    if key == "FCM_PRIVATE_KEY":
        kept.append(f'{{key}}="{{value}}"')
    else:
        kept.append(f"{{key}}={{value}}")
env_path.write_text("\\n".join(kept) + "\\n")
print("updated", ", ".join(keys))
PY
rm -f /tmp/fcm-sa.json
echo '=== push flags ==='
grep -E '^(PUSH_|FCM_PROJECT|FCM_CLIENT)' .env
docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml up -d --force-recreate api
sleep 10
docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml ps api
docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml logs --tail 40 api
"""


def ssm_run(script: str, timeout: int = 180) -> dict:
    payload = {
        "commands": [
            "echo "
            + base64.b64encode(script.encode()).decode()
            + " | base64 -d > /tmp/ops-enable-push.sh && bash /tmp/ops-enable-push.sh"
        ]
    }
    path = Path.home() / "AppData/Local/Temp/ssm-enable-push.json"
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
    print("cid", cid)
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
        print("status", status)
        if status not in ("Pending", "InProgress", "Delayed"):
            break
        time.sleep(4)
    return json.loads(
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


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python deploy/ops-enable-push.py <service-account.json>", file=sys.stderr)
        return 2
    sa_path = Path(sys.argv[1])
    sa = json.loads(sa_path.read_text(encoding="utf-8"))
    print(f"project={sa['project_id']} client={sa['client_email']}")
    payload_b64 = base64.b64encode(sa_path.read_bytes()).decode()
    out = ssm_run(remote_script(payload_b64))
    stdout = out.get("StandardOutputContent", "")
    stderr = out.get("StandardErrorContent", "")
    for block in (stdout, stderr):
        if "BEGIN PRIVATE KEY" in block or "PRIVATE KEY" in block:
            print("<redacted>")
        else:
            print(block)
    print("STATUS", out.get("Status"))
    return 0 if out.get("Status") == "Success" else 1


if __name__ == "__main__":
    raise SystemExit(main())
