import '../../../core/auth/jwt_claims.dart';
import '../../../core/contracts/contracts.g.dart';

/// The signed-in member of one organisation, derived from the access token claims.
class Session {
  const Session({
    required this.userId,
    required this.email,
    required this.organizationId,
    this.membershipId,
    this.membershipType,
    this.clientId,
  });

  static Session? fromClaims(JwtClaims? claims) {
    final organizationId = claims?.organizationId;
    if (claims == null || organizationId == null) return null;
    return Session(
      userId: claims.userId,
      email: claims.email,
      organizationId: organizationId,
      membershipId: claims.membershipId,
      membershipType: claims.membershipType,
      clientId: claims.clientId,
    );
  }

  final String userId;
  final String email;
  final String organizationId;
  final String? membershipId;
  final String? membershipType;
  final String? clientId;

  /// Client memberships are data-scoped to their client by the API and get the portal experience.
  /// What they can see and do inside it is still decided by their roles' permissions.
  bool get isClientPortal => membershipType == MembershipTypes.client;
}
