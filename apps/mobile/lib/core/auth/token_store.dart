import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'jwt_claims.dart';

class AuthTokens {
  const AuthTokens({required this.accessToken, required this.refreshToken});

  final String accessToken;
  final String refreshToken;

  JwtClaims? get claims => JwtClaims.tryParse(accessToken);
}

/// Persists tokens in the platform keystore and keeps an in-memory copy for request signing.
class TokenStore {
  TokenStore(this._storage);

  static const _accessKey = 'auth.access_token';
  static const _refreshKey = 'auth.refresh_token';

  final FlutterSecureStorage _storage;
  final _cleared = StreamController<void>.broadcast();
  final _changed = StreamController<AuthTokens?>.broadcast();
  AuthTokens? _current;

  AuthTokens? get current => _current;

  /// Emits when the session ends without user action (refresh rejected or reused).
  Stream<void> get onCleared => _cleared.stream;

  /// Emits after every save (sign-in, rotation) and clear.
  Stream<AuthTokens?> get onChanged => _changed.stream;

  Future<AuthTokens?> load() async {
    final values = await Future.wait([_storage.read(key: _accessKey), _storage.read(key: _refreshKey)]);
    final access = values[0];
    final refresh = values[1];
    _current = access != null && refresh != null ? AuthTokens(accessToken: access, refreshToken: refresh) : null;
    return _current;
  }

  Future<void> save(AuthTokens tokens) async {
    _current = tokens;
    await Future.wait([
      _storage.write(key: _accessKey, value: tokens.accessToken),
      _storage.write(key: _refreshKey, value: tokens.refreshToken),
    ]);
    _changed.add(tokens);
  }

  Future<void> clear({bool expired = false}) async {
    _current = null;
    await Future.wait([_storage.delete(key: _accessKey), _storage.delete(key: _refreshKey)]);
    _changed.add(null);
    if (expired) _cleared.add(null);
  }

  void dispose() {
    _cleared.close();
    _changed.close();
  }
}

final tokenStoreProvider = Provider<TokenStore>((ref) {
  final store = TokenStore(const FlutterSecureStorage());
  ref.onDispose(store.dispose);
  return store;
});
