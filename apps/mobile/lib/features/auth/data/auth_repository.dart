import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/token_store.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';

class RegistrationInput {
  const RegistrationInput({
    required this.email,
    required this.password,
    required this.firstName,
    required this.organizationName,
    required this.organizationSlug,
    this.lastName,
  });

  final String email;
  final String password;
  final String firstName;
  final String? lastName;
  final String organizationName;
  final String organizationSlug;

  Json toJson() => {
        'email': email,
        'password': password,
        'firstName': firstName,
        if (lastName != null && lastName!.isNotEmpty) 'lastName': lastName,
        'organizationName': organizationName,
        'organizationSlug': organizationSlug,
      };
}

class AuthRepository {
  const AuthRepository(this._api, this._tokens);

  final ApiClient _api;
  final TokenStore _tokens;

  Future<AuthTokens> login({required String email, required String password}) =>
      _authenticate('v1/auth/login', {'email': email, 'password': password});

  Future<AuthTokens> loginWithGoogle({
    required String idToken,
    String? organizationName,
    String? organizationSlug,
  }) =>
      _authenticate('v1/auth/google', {
        'idToken': idToken,
        if (organizationName != null && organizationName.isNotEmpty) 'organizationName': organizationName,
        if (organizationSlug != null && organizationSlug.isNotEmpty) 'organizationSlug': organizationSlug,
      });

  Future<AuthTokens> register(RegistrationInput input) => _authenticate('v1/auth/register', input.toJson());

  /// Redeems a shareable client portal access link (temporary or permanent).
  Future<AuthTokens> redeemPortalAccess({
    required String token,
    required String email,
    required String firstName,
    String? lastName,
    String? password,
  }) =>
      _authenticate('v1/portal-access/redeem', {
        'token': token,
        'email': email,
        'firstName': firstName,
        if (lastName != null && lastName.isNotEmpty) 'lastName': lastName,
        if (password != null && password.isNotEmpty) 'password': password,
      });

  Future<Json> previewPortalAccess(String token) =>
      _api.getUnauthenticated<Json>('v1/portal-access/preview', query: {'token': token});

  /// Staff/team invitation preview (public; no session required).
  Future<Json> previewInvitation(String token) =>
      _api.getUnauthenticated<Json>('v1/invitations/preview', query: {'token': token});

  /// Accepts a staff invitation and stores the returned session tokens.
  Future<AuthTokens> acceptInvitation({
    required String token,
    required String password,
    String? firstName,
    String? lastName,
  }) =>
      _authenticate('v1/invitations/redeem', {
        'token': token,
        'password': password,
        if (firstName != null && firstName.isNotEmpty) 'firstName': firstName,
        if (lastName != null && lastName.isNotEmpty) 'lastName': lastName,
      });

  Future<void> claimPortalAccess({required String password}) =>
      _api.post<Json>('v1/portal-access/claim', body: {'password': password});

  /// Revokes the refresh token server-side; local tokens are cleared even if the call fails.
  Future<void> logout() async {
    final refreshToken = _tokens.current?.refreshToken;
    try {
      if (refreshToken != null) {
        await _api.post<Json>('v1/auth/logout', body: {'refreshToken': refreshToken}, authenticated: false);
      }
    } on ApiException {
      // The session is ended locally regardless; the server token expires on its own.
    } finally {
      await _tokens.clear();
    }
  }

  Future<AuthTokens> _authenticate(String path, Json body) async {
    final response = await _api.post<Json>(path, body: body, authenticated: false);
    final access = response['accessToken'];
    final refresh = response['refreshToken'];
    if (access is! String || refresh is! String) {
      throw const ApiException(kind: ApiFailureKind.unknown);
    }
    final tokens = AuthTokens(accessToken: access, refreshToken: refresh);
    await _tokens.save(tokens);
    return tokens;
  }
}

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.watch(apiClientProvider), ref.watch(tokenStoreProvider)),
);
