import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_tokens.dart';
import '../../core/widgets/fade_slide_in.dart';
import '../../core/widgets/state_views.dart';
import '../../features/access/application/access_controller.dart';
import '../../features/auth/application/session_controller.dart';
import '../../features/notifications/presentation/notification_bell.dart';
import '../../l10n/app_localizations.dart';
import '../navigation/destinations.dart';

/// Every permitted destination not pinned to the bottom bar, grouped like the web "More" menu.
class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final session = ref.watch(sessionProvider).value;
    if (session == null) return const SizedBox.shrink();
    final groups = NavigationModel(session, ref.watch(accessPolicyProvider)).secondaryGroups;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.navMore), actions: const [NotificationBell()]),
      body: groups.isEmpty
          ? EmptyState(icon: Icons.apps_outlined, title: l10n.navMoreEmpty)
          : RefreshIndicator(
              onRefresh: () => ref.read(accessProvider.notifier).refresh(),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.all(tokens.lg),
                children: [
                  for (final (index, entry) in groups.entries.indexed)
                    FadeSlideIn(
                      index: index,
                      child: Padding(
                        padding: EdgeInsets.only(bottom: tokens.xl),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Semantics(
                              header: true,
                              child: Text(
                                entry.key.label(l10n).toUpperCase(),
                                style: Theme.of(context).textTheme.labelSmall?.copyWith(letterSpacing: 1.6),
                              ),
                            ),
                            SizedBox(height: tokens.sm),
                            Card(
                              child: Column(
                                children: [
                                  for (final (i, destination) in entry.value.indexed) ...[
                                    if (i > 0) const Divider(),
                                    ListTile(
                                      leading: Icon(destination.icon),
                                      title: Text(destination.label(l10n)),
                                      trailing: const Icon(Icons.chevron_right),
                                      onTap: () => context.go(destination.path),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}
