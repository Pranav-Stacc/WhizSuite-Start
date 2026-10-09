import 'dart:convert';

import 'package:agency_os/core/auth/jwt_claims.dart';
import 'package:flutter_test/flutter_test.dart';

String _token(Map<String, Object?> payload) {
  String encode(Object value) => base64Url.encode(utf8.encode(jsonEncode(value))).replaceAll('=', '');
  return '${encode({'alg': 'HS256'})}.${encode(payload)}.signature';
}

void main() {
  group('JwtClaims', () {
    test('reads tenant and membership claims', () {
      final claims = JwtClaims.tryParse(
        _token({
          'sub': 'user-1',
          'email': 'a@b.test',
          'exp': 1900000000,
          'organizationId': 'org-1',
          'membershipId': 'mem-1',
          'membershipType': 'CLIENT',
          'clientId': 'client-1',
        }),
      );

      expect(claims?.userId, 'user-1');
      expect(claims?.organizationId, 'org-1');
      expect(claims?.membershipType, 'CLIENT');
      expect(claims?.clientId, 'client-1');
      expect(claims?.expiresAt.isUtc, isTrue);
    });

    test('returns null for malformed tokens', () {
      expect(JwtClaims.tryParse('not-a-jwt'), isNull);
      expect(JwtClaims.tryParse('a.%%%.c'), isNull);
      expect(JwtClaims.tryParse(_token({'email': 'missing-sub'})), isNull);
    });
  });
}
