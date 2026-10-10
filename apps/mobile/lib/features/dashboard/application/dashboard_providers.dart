import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../access/application/access_controller.dart';
import '../../auth/application/session_controller.dart';
import '../../profile/data/profile_repository.dart';
import '../data/dashboard_repository.dart';
import '../domain/dashboard_models.dart';
import '../domain/dashboard_summaries.dart';

// Sources: one per endpoint, so each section loads (and fails) on its own.
// Only watched by widgets whose permission is held.

final dashboardTasksProvider = FutureProvider.autoDispose<List<WorkTask>>(
  (ref) => ref.watch(dashboardRepositoryProvider).tasks(),
);

final dashboardContentProvider = FutureProvider.autoDispose<List<ContentRef>>(
  (ref) => ref.watch(dashboardRepositoryProvider).content(),
);

final dashboardApprovalsProvider = FutureProvider.autoDispose<List<ApprovalRef>>(
  (ref) => ref.watch(dashboardRepositoryProvider).approvals(),
);

final dashboardInvoicesProvider = FutureProvider.autoDispose<List<InvoiceRef>>(
  (ref) => ref.watch(dashboardRepositoryProvider).invoices(),
);

final dashboardCalendarProvider = FutureProvider.autoDispose<List<CalendarEntry>>(
  (ref) => ref.watch(dashboardRepositoryProvider).calendar(),
);

// Summaries derived from the sources.

final myWorkProvider = FutureProvider.autoDispose<MyWorkSummary>((ref) async {
  final session = await ref.watch(sessionProvider.future);
  final tasks = await ref.watch(dashboardTasksProvider.future);
  return MyWorkSummary.of(tasks, userId: session?.userId ?? '', now: DateTime.now());
});

final contentSummaryProvider = FutureProvider.autoDispose<ContentSummary>(
  (ref) async => ContentSummary.of(await ref.watch(dashboardContentProvider.future)),
);

final approvalSummaryProvider = FutureProvider.autoDispose<ApprovalSummary>(
  (ref) async => ApprovalSummary.of(await ref.watch(dashboardApprovalsProvider.future), now: DateTime.now()),
);

final receivablesProvider = FutureProvider.autoDispose<ReceivablesSummary>(
  (ref) async => ReceivablesSummary.of(await ref.watch(dashboardInvoicesProvider.future), now: DateTime.now()),
);

/// Calendar items (projects.view) and scheduled content (content.view), whichever are permitted.
final upcomingProvider = FutureProvider.autoDispose<List<UpcomingItem>>((ref) async {
  final policy = ref.watch(accessPolicyProvider);
  final calendar = policy.can(Permissions.projectsView)
      ? await ref.watch(dashboardCalendarProvider.future)
      : const <CalendarEntry>[];
  final content = policy.can(Permissions.contentView)
      ? await ref.watch(dashboardContentProvider.future)
      : const <ContentRef>[];
  return upcomingItems(calendar: calendar, content: content, now: DateTime.now());
});

/// Counts that drive the overview greeting and "all clear" state.
/// Each source is read only when the member may see it, so permissions stay honest.
final dashboardFocusProvider = Provider.autoDispose<DashboardFocus>((ref) {
  final policy = ref.watch(accessPolicyProvider);

  var ready = true;
  T? take<T>(bool allowed, AsyncValue<T> value) {
    if (!allowed) return null;
    if (!value.hasValue && !value.hasError) ready = false;
    return value.value;
  }

  final work = take(policy.can(Permissions.tasksView), ref.watch(myWorkProvider));
  final approvals = take(policy.can(Permissions.approvalsView), ref.watch(approvalSummaryProvider));
  final upcoming = take(
    policy.canAny(const [Permissions.projectsView, Permissions.contentView]),
    ref.watch(upcomingProvider),
  );
  final receivables = take(policy.can(Permissions.invoicesView), ref.watch(receivablesProvider));
  final content = take(policy.can(Permissions.contentView), ref.watch(contentSummaryProvider));

  return DashboardFocus(
    ready: ready,
    urgentTasks: work?.urgent ?? 0,
    openTasks: work?.open ?? 0,
    pendingApprovals: approvals?.pending.length ?? 0,
    upcoming: upcoming?.length ?? 0,
    outstandingMinor: receivables?.outstandingMinor ?? 0,
    contentWaiting: (content?.inReview ?? 0) + (content?.changesRequested ?? 0),
    canSeeWork: policy.canAny(const [
      Permissions.tasksView,
      Permissions.approvalsView,
      Permissions.projectsView,
      Permissions.contentView,
      Permissions.invoicesView,
    ]),
  );
});

/// Actionable signals for the staff overview greeting and empty state.
class DashboardFocus {
  const DashboardFocus({
    required this.ready,
    required this.urgentTasks,
    required this.openTasks,
    required this.pendingApprovals,
    required this.upcoming,
    required this.outstandingMinor,
    required this.contentWaiting,
    required this.canSeeWork,
  });

  /// False while any permitted source is still loading — avoids a false "all clear".
  final bool ready;
  final int urgentTasks;
  final int openTasks;
  final int pendingApprovals;
  final int upcoming;
  final int outstandingMinor;
  final int contentWaiting;
  final bool canSeeWork;

  /// Items that need a decision or action today.
  int get attentionCount => urgentTasks + pendingApprovals + (outstandingMinor > 0 ? 1 : 0) + contentWaiting;

  bool get hasLists => openTasks > 0 || pendingApprovals > 0 || upcoming > 0;

  bool get isClear => ready && canSeeWork && attentionCount == 0 && !hasLists;
}

/// Every source with the permission that unlocks it; drives pull-to-refresh.
final List<({String permission, FutureProvider<Object?> source})> dashboardSources = [
  (permission: Permissions.tasksView, source: dashboardTasksProvider),
  (permission: Permissions.contentView, source: dashboardContentProvider),
  (permission: Permissions.approvalsView, source: dashboardApprovalsProvider),
  (permission: Permissions.invoicesView, source: dashboardInvoicesProvider),
  (permission: Permissions.projectsView, source: dashboardCalendarProvider),
];

/// Reloads every permitted section plus the profile and access policy.
/// Section failures are shown inline, so they never fail the refresh gesture.
Future<void> refreshDashboard(WidgetRef ref) async {
  final policy = ref.read(accessPolicyProvider);
  ref.invalidate(profileProvider);
  await Future.wait<void>([
    ref.read(accessProvider.notifier).refresh(),
    for (final entry in dashboardSources)
      if (policy.can(entry.permission)) ref.refresh(entry.source.future).then<void>((_) {}, onError: (Object _) {}),
  ]);
}
