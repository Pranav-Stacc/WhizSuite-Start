import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'presentation/report_detail_screen.dart';
import 'presentation/reports_screen.dart';
import 'reports_routes.dart';

final reportsModule = FeatureModule(
  destinations: [
    AppDestination(
      path: ReportsRoutes.root,
      icon: Icons.insights_outlined,
      selectedIcon: Icons.insights,
      label: (l10n) => l10n.navReports,
      anyOf: const [Permissions.reportsView],
      audiences: everyAudience,
      group: NavGroup.money,
    ),
  ],
  routes: [
    destinationRoute(
      ReportsRoutes.root,
      (state) => ReportsScreen(
            initialClientId: state.uri.queryParameters[ReportsRoutes.clientQuery],
            initialTab: state.uri.queryParameters[ReportsRoutes.tabQuery],
          ),
      routes: [
        childRoute(
          ':${ReportsRoutes.detailParam}',
          (state) => ReportDetailScreen(reportId: state.pathParameters[ReportsRoutes.detailParam]!),
        ),
      ],
    ),
  ],
);
