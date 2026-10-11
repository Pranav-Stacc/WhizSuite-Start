# Google Play (WhizSuite)

- **Package:** `com.whizsuite.app`
- **Play Console:** [WhizSuite app dashboard](https://play.google.com/console/u/0/developers/8660143602138682998/app/4974929425288508640/app-dashboard)

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

If CI fails with `expected: SHA1: …` but your keystore shows a different SHA1, either:

1. **Use the original upload keystore** — update GitHub secrets `ANDROID_KEYSTORE_*` from that `.jks` (same key Play already knows), or  
2. **Request an upload key reset** (if the old keystore is lost):  
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
