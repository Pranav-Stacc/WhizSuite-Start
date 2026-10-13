# WhizSuite (mobile)

Flutter app for agency staff and client portal users.

- **Android applicationId:** `com.whizsuite.app`
- **iOS bundle ID:** `com.whizsuite.app`
- **Display name:** WhizSuite

## Release signing (Android)

1. Copy `android/key.properties.example` → `android/key.properties` and fill passwords.
2. Place **`upload-keystore.jks` next to `key.properties`** under `android/` (not `android/app/`). See `docs/play-store.md` for SHA-1 and Play upload-key notes.
3. Build: `flutter build appbundle --release --dart-define-from-file=config/production.json`

`key.properties` and `*.jks` are gitignored — never commit them.

## API URL

Dev and release builds default to the **deployed API** (`https://api.whizsuite.praanav.in/api`) via `config/dev.json` and `config/production.json`.

To hit a **local API**, change `API_BASE_URL` / `REALTIME_URL` in `config/dev.json` (emulator: `http://10.0.2.2:3001/api`; physical device: your PC LAN IP). Debug login shows the active API host.

**Google sign-in** requires `GOOGLE_SIGN_IN_ENABLED` and `GOOGLE_SERVER_CLIENT_ID` (web client ID).

## Localisation

Feature strings live in `l10n/*.arb` (e.g. `l10n/pulse.arb`). They are **not** read directly by Flutter — merge them first:

```bash
cd apps/mobile
dart run tool/l10n.dart
```

Run this after editing any `l10n/*.arb` file. `flutter gen-l10n` alone only reads `lib/l10n/app_en.arb` and will miss new keys until you merge.
