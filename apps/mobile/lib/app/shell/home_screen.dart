import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_tokens.dart';
import '../../core/widgets/fade_slide_in.dart';
import '../../features/access/application/access_controller.dart';
import '../../features/auth/application/session_controller.dart';
import '../../features/notifications/application/notifications_controller.dart';
import '../../features/notifications/presentation/notification_bell.dart';
import '../../features/profile/data/profile_repository.dart';
import '../../l10n/app_localizations.dart';
import '../navigation/app_routes.dart';
import '../navigation/destinations.dart';

/// Landing screen: greeting, unread summary and shortcuts to every permitted area.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  static const _minTileWidth = 160.0;
  static const _tileAspect = 1.6;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final session = ref.watch(sessionProvider).value;
    final profile = ref.watch(profileProvider).value;
    final unread = ref.watch(unreadNotificationCountProvider);
    if (session == null) return const SizedBox.shrink();

    final shortcuts = NavigationModel(session, ref.watch(accessPolicyProvider))
        .visible
        .where((d) => d.path != AppRoutes.home)
        .toList();
    final name = profile?.firstName ?? profile?.displayName ?? session.email;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.navHome), actions: const [NotificationBell()]),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(profileProvider);
          await ref.read(accessProvider.notifier).refresh();
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.all(tokens.lg),
          children: [
            FadeSlideIn(child: Text(l10n.homeGreeting(name), style: text.headlineMedium)),
            SizedBox(height: tokens.xs),
            FadeSlideIn(index: 1, child: Text(l10n.homeSubtitle, style: text.bodyLarge?.copyWith(color: tokens.muted))),
            SizedBox(height: tokens.xl),
            if (unread > 0)
              FadeSlideIn(
                index: 2,
                child: Card(
                  child: ListTile(
                    leading: Icon(Icons.notifications_active_outlined, color: tokens.primary),
                    title: Text(l10n.notificationsUnread(unread)),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.go(AppRoutes.notifications),
                  ),
                ),
              ),
            SizedBox(height: tokens.lg),
            LayoutBuilder(
              builder: (context, constraints) => GridView.count(
                crossAxisCount: (constraints.maxWidth / _minTileWidth).floor().clamp(2, 4),
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: tokens.md,
                crossAxisSpacing: tokens.md,
                childAspectRatio: _tileAspect,
                children: [
                  for (final (index, destination) in shortcuts.indexed)
                    FadeSlideIn(index: index + 3, child: _ShortcutTile(destination: destination)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ShortcutTile extends StatelessWidget {
  const _ShortcutTile({required this.destination});

  final AppDestination destination;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.go(destination.path),
        child: Padding(
          padding: EdgeInsets.all(tokens.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(destination.icon, color: tokens.secondary),
              Text(destination.label(l10n), style: Theme.of(context).textTheme.titleSmall),
            ],
          ),
        ),
      ),
    );
  }
}
