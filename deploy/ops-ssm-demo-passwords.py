"""Set known demo passwords on production (owner@demo.agency → Demo123!)."""
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
docker compose --env-file .env --env-file .image-tag -f docker-compose.prod.yml exec -T api node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
(async () => {
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash('Demo123!', 12);
  const result = await prisma.user.updateMany({
    where: { email: { in: ['owner@demo.agency', 'demo@whizsuite.com'] } },
    data: { passwordHash },
  });
  console.log('updated_users', result.count);
  const rows = await prisma.user.findMany({
    where: { email: { in: ['owner@demo.agency', 'demo@whizsuite.com'] } },
    select: { email: true, passwordHash: true },
  });
  for (const row of rows) {
    console.log(row.email, row.passwordHash?.slice(0, 7));
  }
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
NODE
"""


def main() -> int:
    ssm = boto3.Session(profile_name=PROFILE, region_name=REGION).client("ssm")
    payload = {
        "commands": [
            "echo "
            + base64.b64encode(REMOTE.encode()).decode()
            + " | base64 -d > /tmp/ops-demo-pw.sh && bash /tmp/ops-demo-pw.sh"
        ]
    }
    cid = ssm.send_command(
        InstanceIds=[INSTANCE],
        DocumentName="AWS-RunShellScript",
        Parameters=payload,
        TimeoutSeconds=120,
    )["Command"]["CommandId"]
    print("cid", cid)
    time.sleep(2)
    out: dict = {}
    for _ in range(30):
        try:
            out = ssm.get_command_invocation(CommandId=cid, InstanceId=INSTANCE)
        except ssm.exceptions.InvocationDoesNotExist:
            time.sleep(2)
            continue
        if out["Status"] not in ("Pending", "InProgress", "Delayed"):
            break
        time.sleep(2)
    print("STATUS", out.get("Status"))
    print(out.get("StandardOutputContent", ""))
    err = out.get("StandardErrorContent") or ""
    if err:
        print("STDERR", err[-2000:])
    return 0 if out.get("Status") == "Success" else 1


if __name__ == "__main__":
    raise SystemExit(main())
