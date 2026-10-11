# WhizSuite (mobile)

Flutter app for agency staff and client portal users.

- **Android applicationId:** `com.whizsuite.app`
- **iOS bundle ID:** `com.whizsuite.app`
- **Display name:** WhizSuite

## Release signing (Android)

1. Copy `android/key.properties.example` → `android/key.properties` and fill passwords.
2. Place `upload-keystore.jks` next to `key.properties` (or set an absolute `storeFile` path).
3. Build: `flutter build appbundle --release`

`key.properties` and `*.jks` are gitignored — never commit them.

## Localisation

Feature strings live in `l10n/*.arb` (e.g. `l10n/pulse.arb`). They are **not** read directly by Flutter — merge them first:

```bash
cd apps/mobile
dart run tool/l10n.dart
```

Run this after editing any `l10n/*.arb` file. `flutter gen-l10n` alone only reads `lib/l10n/app_en.arb` and will miss new keys until you merge.
