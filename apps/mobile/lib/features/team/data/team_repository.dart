import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/invitation.dart';
import '../domain/member.dart';

class TeamRepository {
  TeamRepository(this._api);

  final ApiClient _api;

  String get _members => _api.org('members');
  String get _invitations => _api.org('invitations');

  Future<List<Member>> members() async => jsonList(await _api.get<Object?>(_members)).map(Member.fromJson).toList();

  Future<void> assignRoles(String userId, List<String> roleIds) =>
      _api.put<Object?>('$_members/$userId/roles', body: {'roleIds': roleIds});

  Future<void> changeType(String userId, String membershipType) =>
      _api.patch<Object?>('$_members/$userId', body: {'membershipType': membershipType});

  Future<void> deactivate(String userId) => _api.delete<Object?>('$_members/$userId');

  Future<List<Invitation>> invitations() async =>
      jsonList(await _api.get<Object?>(_invitations)).map(Invitation.fromJson).toList();

  Future<InvitationLink> invite(InvitationInput input) async =>
      InvitationLink.fromJson(jsonObject(await _api.post<Object?>(_invitations, body: input.toJson())));

  Future<void> revoke(String invitationId) => _api.delete<Object?>('$_invitations/$invitationId');
}

final teamRepositoryProvider = Provider<TeamRepository>((ref) => TeamRepository(ref.watch(apiClientProvider)));
