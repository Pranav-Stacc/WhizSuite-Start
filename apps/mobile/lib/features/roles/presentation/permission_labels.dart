import '../../../l10n/app_localizations.dart';
import '../domain/humanize.dart';
import '../domain/permission_catalog.dart';

/// Localized group name for a permission domain (`content` → "Content"), humanised when unknown.
String permissionGroupLabel(AppLocalizations l10n, String group) =>
    l10n.rolePermissionGroup(selectKey(group), humanizeKey(group));

/// Localized action within its group (`settings.manage` → "Manage settings").
String permissionActionLabel(AppLocalizations l10n, String action) =>
    l10n.rolePermissionAction(selectKey(action), humanizeKey(action));

/// Full label for a permission key shown outside its group (`content.view` → "Content · View").
String permissionLabel(AppLocalizations l10n, String key) => l10n.rolePermissionLabel(
      permissionGroupLabel(l10n, PermissionDef.groupOf(key)),
      permissionActionLabel(l10n, PermissionDef.actionOf(key)),
    );
