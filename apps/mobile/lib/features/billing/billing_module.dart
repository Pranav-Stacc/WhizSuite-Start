import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'billing_routes.dart';
import 'presentation/billing_screen.dart';

final billingModule = FeatureModule(
  destinations: [
    AppDestination(
      path: BillingRoutes.root,
      icon: Icons.credit_card_outlined,
      selectedIcon: Icons.credit_card,
      label: (l10n) => l10n.navBilling,
      anyOf: const [Permissions.orgBillingManage],
      audiences: staffOnly,
      group: NavGroup.agency,
      primary: false,
    ),
  ],
  routes: [
    destinationRoute(BillingRoutes.root, (_) => const BillingScreen()),
  ],
);
