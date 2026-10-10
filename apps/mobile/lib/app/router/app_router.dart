import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/application/session_controller.dart';
import '../../features/auth/presentation/invite_accept_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/portal_access_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/notifications/presentation/preferences_screen.dart';
import '../../features/settings/presentation/appearance_screen.dart';
import '../../features/settings/presentation/settings_screen.dart';
import '../../features/settings/presentation/storage_settings_screen.dart';
import '../feature_registry.dart';
import '../navigation/app_routes.dart';
import '../shell/app_shell.dart';
import '../shell/home_screen.dart';
import '../shell/more_screen.dart';
import '../shell/splash_screen.dart';

GoRoute _page(String path, Widget screen, {List<RouteBase> routes = const []}) => GoRoute(
      path: path,
      pageBuilder: (context, state) => NoTransitionPage(key: state.pageKey, child: screen),
      routes: routes,
    );

/// One IndexedStack branch per top-level shell destination so tab switches keep state.
List<StatefulShellBranch> _shellBranches() {
  final branches = <StatefulShellBranch>[
    StatefulShellBranch(routes: [_page(AppRoutes.home, const HomeScreen())]),
    StatefulShellBranch(routes: [_page(AppRoutes.more, const MoreScreen())]),
  ];
  for (final module in featureModules) {
    for (final route in module.routes) {
      branches.add(StatefulShellBranch(routes: [route]));
    }
  }
  branches
    ..add(
      StatefulShellBranch(
        routes: [
          GoRoute(path: AppRoutes.notifications, builder: (_, _) => const NotificationsScreen()),
        ],
      ),
    )
    ..add(
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: AppRoutes.settings,
            builder: (_, _) => const SettingsScreen(),
            routes: [
              GoRoute(
                path: AppRoutes.appearance.substring(AppRoutes.settings.length + 1),
                builder: (_, _) => const AppearanceScreen(),
              ),
              GoRoute(
                path: AppRoutes.notificationPreferences.substring(AppRoutes.settings.length + 1),
                builder: (_, _) => const NotificationPreferencesScreen(),
              ),
              GoRoute(
                path: AppRoutes.storage.substring(AppRoutes.settings.length + 1),
                builder: (_, _) => const StorageSettingsScreen(),
              ),
            ],
          ),
        ],
      ),
    );
  return branches;
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(sessionProvider, (_, _) => refresh.value++);

  final router = GoRouter(
    initialLocation: AppRoutes.splash,
    refreshListenable: refresh,
    redirect: (context, state) {
      final session = ref.read(sessionProvider);
      final location = state.matchedLocation;
      if (session.isLoading && !session.hasValue) return location == AppRoutes.splash ? null : AppRoutes.splash;

      final signedIn = session.value != null;
      final isPublic = AppRoutes.public.contains(location);
      if (!signedIn) return isPublic ? null : AppRoutes.login;
      if (isPublic || location == AppRoutes.splash) return AppRoutes.home;
      return null;
    },
    routes: [
      GoRoute(path: AppRoutes.splash, builder: (_, _) => const SplashScreen()),
      GoRoute(path: AppRoutes.login, builder: (_, _) => const LoginScreen()),
      GoRoute(path: AppRoutes.register, builder: (_, _) => const RegisterScreen()),
      GoRoute(
        path: AppRoutes.portalAccess,
        builder: (_, state) => PortalAccessScreen(token: state.uri.queryParameters['token']),
      ),
      GoRoute(
        path: AppRoutes.invite,
        builder: (_, state) => InviteAcceptScreen(token: state.uri.queryParameters['token']),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            AppShell(location: state.uri.path, navigationShell: navigationShell),
        branches: _shellBranches(),
      ),
    ],
  );

  ref.onDispose(() {
    router.dispose();
    refresh.dispose();
  });
  return router;
});
