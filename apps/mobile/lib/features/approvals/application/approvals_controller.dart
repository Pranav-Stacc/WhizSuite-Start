import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../access/application/access_controller.dart';
import '../../content/application/content_controller.dart';
import '../../content/domain/content.dart';
import '../data/approvals_repository.dart';
import '../domain/approval.dart';

final approvalsProvider = FutureProvider.autoDispose<List<ApprovalRequest>>(
  (ref) => ref.watch(approvalsRepositoryProvider).list(),
);

final approvalProvider = FutureProvider.autoDispose.family<ApprovalRequest, String>(
  (ref, id) => ref.watch(approvalsRepositoryProvider).get(id),
);

/// Pending approval for a content item, when the member may list approvals.
final pendingContentApprovalProvider = Provider.autoDispose.family<ApprovalRequest?, String>((ref, contentId) {
  final allowed = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.approvalsView)));
  if (!allowed) return null;
  final items = ref.watch(approvalsProvider).value;
  if (items == null) return null;
  return pendingApprovalFor(items, subjectType: FeedbackSubjectTypes.content, subjectId: contentId);
});

/// Content titles keyed by id, for subject labels when the member may read content.
final approvalSubjectTitlesProvider = Provider.autoDispose<Map<String, String>>((ref) {
  final allowed = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.contentView)));
  if (!allowed) return const {};
  final items = ref.watch(contentListProvider).value ?? const <Content>[];
  return {
    for (final item in items)
      if (item.title.trim().isNotEmpty) item.id: item.title.trim(),
  };
});

/// Approve / reject / request-changes mutations.
class ApprovalsActions {
  ApprovalsActions(this._ref);

  final Ref _ref;

  ApprovalsRepository get _repo => _ref.read(approvalsRepositoryProvider);

  Future<ApprovalRequest> act(String id, {required String action, String? comment}) async {
    final updated = await _repo.act(id, action: action, comment: comment?.trim().isEmpty == true ? null : comment?.trim());
    _invalidate(id);
    return updated;
  }

  Future<ApprovalRequest> request({
    required String subjectType,
    required String subjectId,
    required String subjectVersion,
    required List<({String name, String? rule, List<String>? approverIds})> steps,
  }) async {
    final created = await _repo.request(
      subjectType: subjectType,
      subjectId: subjectId,
      subjectVersion: subjectVersion,
      steps: steps,
    );
    _invalidate();
    return created;
  }

  void _invalidate([String? id]) {
    _ref.invalidate(approvalsProvider);
    if (id != null) _ref.invalidate(approvalProvider(id));
  }
}

final approvalsActionsProvider = Provider<ApprovalsActions>(ApprovalsActions.new);
