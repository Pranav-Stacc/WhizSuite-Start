import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/navigation/app_routes.dart';
import '../../../app/session/sign_out.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../l10n/app_localizations.dart';
import '../../profile/data/profile_repository.dart';
import '../../profile/presentation/profile_editor.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  Future<void> _confirmSignOut(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await confirmAction(
      context,
      title: l10n.settingsSignOut,
      body: l10n.settingsSignOutConfirm,
      confirmLabel: l10n.settingsSignOut,
    );
    if (confirmed) await ref.read(signOutProvider)();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final profile = ref.watch(profileProvider);

    return PageScaffold(
      title: l10n.settingsTitle,
      body: ListView(
        padding: EdgeInsets.all(tokens.lg),
        children: [
          FadeSlideIn(
            child: Card(
              child: profile.when(
                skipLoadingOnReload: true,
                loading: () => Shimmer(
                  child: ListTile(
                    leading: SkeletonBox(width: 40, height: 40, radius: tokens.radius + 12),
                    title: const SkeletonBox(width: 140),
                    subtitle: const SkeletonBox(width: 200, height: 10),
                  ),
                ),
                error: (_, _) => ListTile(
                  leading: const Icon(Icons.person_outline),
                  title: Text(l10n.settingsProfile),
                  trailing: IconButton(
                    tooltip: l10n.retry,
                    icon: const Icon(Icons.refresh),
                    onPressed: () => ref.invalidate(profileProvider),
                  ),
                ),
                data: (value) => value == null
                    ? const SizedBox.shrink()
                    : ListTile(
                        leading: CircleAvatar(
                          backgroundColor: tokens.primary,
                          foregroundColor: tokens.onPrimary,
                          child: Text(value.initials),
                        ),
                        title: Text(value.displayName),
                        subtitle: Text(value.jobTitle?.isNotEmpty ?? false ? value.jobTitle! : value.email),
                        trailing: const Icon(Icons.edit_outlined),
                        onTap: () => showProfileEditor(context, value),
                      ),
              ),
            ),
          ),
          SizedBox(height: tokens.lg),
          FadeSlideIn(
            index: 1,
            child: Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.palette_outlined),
                    title: Text(l10n.settingsAppearance),
                    subtitle: Text(l10n.settingsAppearanceBody),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.go(AppRoutes.appearance),
                  ),
                  const Divider(),
                  ListTile(
                    leading: const Icon(Icons.notifications_outlined),
                    title: Text(l10n.settingsNotifications),
                    subtitle: Text(l10n.settingsNotificationsBody),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.go(AppRoutes.notificationPreferences),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(height: tokens.xl),
          FadeSlideIn(
            index: 2,
            child: OutlinedButton.icon(
              onPressed: () => _confirmSignOut(context, ref),
              icon: const Icon(Icons.logout),
              label: Text(l10n.settingsSignOut),
            ),
          ),
        ],
      ),
    );
  }
}
