import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/contracts/contracts.g.dart';
import '../../features/access/presentation/permission_gate.dart';
import '../../features/search/search_routes.dart';
import '../../l10n/app_localizations.dart';

/// App-bar entry to global search, shown to members who can search the workspace.
class SearchAction extends StatelessWidget {
  const SearchAction({super.key});

  @override
  Widget build(BuildContext context) => PermissionGate(
        anyOf: const [Permissions.orgView],
        child: IconButton(
          tooltip: AppLocalizations.of(context).navSearch,
          icon: const Icon(Icons.search),
          onPressed: () => context.push(SearchRoutes.root),
        ),
      );
}
