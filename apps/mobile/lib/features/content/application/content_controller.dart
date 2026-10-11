import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../access/application/access_controller.dart';
import '../data/content_repository.dart';
import '../domain/content.dart';
import '../domain/content_approval_summary.dart';
import '../domain/content_workflow.dart';

final contentListProvider = FutureProvider.autoDispose<List<Content>>(
  (ref) => ref.watch(contentRepositoryProvider).list(),
);

final contentItemProvider = FutureProvider.autoDispose.family<Content, String>(
  (ref, id) => ref.watch(contentRepositoryProvider).get(id),
);

final contentApprovalSummaryProvider = FutureProvider.autoDispose.family<ContentApprovalSummary?, String>((ref, id) async {
  final allowed = ref.watch(accessPolicyProvider.select((policy) => policy.can(Permissions.approvalsView)));
  if (!allowed) return null;
  try {
    return await ref.watch(contentRepositoryProvider).approvalSummary(id);
  } catch (_) {
    return null;
  }
});

final contentCommentsProvider = FutureProvider.autoDispose.family<List<ContentComment>, String>((ref, id) async {
  final comments = await ref.watch(contentRepositoryProvider).comments(id);
  return comments..sort((a, b) => a.createdAt.compareTo(b.createdAt));
});

/// Brand-kit suggestions for a client; empty when the member cannot read clients.
final contentBrandHintsProvider = FutureProvider.autoDispose.family<BrandHints, String>((ref, clientId) async {
  final allowed = ref.watch(accessPolicyProvider.select((policy) => policy.can(Permissions.clientsView)));
  if (!allowed) return BrandHints.empty;
  return ref.watch(contentRepositoryProvider).brandHints(clientId);
});

/// Platforms with a connected account for a client.
final contentConnectedPlatformsProvider = FutureProvider.autoDispose.family<Set<String>, String>(
  (ref, clientId) => ref.watch(contentRepositoryProvider).connectedPlatforms(clientId),
);

/// Content mutations; each refreshes every view that shows the affected content.
class ContentActions {
  ContentActions(this._ref);

  final Ref _ref;

  ContentRepository get _repo => _ref.read(contentRepositoryProvider);

  Future<Content> create(ContentInput input, {required bool submitForReview}) async {
    final status = submitForReview ? ContentCreatableStatuses.inReview : ContentCreatableStatuses.draft;
    final created = await _repo.create(input, status: status);
    _invalidate();
    return created;
  }

  /// Saves an edit, then applies the status moves the edit implies (see [statusPlanAfterEdit]).
  Future<void> update(Content content, ContentInput input, {required bool submitForReview}) async {
    try {
      await _repo.update(content.id, input, expectedVersion: content.version);
      for (final status in statusPlanAfterEdit(content.status, submitForReview: submitForReview)) {
        await _repo.transition(content.id, status);
      }
    } finally {
      _invalidate(content.id);
    }
  }

  Future<void> transition(String id, String toStatus) async {
    try {
      await _repo.transition(id, toStatus);
    } finally {
      _invalidate(id);
    }
  }

  /// Sets the publish date and, when asked, moves approved content to scheduled.
  Future<void> schedule(Content content, DateTime scheduledAt, {required bool markScheduled}) async {
    try {
      await _repo.setSchedule(content.id, scheduledAt);
      if (markScheduled && canTransitionContent(content.status, ContentStatuses.scheduled)) {
        await _repo.transition(content.id, ContentStatuses.scheduled);
      }
    } finally {
      _invalidate(content.id);
    }
  }

  /// Records a review decision; a note is added to the content's thread when given.
  Future<void> review(String id, String outcome, {String? note}) async {
    try {
      await _repo.review(id, outcome);
      final body = note?.trim() ?? '';
      if (body.isNotEmpty) await _repo.addComment(id, body);
    } finally {
      _invalidate(id);
      _ref.invalidate(contentCommentsProvider(id));
    }
  }

  Future<void> delete(String id) async {
    await _repo.delete(id);
    _invalidate();
  }

  Future<void> reorder(String clientId, List<String> orderedIds) async {
    try {
      await _repo.reorder(clientId, orderedIds);
    } finally {
      _ref.invalidate(contentListProvider);
    }
  }

  Future<void> addComment(String id, String body) async {
    await _repo.addComment(id, body);
    _ref.invalidate(contentCommentsProvider(id));
  }

  Future<CaptionSuggestion> writeCaption({required String topic, String? tone, String? platform, int? maxLength}) =>
      _repo.writeCaption(topic: topic, tone: tone, platform: platform, maxLength: maxLength);

  Future<List<String>> suggestHashtags({required String topic, required int count}) =>
      _repo.suggestHashtags(topic: topic, count: count);

  void _invalidate([String? id]) {
    _ref.invalidate(contentListProvider);
    if (id != null) _ref.invalidate(contentItemProvider(id));
  }
}

final contentActionsProvider = Provider<ContentActions>(ContentActions.new);
