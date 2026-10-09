import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/approval.dart';

/// Org-scoped approvals API (`v1/organizations/:orgId/approvals`).
class ApprovalsRepository {
  ApprovalsRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('approvals');

  Future<List<ApprovalRequest>> list() async =>
      jsonList(await _api.get<Object?>(_base)).map(ApprovalRequest.fromJson).toList();

  Future<ApprovalRequest> get(String id) async =>
      ApprovalRequest.fromJson(jsonObject(await _api.get<Object?>('$_base/$id')));

  /// Creates a multi-step approval for [subjectType]/[subjectId].
  Future<ApprovalRequest> request({
    required String subjectType,
    required String subjectId,
    required String subjectVersion,
    required List<({String name, String? rule, List<String>? approverIds})> steps,
  }) async =>
      ApprovalRequest.fromJson(
        jsonObject(
          await _api.post<Object?>(
            _base,
            body: {
              'subjectType': subjectType,
              'subjectId': subjectId,
              'subjectVersion': subjectVersion,
              'steps': [
                for (final step in steps)
                  {
                    'name': step.name,
                    'rule': ?step.rule,
                    'approverIds': ?step.approverIds,
                  },
              ],
            },
          ),
        ),
      );

  /// Records approve / reject / request-changes on the current pending step.
  Future<ApprovalRequest> act(String id, {required String action, String? comment}) async =>
      ApprovalRequest.fromJson(
        jsonObject(
          await _api.post<Object?>(
            '$_base/$id/act',
            body: {
              'action': action,
              'comment': ?comment,
            },
          ),
        ),
      );
}

final approvalsRepositoryProvider =
    Provider<ApprovalsRepository>((ref) => ApprovalsRepository(ref.watch(apiClientProvider)));
