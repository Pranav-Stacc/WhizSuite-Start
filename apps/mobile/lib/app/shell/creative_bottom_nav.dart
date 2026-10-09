import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';

/// Floating pill dock with a sliding selected pill — replaces stock Material NavigationBar.
class CreativeBottomNav extends StatelessWidget {
  const CreativeBottomNav({
    required this.tabs,
    required this.selectedIndex,
    required this.onSelect,
    super.key,
  });

  final List<CreativeNavTab> tabs;
  final int? selectedIndex;
  final ValueChanged<int> onSelect;

  static const _barHeight = 64.0;
  static const _outerPad = 12.0;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final bottom = MediaQuery.paddingOf(context).bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(_outerPad, 0, _outerPad, _outerPad + bottom * 0.35),
      child: Material(
        elevation: 10,
        shadowColor: tokens.fg.withValues(alpha: 0.18),
        color: Color.lerp(tokens.surface, tokens.bg, 0.15),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(tokens.radius + 18),
          side: BorderSide(color: tokens.border.withValues(alpha: 0.7)),
        ),
        clipBehavior: Clip.antiAlias,
        child: SizedBox(
          height: _barHeight,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final slot = constraints.maxWidth / tabs.length;
              final selected = selectedIndex;
              return Stack(
                children: [
                  if (selected != null)
                    AnimatedPositioned(
                      duration: const Duration(milliseconds: 280),
                      curve: Curves.easeOutCubic,
                      left: slot * selected + 6,
                      top: 6,
                      bottom: 6,
                      width: slot - 12,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: tokens.primary.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(tokens.radius + 12),
                          border: Border.all(color: tokens.primary.withValues(alpha: 0.28)),
                        ),
                      ),
                    ),
                  Row(
                    children: [
                      for (var i = 0; i < tabs.length; i++)
                        Expanded(
                          child: _NavItem(
                            tab: tabs[i],
                            selected: selected == i,
                            label: tabs[i].label(l10n),
                            onTap: () => onSelect(i),
                          ),
                        ),
                    ],
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class CreativeNavTab {
  const CreativeNavTab({
    required this.path,
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });

  final String path;
  final IconData icon;
  final IconData selectedIcon;
  final String Function(AppLocalizations l10n) label;
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.tab,
    required this.selected,
    required this.label,
    required this.onTap,
  });

  final CreativeNavTab tab;
  final bool selected;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final color = selected ? tokens.primary : tokens.muted;

    return InkWell(
      onTap: onTap,
      child: Semantics(
        button: true,
        selected: selected,
        label: label,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedScale(
              scale: selected ? 1.08 : 1,
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeOutCubic,
              child: Icon(selected ? tab.selectedIcon : tab.icon, size: 22, color: color),
            ),
            const SizedBox(height: 2),
            AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 220),
              style: Theme.of(context).textTheme.labelSmall!.copyWith(
                    color: color,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    fontSize: 11,
                  ),
              child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
            ),
          ],
        ),
      ),
    );
  }
}
