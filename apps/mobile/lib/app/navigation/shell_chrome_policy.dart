import '../../features/search/search_routes.dart';
import 'app_routes.dart';
import 'destinations.dart';

/// Normalizes a router path for comparisons.
String normalizePath(String location) {
  if (location.isEmpty) return AppRoutes.home;
  var path = location.split('?').first;
  if (path.length > 1 && path.endsWith('/')) path = path.substring(0, path.length - 1);
  return path;
}

/// Shell app-bar actions (quick create, search, notifications) only on root hub screens.
bool shellActionsVisibleFor(String location) {
  final path = normalizePath(location);

  const hiddenRoots = {
    AppRoutes.notifications,
    AppRoutes.settings,
    AppRoutes.appearance,
    AppRoutes.notificationPreferences,
    AppRoutes.storage,
    SearchRoutes.root,
  };
  if (hiddenRoots.contains(path)) return false;

  final destination = destinationFor(path);
  if (destination == null) return false;

  return path == normalizePath(destination.path);
}
