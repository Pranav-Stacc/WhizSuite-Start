import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../../roles/domain/role.dart';
import 'member_position.dart';

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
    this.positions = const [],
    this.overrideCount = 0,
    this.joinedAt,
    this.employmentType,
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
      positions: json.objects('designations').map(MemberPosition.fromJson).toList(),
      overrideCount: json.integerOrNull('overrideCount') ?? 0,
      joinedAt: json.date('createdAt'),
      employmentType: _employmentType(json.strOrNull('employmentType')),
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
  final List<MemberPosition> positions;
  final int overrideCount;
  final DateTime? joinedAt;
  final String? employmentType;

  static String? _employmentType(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    return EmploymentTypes.values.contains(raw) ? raw : null;
  }

  Set<String> get roleIds => {for (final role in roles) role.id};

  MemberPosition? get primaryPosition {
    for (final position in positions) {
      if (position.isPrimary) return position;
    }
    return positions.firstOrNull;
  }

  Set<String> get departmentIds => {for (final p in positions) p.departmentId};

  bool get isStaff => staffMembershipTypes.contains(membershipType);

  /// The API only changes ADMIN/MEMBER memberships, and never the caller's own.
  bool isManageableBy(String? actorUserId) => isStaff && userId != actorUserId && status == MemberStatuses.active;
}
