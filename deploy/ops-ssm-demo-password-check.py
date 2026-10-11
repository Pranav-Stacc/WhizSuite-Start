"""Inspect demo user password hash on production."""
from __future__ import annotations

import base64
import time

import boto3

INSTANCE = "i-01b06d5c681c0907f"
PROFILE = "whizsuite"
REGION = "ap-south-1"

REMOTE = r"""#!/bin/bash
set -euo pipefail
cd /opt/whizsuite/deploy
docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml exec -T postgres \
  sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT email, length(password_hash), left(password_hash, 29) FROM identity.users WHERE email = '"'"'owner@demo.agency'"'"';"'
"""


def main() -> int:
    ssm = boto3.Session(profile_name=PROFILE, region_name=REGION).client("ssm")
    cid = ssm.send_command(
        InstanceIds=[INSTANCE],
        DocumentName="AWS-RunShellScript",
        Parameters={
            "commands": [
                "echo "
                + base64.b64encode(REMOTE.encode()).decode()
                + " | base64 -d | bash"
            ]
        },
        TimeoutSeconds=60,
    )["Command"]["CommandId"]
    time.sleep(5)
    out = ssm.get_command_invocation(CommandId=cid, InstanceId=INSTANCE)
    print(out.get("StandardOutputContent", ""))
    print(out.get("StandardErrorContent", ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
