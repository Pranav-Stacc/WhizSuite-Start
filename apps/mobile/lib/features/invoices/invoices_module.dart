import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'invoices_routes.dart';
import 'presentation/invoice_detail_screen.dart';
import 'presentation/invoice_form_screen.dart';
import 'presentation/invoices_screen.dart';

final invoicesModule = FeatureModule(
  destinations: [
    AppDestination(
      path: InvoicesRoutes.root,
      icon: Icons.receipt_long_outlined,
      selectedIcon: Icons.receipt_long,
      label: (l10n) => l10n.navInvoices,
      anyOf: const [Permissions.invoicesView],
      audiences: everyAudience,
      group: NavGroup.money,
      primary: false,
    ),
  ],
  routes: [
    destinationRoute(
      InvoicesRoutes.root,
      (state) => InvoicesScreen(initialClientId: state.uri.queryParameters[InvoicesRoutes.clientQuery]),
      routes: [
        childRoute(InvoicesRoutes.createSegment, (_) => const InvoiceFormScreen()),
        childRoute(
          ':${InvoicesRoutes.detailParam}',
          (state) => InvoiceDetailScreen(invoiceId: state.pathParameters[InvoicesRoutes.detailParam]!),
          routes: [
            childRoute(
              InvoicesRoutes.editSegment,
              (state) => InvoiceFormScreen(invoiceId: state.pathParameters[InvoicesRoutes.detailParam]),
            ),
          ],
        ),
      ],
    ),
  ],
);
