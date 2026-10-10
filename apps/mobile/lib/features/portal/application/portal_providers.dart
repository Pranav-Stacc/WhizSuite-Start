import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../access/application/access_controller.dart';
import '../../auth/application/session_controller.dart';
import '../../media/application/media_controller.dart';
import '../../media/domain/media_asset.dart';
import '../../profile/data/profile_repository.dart';
import '../../reports/application/reports_controller.dart';
import '../../reports/domain/metric_series.dart';
import '../../reports/domain/report.dart';
import '../data/portal_repository.dart';
import '../domain/portal_models.dart';
import '../domain/portal_summary.dart';

/// Client id for the signed-in portal member, or null when not in the portal.
final portalClientIdProvider = Provider<String?>((ref) {
  final session = ref.watch(sessionProvider).value;
  if (session == null || !session.isClientPortal) return null;
  return session.clientId;
});

final portalClientProvider = FutureProvider.autoDispose<PortalClient?>((ref) async {
  final clientId = ref.watch(portalClientIdProvider);
  if (clientId == null || clientId.isEmpty) return null;
  if (!ref.watch(accessPolicyProvider).can(Permissions.clientsView)) return null;
  return ref.watch(portalRepositoryProvider).client(clientId);
});

final portalContentProvider = FutureProvider.autoDispose<List<PortalContent>>(
  (ref) => ref.watch(portalRepositoryProvider).content(),
);

final portalInvoicesProvider = FutureProvider.autoDispose<List<PortalInvoice>>(
  (ref) => ref.watch(portalRepositoryProvider).invoices(),
);

final portalProjectsProvider = FutureProvider.autoDispose<List<PortalProject>>(
  (ref) => ref.watch(portalRepositoryProvider).projects(),
);

final portalRoomsProvider = FutureProvider.autoDispose<List<PortalRoom>>(
  (ref) => ref.watch(portalRepositoryProvider).rooms(),
);

/// Client media for the signed-in portal member (scoped by session clientId).
final portalFilesProvider = FutureProvider.autoDispose<List<MediaAsset>>((ref) async {
  final clientId = ref.watch(portalClientIdProvider);
  if (clientId == null || clientId.isEmpty) return const [];
  if (!ref.watch(accessPolicyProvider).can(Permissions.filesView)) return const [];
  final assets = await ref.watch(mediaAssetsProvider.future);
  return [
    for (final asset in assets)
      if (asset.clientId == clientId) asset,
  ];
});

/// Shared reports visible to the portal client.
final portalReportsProvider = FutureProvider.autoDispose<List<Report>>((ref) async {
  final clientId = ref.watch(portalClientIdProvider);
  if (clientId == null || clientId.isEmpty) return const [];
  if (!ref.watch(accessPolicyProvider).can(Permissions.reportsView)) return const [];
  final reports = await ref.watch(reportsProvider.future);
  return [
    for (final report in reports)
      if (report.clientId == clientId) report,
  ]..sort((a, b) => b.createdAt.compareTo(a.createdAt));
});

/// 30-day analytics snapshot for the portal KPI strip (soft-fails to empty).
final portalAnalyticsProvider = FutureProvider.autoDispose<List<MetricSeries>>((ref) async {
  final clientId = ref.watch(portalClientIdProvider);
  if (clientId == null || clientId.isEmpty) return const [];
  if (!ref.watch(accessPolicyProvider).can(Permissions.reportsView)) return const [];
  try {
    return await ref.watch(analyticsProvider((days: analyticsDefaultRange, clientId: clientId)).future);
  } catch (_) {
    return const [];
  }
});

final portalSummaryProvider = FutureProvider.autoDispose<PortalSummary>((ref) async {
  final policy = ref.watch(accessPolicyProvider);
  final content =
      policy.can(Permissions.contentView) ? await ref.watch(portalContentProvider.future) : const <PortalContent>[];
  final invoices =
      policy.can(Permissions.invoicesView) ? await ref.watch(portalInvoicesProvider.future) : const <PortalInvoice>[];
  final projects =
      policy.can(Permissions.projectsView) ? await ref.watch(portalProjectsProvider.future) : const <PortalProject>[];
  final rooms =
      policy.can(Permissions.chatView) ? await ref.watch(portalRoomsProvider.future) : const <PortalRoom>[];
  return PortalSummary.of(
    content: content,
    invoices: invoices,
    projects: projects,
    rooms: rooms,
    now: DateTime.now(),
  );
});

final List<({String permission, FutureProvider<Object?> source})> portalSources = [
  (permission: Permissions.clientsView, source: portalClientProvider),
  (permission: Permissions.contentView, source: portalContentProvider),
  (permission: Permissions.invoicesView, source: portalInvoicesProvider),
  (permission: Permissions.projectsView, source: portalProjectsProvider),
  (permission: Permissions.chatView, source: portalRoomsProvider),
  (permission: Permissions.filesView, source: portalFilesProvider),
  (permission: Permissions.reportsView, source: portalReportsProvider),
];

/// Permissions that unlock at least one portal KPI tile.
const List<String> portalKpiPermissions = [
  Permissions.contentView,
  Permissions.invoicesView,
  Permissions.chatView,
  Permissions.projectsView,
  Permissions.filesView,
  Permissions.reportsView,
];

Future<void> refreshPortal(WidgetRef ref) async {
  final policy = ref.read(accessPolicyProvider);
  ref.invalidate(profileProvider);
  await Future.wait<void>([
    ref.read(accessProvider.notifier).refresh(),
    for (final entry in portalSources)
      if (policy.can(entry.permission)) ref.refresh(entry.source.future).then<void>((_) {}, onError: (Object _) {}),
  ]);
}
