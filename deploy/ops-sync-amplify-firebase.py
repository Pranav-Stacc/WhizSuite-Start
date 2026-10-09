"""Sync public Firebase web config (+ VAPID) from apps/web/.env.local onto Amplify."""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

APP_ID = "d2o8v8clrzpf9d"
PROFILE = "whizsuite"
REGION = "ap-south-1"
ROOT = Path(__file__).resolve().parents[1]
ENV_LOCAL = ROOT / "apps/web/.env.local"

KEYS = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "NEXT_PUBLIC_FIREBASE_VAPID_KEY",
    "NEXT_PUBLIC_APP_NAME",
]


def load_dotenv(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def main() -> int:
    local = load_dotenv(ENV_LOCAL)
    missing = [k for k in KEYS if k.startswith("NEXT_PUBLIC_FIREBASE") and not local.get(k)]
    if missing:
        print("missing in .env.local:", ", ".join(missing))
        return 1
    current = json.loads(
        subprocess.check_output(
            [
                "aws",
                "amplify",
                "get-app",
                "--app-id",
                APP_ID,
                "--profile",
                PROFILE,
                "--region",
                REGION,
                "--query",
                "app.environmentVariables",
                "--output",
                "json",
            ],
            text=True,
        )
    )
    merged = dict(current)
    for key in KEYS:
        if local.get(key):
            merged[key] = local[key]
    # Amplify CLI wants Key=Value,... — values may contain commas (VAPID) so use JSON file via CLI is safer:
    # aws amplify update-app --environment-variables file://...
    # Actually AWS CLI expects map format. Use shorthand carefully by writing to a file of JSON for --cli-input-json.
    body = {
        "appId": APP_ID,
        "environmentVariables": merged,
    }
    path = Path.home() / "AppData/Local/Temp/amplify-update.json"
    path.write_text(json.dumps(body), encoding="utf-8")
    subprocess.check_call(
        [
            "aws",
            "amplify",
            "update-app",
            "--cli-input-json",
            f"file://{path}",
            "--profile",
            PROFILE,
            "--region",
            REGION,
            "--query",
            "app.environmentVariables.NEXT_PUBLIC_FIREBASE_PROJECT_ID",
            "--output",
            "text",
        ]
    )
    present = [k for k in KEYS if merged.get(k)]
    print("amplify firebase keys set:", ", ".join(present))
    print("project:", merged.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID"))
    # Don't print VAPID
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
