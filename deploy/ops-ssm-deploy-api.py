"""Build API/agent images on EC2 and run deploy.sh via SSM (whizsuite profile)."""
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
REGISTRY = "508193318963.dkr.ecr.ap-south-1.amazonaws.com"
REPO = "https://github.com/Pranav-Stacc/WhizSuite-Start.git"


def remote_script(tag: str) -> str:
    return f"""#!/bin/bash
set -euo pipefail
export HOME=/root
export GIT_CONFIG_GLOBAL=/root/.gitconfig
git config --global --add safe.directory /opt/whizsuite
TAG={tag}
APP=/opt/whizsuite
cd "$APP"
git remote set-url origin {REPO}
git fetch origin main
git checkout -f "$TAG"
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin {REGISTRY}
docker build -f apps/api/Dockerfile -t {REGISTRY}/whizsuite-api:$TAG .
docker push {REGISTRY}/whizsuite-api:$TAG
docker build -f apps/agent/Dockerfile -t {REGISTRY}/whizsuite-agent:$TAG apps/agent
docker push {REGISTRY}/whizsuite-agent:$TAG
cd deploy
bash deploy.sh "$TAG"
echo '=== deploy complete ==='
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tag", required=True, help="Git ref or short SHA to deploy")
    args = parser.parse_args()
    script = remote_script(args.tag)
    payload = {
        "commands": [
            "echo "
            + base64.b64encode(script.encode()).decode()
            + " | base64 -d > /tmp/ops-deploy-api.sh && bash /tmp/ops-deploy-api.sh"
        ]
    }
    path = Path.home() / "AppData/Local/Temp/ssm-deploy-api.json"
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
    for _ in range(240):
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
