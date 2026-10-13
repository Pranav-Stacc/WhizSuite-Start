"""Derive Amazon SES SMTP password from an IAM secret access key (AWS documented algorithm)."""
from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import sys

# https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html
DATE = "11111111"
SERVICE = "ses"
MESSAGE = "SendRawEmail"
TERMINAL = "aws4_request"
VERSION = 0x04
DEFAULT_REGION = "ap-south-1"


def sign(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def smtp_password_from_secret(secret_access_key: str, region: str = DEFAULT_REGION) -> str:
    signature = sign(("AWS4" + secret_access_key).encode("utf-8"), DATE)
    signature = sign(signature, region)
    signature = sign(signature, SERVICE)
    signature = sign(signature, TERMINAL)
    signature = sign(signature, MESSAGE)
    return base64.b64encode(bytes([VERSION]) + signature).decode("utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert IAM secret access key to SES SMTP password.")
    parser.add_argument("secret", help="IAM secret access key")
    parser.add_argument(
        "region",
        nargs="?",
        default=DEFAULT_REGION,
        help=f"AWS region for SMTP endpoint (default: {DEFAULT_REGION})",
    )
    args = parser.parse_args()
    print(smtp_password_from_secret(args.secret, args.region))
