/// In-memory Google ID token between login (no account) and register workspace step.
class GooglePendingSignup {
  GooglePendingSignup._();

  static String? idToken;

  static void save(String value) => idToken = value;

  static String? take() {
    final value = idToken;
    idToken = null;
    return value;
  }

  static void clear() => idToken = null;

  static bool get hasToken => idToken != null && idToken!.isNotEmpty;
}
