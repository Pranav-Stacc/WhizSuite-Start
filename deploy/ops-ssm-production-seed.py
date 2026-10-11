"""Upload latest prisma seed from this checkout and run migrate+seed on production EC2."""
from __future__ import annotations

import base64
import time
from pathlib import Path

import boto3

INSTANCE = "i-01b06d5c681c0907f"
PROFILE = "whizsuite"
REGION = "ap-south-1"
REPO_ROOT = Path(__file__).resolve().parents[1]
SEED_DIR = REPO_ROOT / "apps" / "api" / "prisma"


def b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def remote_script(rich_b64: str, runner_b64: str) -> str:
    return f"""#!/bin/bash
set -euo pipefail
mkdir -p /tmp/whizsuite-seed
echo '{rich_b64}' | base64 -d > /tmp/whizsuite-seed/seed-demo-rich.ts
echo '{runner_b64}' | base64 -d > /tmp/whizsuite-seed/seed-run-rich.ts
cd /opt/whizsuite/deploy
echo "IMAGE_TAG=$(tr -d '\\r' < .image-tag | head -1)"
docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml run --rm \\
  -v /tmp/whizsuite-seed/seed-demo-rich.ts:/repo/apps/api/prisma/seed-demo-rich.ts:ro \\
  -v /tmp/whizsuite-seed/seed-run-rich.ts:/repo/apps/api/prisma/seed-run-rich.ts:ro \\
  migrate sh -lc 'cd /repo/apps/api && node_modules/.bin/prisma migrate deploy && node_modules/.bin/tsx prisma/seed-run-rich.ts'
echo "=== users ==="
docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml exec -T postgres \\
  sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT email FROM identity.users WHERE email LIKE '"'"'%demo%'"'"' OR email LIKE '"'"'%whizsuite%'"'"' ORDER BY 1;"'
echo "=== clients (whizsuite-demo) ==="
docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml exec -T postgres \\
  sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT COUNT(*) FROM clients.clients c JOIN tenancy.organizations o ON o.id = c.organization_id WHERE o.slug = '"'"'whizsuite-demo'"'"';"'
docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml exec -T api node <<'NODE'
const {{ PrismaClient }} = require('@prisma/client');
const bcrypt = require('bcrypt');
(async () => {{
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash('Demo123!', 12);
  const result = await prisma.user.updateMany({{
    where: {{ email: {{ in: ['owner@demo.agency', 'demo@whizsuite.com'] }} }},
    data: {{ passwordHash }},
  }});
  console.log('passwords_updated', result.count);
  await prisma.$disconnect();
}})();
NODE
"""


def main() -> int:
    rich_path = SEED_DIR / "seed-demo-rich.ts"
    runner_path = SEED_DIR / "seed-run-rich.ts"
    if not rich_path.is_file() or not runner_path.is_file():
        print("missing seed-demo-rich.ts or seed-run-rich.ts under apps/api/prisma")
        return 1

    script = remote_script(b64(rich_path), b64(runner_path))
    if len(script) > 950_000:
        print("SSM payload too large; deploy API image instead")
        return 1

    ssm = boto3.Session(profile_name=PROFILE, region_name=REGION).client("ssm")
    payload = {
        "commands": [
            "echo "
            + base64.b64encode(script.encode()).decode()
            + " | base64 -d > /tmp/ops-production-seed.sh && bash /tmp/ops-production-seed.sh"
        ]
    }
    cid = ssm.send_command(
        InstanceIds=[INSTANCE],
        DocumentName="AWS-RunShellScript",
        Parameters=payload,
        TimeoutSeconds=900,
    )["Command"]["CommandId"]
    print("cid", cid)
    time.sleep(3)
    out: dict = {}
    for _ in range(120):
        try:
            out = ssm.get_command_invocation(CommandId=cid, InstanceId=INSTANCE)
        except ssm.exceptions.InvocationDoesNotExist:
            time.sleep(5)
            continue
        if out["Status"] not in ("Pending", "InProgress", "Delayed"):
            break
        time.sleep(10)
    print("STATUS", out.get("Status"))
    print(out.get("StandardOutputContent", ""))
    err = out.get("StandardErrorContent") or ""
    if err:
        print("STDERR", err[-6000:])
    return 0 if out.get("Status") == "Success" else 1


if __name__ == "__main__":
    raise SystemExit(main())
