"""Create dedicated IAM SMTP user for SES (one-time). Uses profile whizsuite.

Prints SMTP_USER and SMTP_PASS to stdout (redirect to a local file; never commit).
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent


def smtp_password_from_secret(secret: str) -> str:
    return subprocess.check_output(
        [sys.executable, str(SCRIPT_DIR / "ops-ses-smtp-password.py"), secret],
        text=True,
    ).strip()

PROFILE = "whizsuite"
REGION = "ap-south-1"
USER = "whizsuite-ses-smtp"
ACCOUNT = "508193318963"
POLICY_DOC = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["ses:SendEmail", "ses:SendRawEmail"],
            "Resource": [
                f"arn:aws:ses:{REGION}:{ACCOUNT}:identity/whizsuite.com",
                f"arn:aws:ses:{REGION}:{ACCOUNT}:identity/*",
            ],
        }
    ],
}


def aws(*args: str) -> str:
    return subprocess.check_output(
        ["aws", *args, "--profile", PROFILE, "--region", REGION],
        text=True,
    ).strip()


def main() -> int:
    users = json.loads(aws("iam", "list-users", "--output", "json"))
    names = {u["UserName"] for u in users.get("Users", [])}
    if USER not in names:
        aws("iam", "create-user", "--user-name", USER)
        print(f"created iam user {USER}")
    else:
        print(f"iam user {USER} already exists")

    policy_name = "whizsuite-ses-send"
    aws(
        "iam",
        "put-user-policy",
        "--user-name",
        USER,
        "--policy-name",
        policy_name,
        "--policy-document",
        json.dumps(POLICY_DOC),
    )
    print(f"attached inline policy {policy_name}")

    keys = json.loads(aws("iam", "list-access-keys", "--user-name", USER, "--output", "json"))
    active = [k for k in keys.get("AccessKeyMetadata", []) if k.get("Status") == "Active"]
    if active:
        print(
            f"user already has {len(active)} active access key(s); "
            "create a new key in IAM console or delete an old key, then re-run.",
            file=sys.stderr,
        )
        return 1

    key = json.loads(
        aws("iam", "create-access-key", "--user-name", USER, "--output", "json")
    )["AccessKey"]
    access_key_id = key["AccessKeyId"]
    secret = key["SecretAccessKey"]
    smtp_pass = smtp_password_from_secret(secret)

    print("SMTP_USER=", access_key_id)
    print("SMTP_PASS=", smtp_pass)
    print("Set these in your shell, then run: python deploy/ops-ses-env.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
