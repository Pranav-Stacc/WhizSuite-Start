"""Run production deploy on EC2 via SSM (profile whizsuite)."""
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
TAG = sys.argv[1] if len(sys.argv) > 1 else "67765dd"

SCRIPT = f"""#!/bin/bash
set -eu
TAG={TAG}
REGISTRY=508193318963.dkr.ecr.ap-south-1.amazonaws.com
cd /opt/whizsuite
export HOME=/root
git config --global --add safe.directory /opt/whizsuite
git remote set-url origin https://github.com/Pranav-Stacc/WhizSuite-Start.git
git -C /opt/whizsuite fetch origin main --depth=1
git -C /opt/whizsuite checkout -f "$TAG"
export DOCKER_CONFIG=/tmp/docker-deploy
mkdir -p "$DOCKER_CONFIG"
printf '{{}}' > "$DOCKER_CONFIG/config.json"
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin "$REGISTRY"
docker build -f apps/api/Dockerfile -t "$REGISTRY/whizsuite-api:$TAG" .
docker push "$REGISTRY/whizsuite-api:$TAG"
docker build -f apps/agent/Dockerfile -t "$REGISTRY/whizsuite-agent:$TAG" apps/agent
docker push "$REGISTRY/whizsuite-agent:$TAG"
cd deploy
bash deploy.sh "$TAG"
"""

B64 = base64.b64encode(SCRIPT.encode("utf-8")).decode("ascii")
REMOTE = (
    f"echo {B64} | base64 -d > /tmp/whiz-deploy.sh && "
    "chmod +x /tmp/whiz-deploy.sh && bash /tmp/whiz-deploy.sh"
)


def main() -> int:
    payload = {"commands": [REMOTE]}
    path = Path.home() / "AppData/Local/Temp/ssm-deploy-remote.json"
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
            "3600",
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
        time.sleep(15)
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
    print(out[-8000:] if len(out) > 8000 else out)
    return 0 if status == "Success" else 1


if __name__ == "__main__":
    raise SystemExit(main())
