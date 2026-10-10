import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/invitation.dart';
import '../domain/member.dart';
import '../domain/member_access.dart';
import '../domain/member_document.dart';
import '../domain/member_position.dart';
import '../domain/role_assignment_scope.dart';

class TeamRepository {
  TeamRepository(this._api);

  final ApiClient _api;

  String get _members => _api.org('members');
  String get _invitations => _api.org('invitations');

  Future<List<Member>> members() async => jsonList(await _api.get<Object?>(_members)).map(Member.fromJson).toList();

  Future<void> assignRoles(
    String userId,
    List<String> roleIds, {
    List<RoleAssignmentScope>? scopes,
  }) =>
      _api.put<Object?>(
        '$_members/$userId/roles',
        body: {
          'roleIds': roleIds,
          if (scopes != null)
            'scopes': scopes.map((scope) => scope.toJson()).toList(),
        },
      );

  Future<void> changeType(String userId, String membershipType) =>
      _api.patch<Object?>('$_members/$userId', body: {'membershipType': membershipType});

  Future<void> deactivate(String userId) => _api.delete<Object?>('$_members/$userId');

  Future<List<MemberPosition>> setPositions(
    String userId, {
    required List<String> designationIds,
    String? primaryId,
  }) async {
    final body = <String, Object?>{
      'designationIds': designationIds,
      'primaryId': ?primaryId,
    };
    final json = jsonObject(await _api.put<Object?>('$_members/$userId/designations', body: body));
    return json.objects('designations').map(MemberPosition.fromJson).toList();
  }

  Future<String?> updateTitle(String userId, String? title) async {
    final json = jsonObject(await _api.patch<Object?>('$_members/$userId/profile', body: {'title': title}));
    return json.strOrNull('title');
  }

  Future<MemberAccess> access(String userId) async =>
      MemberAccess.fromJson(jsonObject(await _api.get<Object?>('$_members/$userId/access')));

  Future<MemberAccess> setPermissions(String userId, List<PermissionOverride> overrides) async =>
      MemberAccess.fromJson(
        jsonObject(
          await _api.put<Object?>(
            '$_members/$userId/permissions',
            body: {'overrides': overrides.map((o) => o.toJson()).toList()},
          ),
        ),
      );

  Future<List<Invitation>> invitations() async =>
      jsonList(await _api.get<Object?>(_invitations)).map(Invitation.fromJson).toList();

  Future<InvitationLink> invite(InvitationInput input) async =>
      InvitationLink.fromJson(jsonObject(await _api.post<Object?>(_invitations, body: input.toJson())));

  Future<void> revoke(String invitationId) => _api.delete<Object?>('$_invitations/$invitationId');

  Future<String?> updateEmployment(String userId, String? employmentType) async {
    final json = jsonObject(
      await _api.patch<Object?>('$_members/$userId/employment', body: {'employmentType': employmentType}),
    );
    return json.strOrNull('employmentType');
  }

  Future<List<MemberDocument>> documents(String userId) async =>
      jsonList(await _api.get<Object?>('$_members/$userId/documents')).map(MemberDocument.fromJson).toList();

  Future<MemberDocument> sendDocument(
    String userId, {
    required String type,
    required String title,
    String? templateId,
  }) async =>
      MemberDocument.fromJson(
        jsonObject(
          await _api.post<Object?>(
            '$_members/$userId/documents',
            body: {'type': type, 'title': title, if (templateId != null) 'templateId': templateId},
          ),
        ),
      );
}

final teamRepositoryProvider = Provider<TeamRepository>((ref) => TeamRepository(ref.watch(apiClientProvider)));
