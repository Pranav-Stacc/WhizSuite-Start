import '../../../core/contracts/contracts.g.dart';

/// The happy path a post travels; `CHANGES_REQUESTED` is a detour back before review.
const List<String> contentPipeline = [
  ContentStatuses.draft,
  ContentStatuses.inReview,
  ContentStatuses.approved,
  ContentStatuses.scheduled,
  ContentStatuses.published,
];

/// Targets only a member holding `approvals.approve` may move content to (same rule as the web).
const Set<String> approverOnlyTargets = {
  ContentStatuses.approved,
  ContentStatuses.changesRequested,
  ContentStatuses.published,
};

bool canTransitionContent(String from, String to) => contentTransitions[from]?.contains(to) ?? false;

/// Published content is immutable.
bool isContentEditable(String status) => status != ContentStatuses.published;

/// Editing content in these states voids its approval and sends it back to draft.
bool resetsApprovalOnEdit(String status) =>
    status == ContentStatuses.approved || status == ContentStatuses.scheduled || status == ContentStatuses.inReview;

/// Index of [status] on [contentPipeline]; changes-requested sits at the review step.
int pipelineIndex(String status) =>
    status == ContentStatuses.changesRequested ? contentPipeline.indexOf(ContentStatuses.inReview) : contentPipeline.indexOf(status);

/// What a workflow button does.
enum ContentMoveKind { submit, withdraw, schedule, unschedule, publish, backToDraft }

/// A workflow move offered on the detail screen. Review outcomes (approve / changes / reject)
/// are separate because they go through the review endpoint.
class ContentMove {
  const ContentMove(this.kind, this.target);

  final ContentMoveKind kind;
  final String target;

  bool get approverOnly => approverOnlyTargets.contains(target);

  /// Scheduling needs a publish date first.
  bool needsSchedule(DateTime? scheduledAt) => target == ContentStatuses.scheduled && scheduledAt == null;

  @override
  bool operator ==(Object other) => other is ContentMove && other.kind == kind && other.target == target;

  @override
  int get hashCode => Object.hash(kind, target);
}

/// Workflow moves from [status], limited to transitions the API accepts. Moves out of review are
/// review outcomes and are not listed here except withdrawing back to draft.
List<ContentMove> contentMovesFrom(String status) {
  final allowed = contentTransitions[status] ?? const <String>[];
  ContentMove? move(String target) {
    if (!allowed.contains(target)) return null;
    return switch ((status, target)) {
      (_, ContentStatuses.inReview) => const ContentMove(ContentMoveKind.submit, ContentStatuses.inReview),
      (ContentStatuses.inReview, ContentStatuses.draft) => const ContentMove(ContentMoveKind.withdraw, ContentStatuses.draft),
      (_, ContentStatuses.scheduled) => const ContentMove(ContentMoveKind.schedule, ContentStatuses.scheduled),
      (ContentStatuses.scheduled, ContentStatuses.approved) =>
        const ContentMove(ContentMoveKind.unschedule, ContentStatuses.approved),
      (_, ContentStatuses.published) => const ContentMove(ContentMoveKind.publish, ContentStatuses.published),
      (ContentStatuses.inReview, _) => null,
      (_, ContentStatuses.draft) => const ContentMove(ContentMoveKind.backToDraft, ContentStatuses.draft),
      _ => null,
    };
  }

  const order = [
    ContentStatuses.inReview,
    ContentStatuses.scheduled,
    ContentStatuses.published,
    ContentStatuses.approved,
    ContentStatuses.draft,
  ];
  return [for (final target in order) ?move(target)];
}

/// Transitions to apply after saving an edit, in order. Saving voids approval (back to draft);
/// submitting routes through draft when the API has no direct move to review.
List<String> statusPlanAfterEdit(String current, {required bool submitForReview}) {
  if (!submitForReview) {
    return resetsApprovalOnEdit(current) && canTransitionContent(current, ContentStatuses.draft)
        ? const [ContentStatuses.draft]
        : const [];
  }
  if (current == ContentStatuses.inReview) return const [];
  if (canTransitionContent(current, ContentStatuses.inReview)) return const [ContentStatuses.inReview];
  return const [ContentStatuses.draft, ContentStatuses.inReview];
}

/// Instagram-style planner order (index 0 = top-left): posts never placed by hand lead, newest
/// first, where a new post would land on the feed; hand-placed posts follow in their saved order.
List<T> orderForGrid<T>(
  Iterable<T> items, {
  required int? Function(T item) positionOf,
  required DateTime Function(T item) placedAt,
}) {
  final unplaced = items.where((i) => positionOf(i) == null).toList()..sort((a, b) => placedAt(b).compareTo(placedAt(a)));
  final placed = items.where((i) => positionOf(i) != null).toList()
    ..sort((a, b) => (positionOf(a) ?? 0).compareTo(positionOf(b) ?? 0));
  return [...unplaced, ...placed];
}

/// Returns a copy of [list] with the item at [from] moved to [to].
List<T> moveItem<T>(List<T> list, int from, int to) {
  final next = [...list];
  final item = next.removeAt(from);
  next.insert(to.clamp(0, next.length), item);
  return next;
}
