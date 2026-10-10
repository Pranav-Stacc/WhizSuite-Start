import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/token_store.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/theme/theme_settings.dart';
import '../data/auth_repository.dart';
import '../domain/session.dart';

/// Owns the signed-in state. `null` means signed out.
class SessionController extends AsyncNotifier<Session?> {
  @override
  Future<Session?> build() async {
    final tokens = ref.watch(tokenStoreProvider);
    final expired = tokens.onCleared.listen((_) => state = const AsyncData(null));
    ref.onDispose(expired.cancel);

    final stored = await tokens.load();
    final session = Session.fromClaims(stored?.claims);
    if (stored != null && session == null) await tokens.clear();
    if (session != null) unawaited(_hydrateOrgTheme());
    return session;
  }

  Future<void> signIn({required String email, required String password}) => _authenticate(
        () => ref.read(authRepositoryProvider).login(email: email, password: password),
      );

  Future<void> signInWithGoogle({
    required String idToken,
    String? organizationName,
    String? organizationSlug,
  }) =>
      _authenticate(
        () => ref.read(authRepositoryProvider).loginWithGoogle(
              idToken: idToken,
              organizationName: organizationName,
              organizationSlug: organizationSlug,
            ),
      );

  Future<void> register(RegistrationInput input) =>
      _authenticate(() => ref.read(authRepositoryProvider).register(input));

  Future<void> redeemPortalAccess({
    required String token,
    required String email,
    required String firstName,
    String? lastName,
    String? password,
  }) =>
      _authenticate(
        () => ref.read(authRepositoryProvider).redeemPortalAccess(
              token: token,
              email: email,
              firstName: firstName,
              lastName: lastName,
              password: password,
            ),
      );

  Future<void> acceptInvitation({
    required String token,
    required String password,
    String? firstName,
    String? lastName,
  }) =>
      _authenticate(
        () => ref.read(authRepositoryProvider).acceptInvitation(
              token: token,
              password: password,
              firstName: firstName,
              lastName: lastName,
            ),
      );

  Future<void> signOut() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }

  /// Errors are rethrown to the calling form; the session state stays signed out.
  Future<void> _authenticate(Future<AuthTokens> Function() call) async {
    final tokens = await call();
    state = AsyncData(Session.fromClaims(tokens.claims));
    await _hydrateOrgTheme();
  }

  /// Loads `appearance.theme` for the org so new team and client logins match web.
  Future<void> _hydrateOrgTheme() async {
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get<Json>(api.org('theme'));
      final raw = response['theme'];
      if (raw is! Map) return;
      final theme = ThemeSettings.tryParse(Map<String, Object?>.from(raw));
      if (theme != null) {
        ref.read(themeControllerProvider.notifier).hydrateFromOrganization(theme);
      }
    } on ApiException {
      // Keep the device theme if the agency theme cannot be loaded.
    }
  }
}

final sessionProvider = AsyncNotifierProvider<SessionController, Session?>(SessionController.new);
