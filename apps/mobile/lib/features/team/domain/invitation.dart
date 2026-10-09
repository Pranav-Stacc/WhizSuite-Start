import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// Invitation states; `EXPIRED` is derived from a pending invitation past its expiry.
abstract final class InvitationStatuses {
  static const pending = 'PENDING';
  static const accepted = 'ACCEPTED';
  static const revoked = 'REVOKED';
  static const expired = 'EXPIRED';

  static const values = [pending, accepted, revoked, expired];
}

class Invitation {
  const Invitation({
    required this.id,
    required this.email,
    required this.membershipType,
    required this.status,
    required this.expiresAt,
    this.clientId,
    this.acceptedAt,
    this.createdAt,
  });

  factory Invitation.fromJson(Json json) => Invitation(
        id: json.str('id'),
        email: json.str('email'),
        membershipType: json.str('membershipType', MembershipTypes.member),
        status: json.str('status', InvitationStatuses.pending),
        clientId: json.strOrNull('clientId'),
        expiresAt: json.date('expiresAt'),
        acceptedAt: json.date('acceptedAt'),
        createdAt: json.date('createdAt'),
      );

  final String id;
  final String email;
  final String membershipType;

  /// Raw API status (`PENDING`, `ACCEPTED`, `REVOKED`).
  final String status;
  final String? clientId;
  final DateTime? expiresAt;
  final DateTime? acceptedAt;
  final DateTime? createdAt;

  /// Status as the user sees it, folding stale pending invitations into `EXPIRED`.
  String effectiveStatus([DateTime? now]) {
    final expiry = expiresAt;
    if (status == InvitationStatuses.pending && expiry != null && expiry.isBefore(now ?? DateTime.now())) {
      return InvitationStatuses.expired;
    }
    return status;
  }

  /// Only live, pending invitations can be revoked.
  bool canRevoke([DateTime? now]) => effectiveStatus(now) == InvitationStatuses.pending;
}

/// Fields the invite form submits.
class InvitationInput {
  const InvitationInput({
    required this.email,
    required this.membershipType,
    this.clientId,
    this.roleIds = const [],
    this.expiresInHours,
  });

  final String email;
  final String membershipType;
  final String? clientId;
  final List<String> roleIds;
  final int? expiresInHours;

  Json toJson() => {
        'email': email,
        'membershipType': membershipType,
        if (membershipType == MembershipTypes.client) 'clientId': ?clientId,
        if (roleIds.isNotEmpty) 'roleIds': roleIds,
        'expiresInHours': ?expiresInHours,
      };
}

/// What `POST invitations` returns: the link to share with the invitee.
class InvitationLink {
  const InvitationLink({required this.invitationId, required this.acceptUrl, this.expiresAt});

  factory InvitationLink.fromJson(Json json) => InvitationLink(
        invitationId: json.str('invitationId'),
        acceptUrl: json.str('acceptUrl'),
        expiresAt: json.date('expiresAt'),
      );

  final String invitationId;
  final String acceptUrl;
  final DateTime? expiresAt;
}
