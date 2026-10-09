"""Configure WhizSuite App Store Connect metadata via API key (local only)."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from pathlib import Path

import jwt

KEY_ID = "9H59DGGCXX"
ISSUER_ID = "d5e32076-0000-4044-9827-8790f211a842"
APP_ID = "6821133546"
BUNDLE_ID = "com.whizsuite.app"
P8_SRC = Path(r"C:\Users\HP\Downloads\AuthKey_9H59DGGCXX.p8")
MOBILE_ROOT = Path(__file__).resolve().parents[1]
SECRETS = MOBILE_ROOT / "ios" / "secrets"
PRIVACY_URL = "https://whizsuite.com/privacy"
SUPPORT_URL = "https://whizsuite.com"
MARKETING_URL = "https://whizsuite.com"

SHORT_DESCRIPTION = (
    "Agency OS for clients, projects, content, inbox, and team workflows."
)
DESCRIPTION = """WhizSuite is the operating system for social media and creative agencies.

Run your entire workspace from one app:
• Clients and projects in one place
• Content planning, media, and approvals
• Tasks, time tracking, and calendar
• Team inbox and client collaboration
• Invoices, reports, roles, and permissions

Built for agency staff and client portal users. Sign in with your organisation account to get started.

Website: https://whizsuite.com
Support: support@whizsuite.com
Privacy: https://whizsuite.com/privacy"""

KEYWORDS = "agency,crm,projects,content,social media,team,inbox,invoices,productivity"
WHATS_NEW = "Initial release of WhizSuite for iOS."
PROMO_TEXT = "Run your agency from one app — clients, content, tasks, and inbox."
SUPPORT_EMAIL = "support@whizsuite.com"


def ensure_secrets() -> Path:
    SECRETS.mkdir(parents=True, exist_ok=True)
    key_path = SECRETS / "AuthKey_9H59DGGCXX.p8"
    if P8_SRC.exists():
        key_path.write_text(P8_SRC.read_text(encoding="utf-8"), encoding="utf-8")
    (SECRETS / "asc.json").write_text(
        json.dumps(
            {
                "issuer_id": ISSUER_ID,
                "key_id": KEY_ID,
                "key_path": key_path.name,
                "app_id": APP_ID,
                "bundle_id": BUNDLE_ID,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    gitignore = SECRETS / ".gitignore"
    if not gitignore.exists():
        gitignore.write_text("*\n!.gitignore\n", encoding="utf-8")
    return key_path


def make_token(private_key: str) -> str:
    now = int(time.time())
    token = jwt.encode(
        {
            "iss": ISSUER_ID,
            "iat": now,
            "exp": now + 20 * 60,
            "aud": "appstoreconnect-v1",
        },
        private_key,
        algorithm="ES256",
        headers={"alg": "ES256", "kid": KEY_ID, "typ": "JWT"},
    )
    return token.decode() if isinstance(token, bytes) else token


def api(token: str, method: str, path: str, body: dict | None = None):
    url = "https://api.appstoreconnect.apple.com" + path
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        err = exc.read().decode("utf-8")
        try:
            payload = json.loads(err)
        except json.JSONDecodeError:
            payload = {"raw": err}
        return exc.code, payload


def main() -> int:
    key_path = ensure_secrets()
    private_key = key_path.read_text(encoding="utf-8")
    token = make_token(private_key)

    status, app = api(token, "GET", f"/v1/apps/{APP_ID}")
    print("APP", status)
    if status != 200:
        print(json.dumps(app, indent=2)[:3000])
        return 1
    attrs = app["data"]["attributes"]
    print(
        json.dumps(
            {
                k: attrs.get(k)
                for k in ("name", "bundleId", "sku", "primaryLocale")
            },
            indent=2,
        )
    )

    status, vers = api(
        token,
        "GET",
        f"/v1/apps/{APP_ID}/appStoreVersions?filter[platform]=IOS&limit=20",
    )
    print("VERSIONS", status)
    if status != 200:
        print(json.dumps(vers, indent=2)[:3000])
        return 1

    editable_states = {
        "PREPARE_FOR_SUBMISSION",
        "DEVELOPER_REJECTED",
        "REJECTED",
        "METADATA_REJECTED",
        "WAITING_FOR_REVIEW",  # limited edits
    }
    version = None
    for item in vers.get("data", []):
        state = item["attributes"].get("appStoreState")
        print(
            item["id"],
            item["attributes"].get("versionString"),
            state,
        )
        if version is None and state in editable_states:
            version = item
        if version is None and state == "PREPARE_FOR_SUBMISSION":
            version = item

    if version is None and vers.get("data"):
        # Prefer newest prepare/inflight-like version
        version = vers["data"][0]

    if version is None:
        # Create 1.0.0 version
        status, created = api(
            token,
            "POST",
            "/v1/appStoreVersions",
            {
                "data": {
                    "type": "appStoreVersions",
                    "attributes": {
                        "platform": "IOS",
                        "versionString": "1.0.0",
                    },
                    "relationships": {
                        "app": {"data": {"type": "apps", "id": APP_ID}}
                    },
                }
            },
        )
        print("CREATE_VERSION", status)
        if status not in (200, 201):
            print(json.dumps(created, indent=2)[:3000])
            return 1
        version = created["data"]

    version_id = version["id"]
    print("USING_VERSION", version_id, version["attributes"])

    # Localizations
    status, locs = api(
        token,
        "GET",
        f"/v1/appStoreVersions/{version_id}/appStoreVersionLocalizations",
    )
    print("LOCALIZATIONS", status)
    loc = None
    if status == 200 and locs.get("data"):
        for item in locs["data"]:
            print(item["id"], item["attributes"].get("locale"))
            if item["attributes"].get("locale") == "en-US":
                loc = item
        if loc is None:
            loc = locs["data"][0]
    else:
        status, created_loc = api(
            token,
            "POST",
            "/v1/appStoreVersionLocalizations",
            {
                "data": {
                    "type": "appStoreVersionLocalizations",
                    "attributes": {
                        "locale": "en-US",
                        "description": DESCRIPTION,
                        "keywords": KEYWORDS,
                        "marketingUrl": MARKETING_URL,
                        "promotionalText": PROMO_TEXT,
                        "supportUrl": SUPPORT_URL,
                        "whatsNew": WHATS_NEW,
                    },
                    "relationships": {
                        "appStoreVersion": {
                            "data": {
                                "type": "appStoreVersions",
                                "id": version_id,
                            }
                        }
                    },
                }
            },
        )
        print("CREATE_LOC", status)
        if status not in (200, 201):
            print(json.dumps(created_loc, indent=2)[:3000])
            return 1
        loc = created_loc["data"]

    loc_id = loc["id"]
    # First App Store version cannot set whatsNew.
    loc_attrs = {
        "description": DESCRIPTION,
        "keywords": KEYWORDS,
        "marketingUrl": MARKETING_URL,
        "promotionalText": PROMO_TEXT,
        "supportUrl": SUPPORT_URL,
    }
    if version["attributes"].get("versionString") not in ("1.0", "1.0.0"):
        loc_attrs["whatsNew"] = WHATS_NEW

    status, patched = api(
        token,
        "PATCH",
        f"/v1/appStoreVersionLocalizations/{loc_id}",
        {
            "data": {
                "type": "appStoreVersionLocalizations",
                "id": loc_id,
                "attributes": loc_attrs,
            }
        },
    )
    print("PATCH_LOC", status)
    if status not in (200, 201):
        print(json.dumps(patched, indent=2)[:3000])

    # App info / privacy policy (primary locale app infos)
    status, infos = api(token, "GET", f"/v1/apps/{APP_ID}/appInfos")
    print("APP_INFOS", status)
    if status == 200 and infos.get("data"):
        for info in infos["data"]:
            info_id = info["id"]
            status, info_locs = api(
                token,
                "GET",
                f"/v1/appInfos/{info_id}/appInfoLocalizations",
            )
            print("APP_INFO_LOCS", info_id, status)
            if status != 200:
                print(json.dumps(info_locs, indent=2)[:1500])
                continue
            target = None
            for item in info_locs.get("data", []):
                if item["attributes"].get("locale") in ("en-US", "en-GB"):
                    target = item
                    break
            if target is None and info_locs.get("data"):
                target = info_locs["data"][0]
            if target is None:
                status, created_info_loc = api(
                    token,
                    "POST",
                    "/v1/appInfoLocalizations",
                    {
                        "data": {
                            "type": "appInfoLocalizations",
                            "attributes": {
                                "locale": "en-US",
                                "name": "WhizSuite",
                                "subtitle": "Agency operations suite",
                                "privacyPolicyUrl": PRIVACY_URL,
                            },
                            "relationships": {
                                "appInfo": {
                                    "data": {"type": "appInfos", "id": info_id}
                                }
                            },
                        }
                    },
                )
                print("CREATE_APP_INFO_LOC", status)
                if status not in (200, 201):
                    print(json.dumps(created_info_loc, indent=2)[:2000])
                continue

            status, patched_info = api(
                token,
                "PATCH",
                f"/v1/appInfoLocalizations/{target['id']}",
                {
                    "data": {
                        "type": "appInfoLocalizations",
                        "id": target["id"],
                        "attributes": {
                            "name": "WhizSuite",
                            "subtitle": "Agency operations suite",
                            "privacyPolicyUrl": PRIVACY_URL,
                        },
                    }
                },
            )
            print("PATCH_APP_INFO_LOC", status, target["attributes"].get("locale"))
            if status not in (200, 201):
                print(json.dumps(patched_info, indent=2)[:2000])

            # Category: BUSINESS
            status, cat_patch = api(
                token,
                "PATCH",
                f"/v1/appInfos/{info_id}",
                {
                    "data": {
                        "type": "appInfos",
                        "id": info_id,
                        "relationships": {
                            "primaryCategory": {
                                "data": {
                                    "type": "appCategories",
                                    "id": "BUSINESS",
                                }
                            }
                        },
                    }
                },
            )
            print("PATCH_CATEGORY", status)
            if status not in (200, 201):
                print(json.dumps(cat_patch, indent=2)[:2000])

    # Review details
    status, review = api(
        token,
        "GET",
        f"/v1/appStoreVersions/{version_id}/appStoreReviewDetail",
    )
    print("REVIEW_DETAIL", status)
    review_attrs = {
        "contactEmail": SUPPORT_EMAIL,
        "contactFirstName": "Pranav",
        "contactLastName": "Narkhede",
        "contactPhone": "+919999999999",
        "demoAccountName": "reviewer@whizsuite.com",
        "demoAccountPassword": "ChangeMeReview1!",
        "demoAccountRequired": True,
        "notes": (
            "WhizSuite requires login. Use the demo account provided. "
            "After login you reach the staff dashboard. "
            "Privacy policy: https://whizsuite.com/privacy"
        ),
    }
    if status == 200 and review.get("data"):
        rid = review["data"]["id"]
        status, patched_review = api(
            token,
            "PATCH",
            f"/v1/appStoreReviewDetails/{rid}",
            {
                "data": {
                    "type": "appStoreReviewDetails",
                    "id": rid,
                    "attributes": review_attrs,
                }
            },
        )
        print("PATCH_REVIEW", status)
        if status not in (200, 201):
            print(json.dumps(patched_review, indent=2)[:2000])
    elif status in (404, 200) or (status == 200 and not review.get("data")):
        status, created_review = api(
            token,
            "POST",
            "/v1/appStoreReviewDetails",
            {
                "data": {
                    "type": "appStoreReviewDetails",
                    "attributes": review_attrs,
                    "relationships": {
                        "appStoreVersion": {
                            "data": {
                                "type": "appStoreVersions",
                                "id": version_id,
                            }
                        }
                    },
                }
            },
        )
        print("CREATE_REVIEW", status)
        if status not in (200, 201):
            print(json.dumps(created_review, indent=2)[:2000])
    else:
        # relationship may 404 style wrapper
        status, created_review = api(
            token,
            "POST",
            "/v1/appStoreReviewDetails",
            {
                "data": {
                    "type": "appStoreReviewDetails",
                    "attributes": review_attrs,
                    "relationships": {
                        "appStoreVersion": {
                            "data": {
                                "type": "appStoreVersions",
                                "id": version_id,
                            }
                        }
                    },
                }
            },
        )
        print("CREATE_REVIEW_FALLBACK", status)
        if status not in (200, 201):
            print(json.dumps(created_review, indent=2)[:2000])

    print("DONE")
    print(
        json.dumps(
            {
                "app_id": APP_ID,
                "version_id": version_id,
                "localization_id": loc_id,
                "bundle_id": BUNDLE_ID,
                "console": f"https://appstoreconnect.apple.com/apps/{APP_ID}/distribution/ios/version/inflight",
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
