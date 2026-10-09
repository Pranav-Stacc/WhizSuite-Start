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

final dashboardClientsProvider = FutureProvider.autoDispose<List<ClientRef>>(
  (ref) => ref.watch(dashboardRepositoryProvider).clients(),
);

final dashboardLeadsProvider = FutureProvider.autoDispose<List<LeadRef>>(
  (ref) => ref.watch(dashboardRepositoryProvider).leads(),
);

final dashboardCalendarProvider = FutureProvider.autoDispose<List<CalendarEntry>>(
  (ref) => ref.watch(dashboardRepositoryProvider).calendar(),
);

final dashboardActivityProvider = FutureProvider.autoDispose<List<ActivityEntry>>(
  (ref) => ref.watch(dashboardRepositoryProvider).activity(),
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

final revenueProvider = FutureProvider.autoDispose<RevenueSeries>(
  (ref) async => RevenueSeries.of(await ref.watch(dashboardInvoicesProvider.future), now: DateTime.now()),
);

final clientSummaryProvider = FutureProvider.autoDispose<ClientSummary>(
  (ref) async => ClientSummary.of(await ref.watch(dashboardClientsProvider.future)),
);

final pipelineProvider = FutureProvider.autoDispose<PipelineSummary>(
  (ref) async => PipelineSummary.of(await ref.watch(dashboardLeadsProvider.future)),
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

/// Every source with the permission that unlocks it; drives pull-to-refresh.
final List<({String permission, FutureProvider<Object?> source})> dashboardSources = [
  (permission: Permissions.tasksView, source: dashboardTasksProvider),
  (permission: Permissions.contentView, source: dashboardContentProvider),
  (permission: Permissions.approvalsView, source: dashboardApprovalsProvider),
  (permission: Permissions.invoicesView, source: dashboardInvoicesProvider),
  (permission: Permissions.clientsView, source: dashboardClientsProvider),
  (permission: Permissions.leadsView, source: dashboardLeadsProvider),
  (permission: Permissions.projectsView, source: dashboardCalendarProvider),
  (permission: Permissions.orgView, source: dashboardActivityProvider),
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
