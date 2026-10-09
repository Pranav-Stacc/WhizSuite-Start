import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/connectivity/connectivity.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/state_views.dart';
import '../../features/access/application/access_controller.dart';
import '../../features/auth/application/session_controller.dart';
import '../../features/notifications/application/notification_delivery.dart';
import '../../l10n/app_localizations.dart';
import '../navigation/app_routes.dart';
import '../navigation/destinations.dart';

/// Signed-in frame: permission-filtered navigation, offline banner, notification delivery,
/// and a guard that blocks destinations the member's roles do not grant.
class AppShell extends ConsumerStatefulWidget {
  const AppShell({required this.location, required this.child, super.key});

  /// Width at which the bottom bar becomes a side rail.
  static const railBreakpoint = 840.0;

  final String location;
  final Widget child;

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  late final AppLifecycleListener _lifecycle;
  final _subscriptions = <StreamSubscription<Object?>>[];
  bool _deliveryStarted = false;

  @override
  void initState() {
    super.initState();
    _lifecycle = AppLifecycleListener(onResume: () => ref.read(accessProvider.notifier).refresh());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_deliveryStarted) return;
    _deliveryStarted = true;
    final delivery = ref.read(notificationDeliveryProvider);
    _subscriptions
      ..add(delivery.foreground.listen((n) => _toast(n.title)))
      ..add(delivery.opened.listen((_) {
        if (mounted) context.go(AppRoutes.notifications);
      }));
    delivery.start(l10n: AppLocalizations.of(context), locale: Localizations.localeOf(context).toLanguageTag());
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    for (final subscription in _subscriptions) {
      subscription.cancel();
    }
    super.dispose();
  }

  void _toast(String title) {
    final l10n = AppLocalizations.of(context);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(title),
          action: SnackBarAction(label: l10n.notificationsOpen, onPressed: () => context.go(AppRoutes.notifications)),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider).value;
    final access = ref.watch(accessProvider);
    if (session == null) return const SizedBox.shrink();

    final navigation = NavigationModel(session, ref.watch(accessPolicyProvider));
    final tabs = [
      for (final d in navigation.primary) _Tab(d.path, d.icon, d.selectedIcon, d.label),
      if (navigation.secondaryGroups.isNotEmpty)
        _Tab(AppRoutes.more, Icons.menu, Icons.menu_open, (l10n) => l10n.navMore),
    ];
    // Off-tab routes (notifications, settings pages) highlight "More" when it exists.
    final selected = _selectedIndex(tabs) ?? (navigation.secondaryGroups.isNotEmpty ? tabs.length - 1 : null);
    final body = Column(children: [const OfflineBanner(), Expanded(child: _guarded(navigation, access))]);
    final l10n = AppLocalizations.of(context);

    if (tabs.length < 2) return Scaffold(body: body);

    final wide = MediaQuery.sizeOf(context).width >= AppShell.railBreakpoint;
    if (wide) {
      return Scaffold(
        body: Row(
          children: [
            NavigationRail(
              extended: true,
              selectedIndex: selected,
              onDestinationSelected: (i) => context.go(tabs[i].path),
              destinations: [
                for (final tab in tabs)
                  NavigationRailDestination(
                    icon: Icon(tab.icon),
                    selectedIcon: Icon(tab.selectedIcon),
                    label: Text(tab.label(l10n)),
                  ),
              ],
            ),
            const VerticalDivider(width: 1),
            Expanded(child: body),
          ],
        ),
      );
    }
    return Scaffold(
      body: body,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selected ?? 0,
        onDestinationSelected: (i) => context.go(tabs[i].path),
        destinations: [
          for (final tab in tabs)
            NavigationDestination(icon: Icon(tab.icon), selectedIcon: Icon(tab.selectedIcon), label: tab.label(l10n)),
        ],
      ),
    );
  }

  /// Blocks routes whose permissions the member lacks; shows a skeleton until access is known.
  Widget _guarded(NavigationModel navigation, AsyncValue<Object?> access) {
    final destination = destinationFor(widget.location);
    if (destination == null || destination.anyOf.isEmpty) return widget.child;
    if (access.hasError && !access.hasValue) {
      return ErrorState(error: access.error!, onRetry: () => ref.invalidate(accessProvider));
    }
    if (!access.hasValue) return const SkeletonList();
    return navigation.visible.contains(destination) ? widget.child : const ForbiddenState();
  }

  /// Index of the tab owning the current location, or null when no tab owns it.
  int? _selectedIndex(List<_Tab> tabs) {
    for (var i = 0; i < tabs.length; i++) {
      final path = tabs[i].path;
      if (widget.location == path || widget.location.startsWith('$path/')) return i;
    }
    return null;
  }
}

class _Tab {
  const _Tab(this.path, this.icon, this.selectedIcon, this.label);

  final String path;
  final IconData icon;
  final IconData selectedIcon;
  final String Function(AppLocalizations l10n) label;
}
