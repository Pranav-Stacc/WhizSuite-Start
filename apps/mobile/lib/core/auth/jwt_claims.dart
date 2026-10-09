import 'dart:convert';

/// Claims the API embeds in the access token. Only used for routing and request headers;
/// the server re-verifies the signature on every call.
class JwtClaims {
  const JwtClaims({
    required this.userId,
    required this.email,
    required this.expiresAt,
    this.organizationId,
    this.membershipId,
    this.membershipType,
    this.clientId,
  });

  static JwtClaims? tryParse(String token) {
    final parts = token.split('.');
    if (parts.length != 3) return null;
    try {
      final payload = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))));
      if (payload is! Map<String, dynamic>) return null;
      final sub = payload['sub'];
      final exp = payload['exp'];
      if (sub is! String || exp is! num) return null;
      return JwtClaims(
        userId: sub,
        email: payload['email'] as String? ?? '',
        expiresAt: DateTime.fromMillisecondsSinceEpoch(exp.toInt() * 1000, isUtc: true),
        organizationId: payload['organizationId'] as String?,
        membershipId: payload['membershipId'] as String?,
        membershipType: payload['membershipType'] as String?,
        clientId: payload['clientId'] as String?,
      );
    } on FormatException {
      return null;
    }
  }

  final String userId;
  final String email;
  final DateTime expiresAt;
  final String? organizationId;
  final String? membershipId;
  final String? membershipType;
  final String? clientId;
}
