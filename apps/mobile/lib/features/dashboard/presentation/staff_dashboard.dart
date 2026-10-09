import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/state_views.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../application/dashboard_providers.dart';
import 'sections/dashboard_header.dart';
import 'sections/dashboard_kpis.dart';
import 'sections/insight_sections.dart';
import 'sections/work_sections.dart';
import 'widgets/overview_layout.dart';

/// Staff home: greeting, KPIs and the work, money and activity sections the member
/// is permitted to see. Every section loads and fails independently.
class StaffDashboard extends ConsumerWidget {
  const StaffDashboard({super.key});

  /// Stagger index the sections start from, after the header and KPI tiles.
  static const _sectionStagger = 4;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final policy = ref.watch(accessPolicyProvider);
    final sections = <Widget>[
      if (policy.can(Permissions.tasksView)) const MyWorkSection(),
      if (policy.can(Permissions.approvalsView)) const ApprovalsSection(),
      if (policy.canAny(const [Permissions.projectsView, Permissions.contentView])) const UpcomingSection(),
      if (policy.can(Permissions.invoicesView)) const RevenueSection(),
      if (policy.can(Permissions.leadsView)) const PipelineSection(),
      if (policy.can(Permissions.orgView)) const ActivitySection(),
    ];
    final hasKpis = dashboardKpiPermissions.any(policy.can);

    final bare = !hasKpis && sections.isEmpty;

    return PageScaffold(
      title: l10n.navHome,
      body: OverviewScrollView(
        onRefresh: () => refreshDashboard(ref),
        children: [
          const FadeSlideIn(child: DashboardHeader()),
          if (hasKpis) ...[SizedBox(height: tokens.lg), const DashboardKpis()],
          if (sections.isNotEmpty) ...[
            SizedBox(height: tokens.xl),
            OverviewColumns(staggerOffset: _sectionStagger, children: sections),
          ],
          if (bare) ...[
            SizedBox(height: tokens.xl),
            FadeSlideIn(
              index: 1,
              child: EmptyState(
                icon: Icons.dashboard_outlined,
                title: l10n.dashboardEmptyTitle,
                body: l10n.dashboardEmptyBody,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
