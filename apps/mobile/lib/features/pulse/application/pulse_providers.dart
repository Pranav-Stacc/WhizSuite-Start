import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../access/application/access_controller.dart';
import '../../dashboard/application/dashboard_providers.dart';
import '../../notifications/application/notifications_controller.dart';
import '../data/pulse_ai_repository.dart';
import '../domain/pulse_assembler.dart';
import '../domain/pulse_models.dart';

final pulseDigestProvider = Provider.autoDispose<PulseDigest>((ref) {
  final policy = ref.watch(accessPolicyProvider);
  final now = DateTime.now();

  var ready = true;
  T? take<T>(bool allowed, AsyncValue<T> value) {
    if (!allowed) return null;
    if (!value.hasValue && !value.hasError) ready = false;
    return value.value;
  }

  final work = take(policy.can(Permissions.tasksView), ref.watch(myWorkProvider));
  final approvals = take(policy.can(Permissions.approvalsView), ref.watch(approvalSummaryProvider));
  final upcoming = take(
    policy.canAny(const [Permissions.calendarView, Permissions.contentView, Permissions.projectsView]),
    ref.watch(upcomingProvider),
  );
  final calendar = take(policy.can(Permissions.calendarView), ref.watch(dashboardCalendarProvider));
  final content = take(policy.can(Permissions.contentView), ref.watch(dashboardContentProvider));
  final invoices = take(policy.can(Permissions.invoicesView), ref.watch(dashboardInvoicesProvider));
  final notifications = ref.watch(notificationsProvider).value;

  final titles = <String, String>{for (final c in content ?? const []) c.id: c.title};

  return assemblePulseDigest(
    now: now,
    ready: ready,
    work: work,
    approvals: approvals,
    upcoming: upcoming,
    calendar: calendar,
    content: content,
    invoices: invoices,
    notifications: notifications,
    contentTitles: titles,
  );
});

final pulseAiSummaryProvider = FutureProvider.autoDispose<String?>((ref) async {
  final policy = ref.watch(accessPolicyProvider);
  if (!policy.can(Permissions.contentView)) return null;
  final digest = ref.watch(pulseDigestProvider);
  if (!digest.ready) return null;
  final source = pulseBriefingSource(digest);
  if (source.trim().isEmpty) return null;
  try {
    return await ref.read(pulseAiRepositoryProvider).summarizeBriefing(source);
  } catch (_) {
    return null;
  }
});

Future<void> refreshPulse(WidgetRef ref) async {
  await refreshDashboard(ref);
  await ref.read(notificationsProvider.notifier).reload();
  ref.invalidate(pulseAiSummaryProvider);
}
