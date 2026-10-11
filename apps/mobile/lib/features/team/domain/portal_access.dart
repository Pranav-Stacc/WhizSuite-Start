import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// Portal access link modes (`CreatePortalAccessLinkDto.accessMode`).
abstract final class PortalAccessModes {
  static const temporary = 'TEMPORARY';
  static const permanent = 'PERMANENT';

  static const values = [temporary, permanent];
}

/// Response from `POST …/portal-access-links`.
class PortalAccessLink {
  const PortalAccessLink({
    required this.linkId,
    required this.shareUrl,
    required this.accessMode,
    this.membershipTtlHours,
    this.maxUses,
    this.expiresAt,
  });

  factory PortalAccessLink.fromJson(Json json) => PortalAccessLink(
        linkId: json.str('linkId'),
        shareUrl: json.str('shareUrl'),
        accessMode: json.str('accessMode', PortalAccessModes.temporary),
        membershipTtlHours: json.integerOrNull('membershipTtlHours'),
        maxUses: json.integerOrNull('maxUses'),
        expiresAt: json.date('expiresAt'),
      );

  final String linkId;
  final String shareUrl;
  final String accessMode;
  final int? membershipTtlHours;
  final int? maxUses;
  final DateTime? expiresAt;
}
