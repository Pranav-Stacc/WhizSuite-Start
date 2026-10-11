# Google Play (WhizSuite)

- **Package:** `com.whizsuite.app`
- **Play Console:** [WhizSuite app dashboard](https://play.google.com/console/u/0/developers/8660143602138682998/app/4974929425288508640/app-dashboard)

## Canonical upload keystore

| Setting | Value |
|--------|--------|
| File | `apps/mobile/android/upload-keystore.jks` |
| Alias | `upload` |
| `key.properties` | `storeFile=upload-keystore.jks` |
| Gradle | `rootProject.file(...)` in `android/app/build.gradle.kts` → resolves to `android/upload-keystore.jks` |

**Upload certificate (Oct 2026 keystore — use this everywhere):**

- SHA-1: `F4:75:EB:E6:19:64:90:19:26:67:58:74:61:28:0A:A4:65:38:5A:DE`
- SHA-256: `EC:4E:DA:B2:45:50:16:A0:AF:F1:98:38:CD:93:09:B0:92:8F:75:57:F3:D6:58:B8:3A:1B:EC:64:31:04:E6:79`

**Legacy (do not use):** `android/app/upload-keystore.jks` (SHA-1 `A2:DC:20:A4:…`) was created when signing resolved under `android/app/`. It may still be the key **registered in Play** until you complete an [upload key reset](#wrong-upload-key-signed-with-the-wrong-key). Delete the `app/` copy after Play accepts the Oct 2026 upload key.

CI (`.github/workflows/publish-android-play.yml`) decodes `ANDROID_KEYSTORE_BASE64` to the same path: `android/upload-keystore.jks`.

## Local release build

1. `android/key.properties` + `android/upload-keystore.jks` (never commit).
2. `flutter build appbundle --release --dart-define-from-file=config/production.json`
3. Output: `build/app/outputs/bundle/release/app-release.aab`

## Google Sign-In (Android)

1. Firebase Console → Project **whizsuite-759b0** → Android app `com.whizsuite.app`.
2. Add **SHA-1** (and SHA-256) of your **upload** keystore:

```bash
keytool -list -v -keystore android/upload-keystore.jks -alias upload
```

3. Download an updated `google-services.json` if Firebase adds an Android OAuth client.
4. Production builds use `GOOGLE_SIGN_IN_ENABLED=true` in `config/production.json`.

## CI secrets (GitHub)

| Secret | Purpose |
|--------|---------|
| `ANDROID_KEYSTORE_BASE64` | Upload keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Usually `upload` |
| `ANDROID_KEY_PASSWORD` | Key password |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64` | Play Developer API service account JSON |

Grant the service account **Release manager** (or Admin) in Play Console → Users and permissions.

## Wrong upload key (`signed with the wrong key`)

Play compares the AAB’s upload certificate to the **upload key** registered for the app (Play Console → **Release** → **Setup** → **App signing** → **Upload key certificate**).

Read the Fastlane error carefully:

| Error field | Meaning |
|-------------|---------|
| **Found** | Keystore used to sign the AAB (from `ANDROID_KEYSTORE_BASE64` / local `android/upload-keystore.jks`) |
| **expected** | Upload key currently registered in Play Console → App signing |

- If **Found** is not `F4:75:EB:…`, re-encode GitHub `ANDROID_KEYSTORE_BASE64` from `android/upload-keystore.jks` (see below).
- If **Found** is `F4:75:EB:…` but **expected** is `A2:DC:20:…`, Play still has the legacy `android/app/` upload key — either **request upload key reset** (preferred) or temporarily sign with the legacy `.jks` until reset is approved.

Re-encode the canonical keystore for GitHub (PowerShell, from `apps/mobile/android`):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("upload-keystore.jks")) | gh secret set ANDROID_KEYSTORE_BASE64 --repo OWNER/REPO
```

Then either:

1. **Use the Play-registered upload keystore** — only if you intentionally keep the legacy `android/app/upload-keystore.jks` until reset completes, or  
2. **Request an upload key reset** (recommended; keep Oct 2026 keystore):  
   - Play Console → **App signing** → **Request upload key reset**  
   - Export the **new** public cert from `android/upload-keystore.jks`:

```bash
keytool -export -rfc -keystore android/upload-keystore.jks -alias upload -file upload_certificate.pem
```

   - Submit `upload_certificate.pem` and wait for Google approval, then re-run the Play publish workflow.

After any keystore change, refresh Firebase **SHA-1 / SHA-256** for Google Sign-In (see above).

## Listing metadata (ASO)

Fastlane uploads `fastlane/metadata/android/en-US/` (title, descriptions, 512×512 icon) on each Play publish.

Add phone screenshots in Play Console or extend Fastlane `supply` with `fastlane/metadata/android/en-US/images/phoneScreenshots/`.
