"""Send a test email via SES API (profile whizsuite). No GitHub Actions required."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

PROFILE = "whizsuite"
REGION = "ap-south-1"
REPO_ROOT = Path(__file__).resolve().parents[1]
CONTENT = REPO_ROOT / "deploy" / "ses-test-email.json"


def main() -> int:
    to = sys.argv[1] if len(sys.argv) > 1 else ""
    if not to:
        print("usage: python deploy/ops-ses-test.py <recipient@email.com>", file=sys.stderr)
        return 2
    subprocess.check_call(
        [
            "aws",
            "sesv2",
            "send-email",
            "--from-email-address",
            "noreply@whizsuite.com",
            "--destination",
            f"ToAddresses={to}",
            "--content",
            f"file://{CONTENT.as_posix()}",
            "--region",
            REGION,
            "--profile",
            PROFILE,
        ],
    )
    print(f"sent test email to {to}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
