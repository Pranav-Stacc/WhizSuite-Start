import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'approvals_routes.dart';
import 'presentation/approval_detail_screen.dart';
import 'presentation/approvals_screen.dart';

final approvalsModule = FeatureModule(
  destinations: [
    AppDestination(
      path: ApprovalsRoutes.root,
      icon: Icons.verified_outlined,
      selectedIcon: Icons.verified,
      label: (l10n) => l10n.navApprovals,
      anyOf: const [Permissions.approvalsView],
      audiences: everyAudience,
      group: NavGroup.content,
      primary: true,
    ),
  ],
  routes: [
    destinationRoute(
      ApprovalsRoutes.root,
      (_) => const ApprovalsScreen(),
      routes: [
        childRoute(
          ':${ApprovalsRoutes.detailParam}',
          (state) => ApprovalDetailScreen(approvalId: state.pathParameters[ApprovalsRoutes.detailParam]!),
        ),
      ],
    ),
  ],
);
