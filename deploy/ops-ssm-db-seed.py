"""Run Prisma migrate + seed on the EC2 production stack (creates demo@whizsuite.com)."""
from __future__ import annotations

import base64
import time
from pathlib import Path

import boto3

INSTANCE = "i-01b06d5c681c0907f"
PROFILE = "whizsuite"
REGION = "ap-south-1"

REMOTE = r"""#!/bin/bash
set -euo pipefail
cd /opt/whizsuite/deploy
echo "IMAGE_TAG=$(cat .image-tag)"
docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml --profile ops run --rm migrate
echo "=== demo user ==="
docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml exec -T postgres \
  sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT email FROM identity.users WHERE email IN ('"'"'demo@whizsuite.com'"'"','"'"'owner@demo.agency'"'"');"'
curl -sS "http://127.0.0.1:3001/api/health"; echo
"""


def main() -> int:
    ssm = boto3.Session(profile_name=PROFILE, region_name=REGION).client("ssm")
    payload = {
        "commands": [
            "echo "
            + base64.b64encode(REMOTE.encode()).decode()
            + " | base64 -d > /tmp/ops-db-seed.sh && bash /tmp/ops-db-seed.sh"
        ]
    }
    cid = ssm.send_command(
        InstanceIds=[INSTANCE],
        DocumentName="AWS-RunShellScript",
        Parameters=payload,
        TimeoutSeconds=600,
    )["Command"]["CommandId"]
    print("cid", cid)
    time.sleep(2)
    out: dict = {}
    for _ in range(80):
        try:
            out = ssm.get_command_invocation(CommandId=cid, InstanceId=INSTANCE)
        except ssm.exceptions.InvocationDoesNotExist:
            time.sleep(3)
            continue
        if out["Status"] not in ("Pending", "InProgress", "Delayed"):
            break
        time.sleep(5)
    if not out:
        print("no invocation result")
        return 1
    print("STATUS", out["Status"])
    print(out.get("StandardOutputContent", ""))
    err = out.get("StandardErrorContent") or ""
    if err:
        print("STDERR", err[-4000:])
    return 0 if out["Status"] == "Success" else 1


if __name__ == "__main__":
    raise SystemExit(main())
