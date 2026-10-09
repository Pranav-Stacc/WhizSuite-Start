import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_tokens.dart';
import '../../core/widgets/fade_slide_in.dart';
import '../../core/widgets/page_scaffold.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/surfaces.dart';
import '../../features/access/application/access_controller.dart';
import '../../features/auth/application/session_controller.dart';
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

    return PageScaffold(
      title: l10n.navMore,
      body: groups.isEmpty
          ? EmptyState(icon: Icons.apps_outlined, title: l10n.navMoreEmpty)
          : RefreshIndicator(
              onRefresh: () => ref.read(accessProvider.notifier).refresh(),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.fromLTRB(tokens.lg, tokens.lg, tokens.lg, tokens.xxl * 2),
                children: [
                  for (final (index, entry) in groups.entries.indexed)
                    FadeSlideIn(
                      index: index,
                      child: Padding(
                        padding: EdgeInsets.only(bottom: tokens.lg),
                        child: SectionCard(
                          title: entry.key.label(l10n),
                          child: HairlineList(
                            children: [
                              for (final destination in entry.value)
                                _DestinationRow(
                                  icon: destination.icon,
                                  label: destination.label(l10n),
                                  onTap: () => context.go(destination.path),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}

class _DestinationRow extends StatelessWidget {
  const _DestinationRow({required this.icon, required this.label, required this.onTap});

  static const _markSize = 32.0;
  static const _minHeight = 48.0;

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(tokens.radius + 6),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: _minHeight),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: tokens.xs + 2),
          child: Row(
            children: [
              Container(
                width: _markSize,
                height: _markSize,
                decoration: BoxDecoration(
                  color: tokens.subtle,
                  borderRadius: BorderRadius.circular(tokens.radius + 6),
                  border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
                ),
                child: Icon(icon, size: 16, color: tokens.secondary),
              ),
              SizedBox(width: tokens.md),
              Expanded(child: Text(label, style: text.titleSmall)),
              Icon(Icons.chevron_right, color: tokens.muted, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}
