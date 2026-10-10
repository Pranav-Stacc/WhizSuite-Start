import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../access/application/access_controller.dart';
import '../../auth/application/session_controller.dart';
import '../../departments/application/departments_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../roles/application/roles_controller.dart';
import '../data/team_repository.dart';
import '../domain/invitation.dart';
import '../domain/member.dart';
import '../domain/member_access.dart';
import '../domain/member_document.dart';
import '../domain/role_assignment_scope.dart';

const _typeOrder = [MembershipTypes.owner, MembershipTypes.admin, MembershipTypes.member, MembershipTypes.client];

/// Members ordered by membership type (owner first), then name.
final membersProvider = FutureProvider.autoDispose<List<Member>>((ref) async {
  final members = await ref.watch(teamRepositoryProvider).members();
  int rank(Member m) => _typeOrder.indexOf(m.membershipType);
  return members
    ..sort((a, b) {
      final byType = rank(a).compareTo(rank(b));
      return byType != 0 ? byType : a.name.toLowerCase().compareTo(b.name.toLowerCase());
    });
});

final memberProvider = FutureProvider.autoDispose.family<Member?, String>((ref, userId) async {
  final members = await ref.watch(membersProvider.future);
  return members.where((m) => m.userId == userId).firstOrNull;
});

final memberAccessProvider = FutureProvider.autoDispose.family<MemberAccess, String>((ref, userId) async {
  return ref.watch(teamRepositoryProvider).access(userId);
});

final memberDocumentsProvider = FutureProvider.autoDispose.family<List<MemberDocument>, String>(
  (ref, userId) => ref.watch(teamRepositoryProvider).documents(userId),
);

/// Invitations, newest first (API order).
final invitationsProvider = FutureProvider.autoDispose<List<Invitation>>(
  (ref) => ref.watch(teamRepositoryProvider).invitations(),
);

/// The signed-in user's id, used to keep people from editing their own membership.
final currentUserIdProvider = Provider.autoDispose<String?>((ref) => ref.watch(sessionProvider).value?.userId);

/// Member and invitation mutations; each refreshes every view that shows people or role counts.
class TeamActions {
  TeamActions(this._ref);

  final Ref _ref;

  TeamRepository get _repo => _ref.read(teamRepositoryProvider);

  Future<void> assignRoles(
    String userId,
    List<String> roleIds, {
    List<RoleAssignmentScope>? scopes,
  }) async {
    await _repo.assignRoles(userId, roleIds, scopes: scopes);
    await _afterMemberChange(userId);
  }

  Future<void> changeType(String userId, String membershipType) async {
    await _repo.changeType(userId, membershipType);
    await _afterMemberChange(userId);
  }

  Future<void> deactivate(String userId) async {
    await _repo.deactivate(userId);
    await _afterMemberChange(userId);
  }

  Future<void> setPositions(String userId, List<String> designationIds, {String? primaryId}) async {
    await _repo.setPositions(userId, designationIds: designationIds, primaryId: primaryId);
    await _afterMemberChange(userId);
    _ref.invalidate(departmentsProvider);
  }

  Future<void> updateTitle(String userId, String? title) async {
    await _repo.updateTitle(userId, title);
    await _afterMemberChange(userId);
  }

  Future<void> updateEmployment(String userId, String? employmentType) async {
    await _repo.updateEmployment(userId, employmentType);
    await _afterMemberChange(userId);
  }

  Future<MemberDocument> sendDocument(
    String userId, {
    required String type,
    required String title,
    String? templateId,
  }) async {
    final doc = await _repo.sendDocument(userId, type: type, title: title, templateId: templateId);
    _ref.invalidate(memberDocumentsProvider(userId));
    return doc;
  }

  Future<void> setPermissions(String userId, List<PermissionOverride> overrides) async {
    await _repo.setPermissions(userId, overrides);
    _ref.invalidate(memberAccessProvider(userId));
    await _afterMemberChange(userId);
  }

  Future<InvitationLink> invite(InvitationInput input) async {
    final link = await _repo.invite(input);
    _ref.invalidate(invitationsProvider);
    return link;
  }

  Future<void> revoke(String invitationId) async {
    await _repo.revoke(invitationId);
    _ref.invalidate(invitationsProvider);
  }

  Future<void> _afterMemberChange(String userId) async {
    _ref
      ..invalidate(membersProvider)
      ..invalidate(memberProvider(userId))
      ..invalidate(memberDirectoryProvider)
      ..invalidate(rolesProvider);
    if (userId == _ref.read(sessionProvider).value?.userId) {
      await _ref.read(accessProvider.notifier).refresh();
    }
  }
}

final teamActionsProvider = Provider<TeamActions>(TeamActions.new);
