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

```bash
dart run tool/l10n.dart
```
