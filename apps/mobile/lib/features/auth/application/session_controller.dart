import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/token_store.dart';
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
    return session;
  }

  Future<void> signIn({required String email, required String password}) => _authenticate(
        () => ref.read(authRepositoryProvider).login(email: email, password: password),
      );

  Future<void> register(RegistrationInput input) =>
      _authenticate(() => ref.read(authRepositoryProvider).register(input));

  Future<void> signOut() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }

  /// Errors are rethrown to the calling form; the session state stays signed out.
  Future<void> _authenticate(Future<AuthTokens> Function() call) async {
    final tokens = await call();
    state = AsyncData(Session.fromClaims(tokens.claims));
  }
}

final sessionProvider = AsyncNotifierProvider<SessionController, Session?>(SessionController.new);
