import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../../roles/domain/role.dart';

/// Membership lifecycle states shown on the team screen.
abstract final class MemberStatuses {
  static const active = 'ACTIVE';
  static const invited = 'INVITED';
  static const deactivated = 'DEACTIVATED';

  static const values = [active, invited, deactivated];
}

/// Membership types an admin can switch a staff member between (the API's `STAFF_MEMBERSHIP_TYPES`).
const staffMembershipTypes = [MembershipTypes.admin, MembershipTypes.member];

/// Membership types an invitation can grant; ownership is never invited.
final invitableMembershipTypes = MembershipTypes.values.where((t) => t != MembershipTypes.owner).toList();

/// A person in the organisation, keyed by user id (what member endpoints take).
class Member {
  const Member({
    required this.userId,
    required this.membershipId,
    required this.email,
    required this.name,
    required this.membershipType,
    required this.status,
    this.title,
    this.avatarUrl,
    this.roles = const [],
    this.joinedAt,
  });

  factory Member.fromJson(Json json) {
    final email = json.str('email');
    final type = json.str('membershipType');
    final status = json.str('status');
    return Member(
      userId: json.str('id'),
      membershipId: json.str('membershipId'),
      email: email,
      name: json.strOrNull('name') ?? email,
      title: json.strOrNull('title'),
      avatarUrl: json.strOrNull('avatarUrl'),
      membershipType: MembershipTypes.values.contains(type) ? type : MembershipTypes.member,
      status: MemberStatuses.values.contains(status) ? status : MemberStatuses.active,
      roles: json.objects('roles').map(RoleSummary.fromJson).toList(),
      joinedAt: json.date('createdAt'),
    );
  }

  final String userId;
  final String membershipId;
  final String email;
  final String name;
  final String? title;
  final String? avatarUrl;
  final String membershipType;
  final String status;
  final List<RoleSummary> roles;
  final DateTime? joinedAt;

  Set<String> get roleIds => {for (final role in roles) role.id};

  bool get isStaff => staffMembershipTypes.contains(membershipType);

  /// The API only changes ADMIN/MEMBER memberships, and never the caller's own.
  bool isManageableBy(String? actorUserId) => isStaff && userId != actorUserId && status == MemberStatuses.active;
}
