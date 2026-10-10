import 'dart:ui';
import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';

/// Floating glassmorphic dock with a glowing center CTA.
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
  static const _outerPad = 16.0;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final bottom = MediaQuery.paddingOf(context).bottom;
    
    // Determine a dark glass color regardless of theme
    final isLight = Theme.of(context).brightness == Brightness.light;
    final bgColor = isLight
        ? const Color(0xFF1C1C1E).withValues(alpha: 0.85)
        : const Color(0xFF2C2C2E).withValues(alpha: 0.85);

    // Find the center index by looking for the Home tab (AppRoutes.home) or just middle.
    // In this app, AppRoutes.home is '/', but let's safely default to middle if not found.
    int centerIndex = tabs.length ~/ 2;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].path == '/') {
        centerIndex = i;
        break;
      }
    }

    return Padding(
      // Ensure it floats above the safe area properly without being excessively tall
      padding: EdgeInsets.fromLTRB(_outerPad, 0, _outerPad, _outerPad + (bottom > 0 ? bottom : 16.0)),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(32),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Container(
            height: _barHeight,
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(32),
              border: Border.all(color: Colors.white.withValues(alpha: 0.1), width: 1),
            ),
            child: Row(
              children: [
                for (var i = 0; i < tabs.length; i++)
                  Expanded(
                    child: i == centerIndex
                        ? _CenterNavItem(
                            tab: tabs[i],
                            onTap: () => onSelect(i),
                          )
                        : _NavItem(
                            tab: tabs[i],
                            selected: selectedIndex == i,
                            label: tabs[i].label(l10n),
                            onTap: () => onSelect(i),
                          ),
                  ),
              ],
            ),
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
    final color = selected ? tokens.primary : Colors.white.withValues(alpha: 0.6);

    return InkWell(
      onTap: onTap,
      splashColor: tokens.primary.withValues(alpha: 0.08),
      highlightColor: tokens.primary.withValues(alpha: 0.05),
      child: Semantics(
        button: true,
        selected: selected,
        label: label,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedScale(
              scale: selected ? 1.1 : 1.0,
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeOutCubic,
              child: Icon(selected ? tab.selectedIcon : tab.icon, size: 22, color: color),
            ),
            const SizedBox(height: 4),
            AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 220),
              style: Theme.of(context).textTheme.labelSmall!.copyWith(
                    color: color,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    fontSize: 10,
                  ),
              child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
            ),
          ],
        ),
      ),
    );
  }
}

class _CenterNavItem extends StatelessWidget {
  const _CenterNavItem({
    required this.tab,
    required this.onTap,
  });

  final CreativeNavTab tab;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Center(
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: tokens.primary,
            shape: BoxShape.circle,
          ),
          child: Icon(tab.icon, color: tokens.onPrimary, size: 24),
        ),
      ),
    );
  }
}
