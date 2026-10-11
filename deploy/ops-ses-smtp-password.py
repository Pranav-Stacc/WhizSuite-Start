"""Derive Amazon SES SMTP password from an IAM secret access key (AWS documented algorithm)."""
from __future__ import annotations

import base64
import hashlib
import hmac
import sys

VERSION = b"\x04"
MESSAGE = "SendRawEmail"


def smtp_password_from_secret(secret_access_key: str) -> str:
    signature = hmac.new(
        secret_access_key.encode("utf-8"),
        MESSAGE.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    return base64.b64encode(VERSION + signature).decode("utf-8")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: ops-ses-smtp-password.py <secret-access-key>", file=sys.stderr)
        raise SystemExit(2)
    print(smtp_password_from_secret(sys.argv[1]))
