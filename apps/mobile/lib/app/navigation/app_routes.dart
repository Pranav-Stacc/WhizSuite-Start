/// Route paths. Feature screens register under these; deep links (push taps) resolve here too.
abstract final class AppRoutes {
  static const splash = '/splash';
  static const login = '/login';
  static const register = '/register';
  static const portalAccess = '/portal-access';
  static const home = '/home';
  static const more = '/more';
  static const notifications = '/notifications';
  static const settings = '/settings';
  static const appearance = '/settings/appearance';
  static const notificationPreferences = '/settings/notifications';

  static const public = {login, register, portalAccess};
}
