import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/connectivity/connectivity.dart';
import '../../core/widgets/feedback.dart';
import '../../core/widgets/page_scaffold.dart';
import '../../core/widgets/shell_chrome.dart';
import '../../core/widgets/skeleton.dart';
import '../../core/widgets/state_views.dart';
import '../../features/access/application/access_controller.dart';
import '../../features/auth/application/session_controller.dart';
import '../../features/notifications/application/notification_delivery.dart';
import '../../features/notifications/application/notifications_controller.dart';
import '../../features/notifications/domain/app_notification.dart';
import '../../features/notifications/presentation/notification_bell.dart';
import '../../features/notifications/presentation/notification_links.dart';
import '../../l10n/app_localizations.dart';
import '../navigation/app_routes.dart';
import '../navigation/destinations.dart';
import 'app_sidebar.dart';
import 'creative_bottom_nav.dart';
import 'search_action.dart';

/// Signed-in frame: permission-filtered navigation, offline banner, notification delivery,
/// and a guard that blocks destinations the member's roles do not grant.
class AppShell extends ConsumerStatefulWidget {
  const AppShell({required this.location, required this.child, super.key});

  /// Width at which the bottom bar becomes a permanent sidebar.
  static const railBreakpoint = 840.0;

  final String location;
  final Widget child;

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  static const _shellActions = [SearchAction(), NotificationBell()];

  final _scaffoldKey = GlobalKey<ScaffoldState>();
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
      ..add(delivery.foreground.listen(_toast))
      ..add(delivery.opened.listen(_openFromTray));
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

  void _toast(AppNotification notification) {
    final l10n = AppLocalizations.of(context);
    showToast(
      context,
      notification.title,
      action: SnackBarAction(label: l10n.notificationsOpen, onPressed: () => _open(notification)),
    );
  }

  /// Tray taps carry the notification id; open its subject once the feed knows it.
  Future<void> _openFromTray(String? id) async {
    final feed = id == null ? null : await ref.read(notificationsProvider.future);
    final notification = feed?.where((n) => n.id == id).firstOrNull;
    if (!mounted) return;
    if (notification == null) {
      context.go(AppRoutes.notifications);
    } else {
      _open(notification);
    }
  }

  void _open(AppNotification notification) {
    if (!notification.isRead) ref.read(notificationsProvider.notifier).markRead(notification.id).ignore();
    context.go(notificationLink(notification));
  }

  void _openSidebar() => _scaffoldKey.currentState?.openDrawer();

  void _navigate(String path) {
    final navigator = _scaffoldKey.currentState;
    if (navigator?.isDrawerOpen ?? false) navigator!.closeDrawer();
    context.go(path);
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider).value;
    final access = ref.watch(accessProvider);
    if (session == null) return const SizedBox.shrink();

    final navigation = NavigationModel(session, ref.watch(accessPolicyProvider));
    final tabs = [
      for (final d in navigation.primary)
        CreativeNavTab(path: d.path, icon: d.icon, selectedIcon: d.selectedIcon, label: d.label),
    ];
    final selected = _selectedIndex(tabs);
    final body = ShellActions(
      actions: _shellActions,
      child: Column(children: [const OfflineBanner(), Expanded(child: _guarded(navigation, access))]),
    );

    final sidebar = AppSidebar(
      session: session,
      groups: navigation.sidebarGroups,
      location: widget.location,
      onNavigate: _navigate,
      permanent: false,
    );

    if (tabs.length < 2) {
      return ShellChrome(
        openSidebar: _openSidebar,
        child: Scaffold(key: _scaffoldKey, drawer: sidebar, body: body),
      );
    }

    final wide = MediaQuery.sizeOf(context).width >= AppShell.railBreakpoint;
    if (wide) {
      return Scaffold(
        body: Row(
          children: [
            AppSidebar(
              session: session,
              groups: navigation.sidebarGroups,
              location: widget.location,
              onNavigate: _navigate,
              permanent: true,
            ),
            const VerticalDivider(width: 1),
            Expanded(child: body),
          ],
        ),
      );
    }

    return ShellChrome(
      openSidebar: _openSidebar,
      child: Scaffold(
        key: _scaffoldKey,
        drawer: sidebar,
        body: body,
        bottomNavigationBar: CreativeBottomNav(
          tabs: tabs,
          selectedIndex: selected,
          onSelect: (i) => context.go(tabs[i].path),
        ),
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
  int? _selectedIndex(List<CreativeNavTab> tabs) {
    for (var i = 0; i < tabs.length; i++) {
      final path = tabs[i].path;
      if (widget.location == path || widget.location.startsWith('$path/')) return i;
    }
    return null;
  }
}
