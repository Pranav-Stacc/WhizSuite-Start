import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/page_scaffold.dart';
import '../../../l10n/app_localizations.dart';
import '../application/dashboard_providers.dart';
import 'home_command_board.dart';

/// Staff home: creative desk board with pulse metrics, action feed, and quick create.
class StaffDashboard extends ConsumerWidget {
  const StaffDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return PageScaffold(
      title: l10n.navHome,
      body: HomeCommandBoard(onRefresh: () => refreshDashboard(ref)),
    );
  }
}
