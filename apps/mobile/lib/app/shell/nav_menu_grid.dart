import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../navigation/destinations.dart';

/// One tappable destination in the mega-menu grid.
class NavMenuItem {
  const NavMenuItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
}

/// Section eyebrow + even 2-column grid (blank cells match tile surface so no odd colors).
class NavMenuSection extends StatelessWidget {
  const NavMenuSection({required this.label, required this.items, super.key});

  final String label;
  final List<NavMenuItem> items;

  static const tileHeight = 44.0;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    if (items.isEmpty) return const SizedBox.shrink();

    // Pad to an even count so every row has two same-colored cells.
    final cells = <NavMenuItem?>[...items];
    if (cells.length.isOdd) cells.add(null);

    return Padding(
      padding: EdgeInsets.only(bottom: tokens.md + 2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(tokens.xs, 0, tokens.xs, tokens.sm),
            child: Text(
              label.toUpperCase(),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: tokens.muted,
                    letterSpacing: 1.0,
                    fontWeight: FontWeight.w600,
                    fontSize: 11,
                  ),
            ),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              color: tokens.surface,
              border: Border.all(color: tokens.border),
              borderRadius: BorderRadius.circular(tokens.radius + 2),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(tokens.radius + 1),
              child: Table(
                border: TableBorder.symmetric(inside: BorderSide(color: tokens.border, width: 1)),
                columnWidths: const {
                  0: FlexColumnWidth(),
                  1: FlexColumnWidth(),
                },
                defaultVerticalAlignment: TableCellVerticalAlignment.middle,
                children: [
                  for (var i = 0; i < cells.length; i += 2)
                    TableRow(
                      children: [
                        _Cell(item: cells[i]),
                        _Cell(item: cells[i + 1]),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Cell extends StatelessWidget {
  const _Cell({required this.item});

  final NavMenuItem? item;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    if (item == null) {
      return ColoredBox(
        color: tokens.surface,
        child: const SizedBox(height: NavMenuSection.tileHeight, width: double.infinity),
      );
    }

    final selected = item!.selected;
    final fg = selected ? tokens.fg : tokens.secondary;
    final fill = selected ? Color.lerp(tokens.surface, tokens.primary, 0.08)! : tokens.surface;

    return Material(
      color: fill,
      child: InkWell(
        onTap: item!.onTap,
        splashColor: tokens.primary.withValues(alpha: 0.08),
        highlightColor: tokens.primary.withValues(alpha: 0.04),
        child: SizedBox(
          height: NavMenuSection.tileHeight,
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: tokens.sm + 2),
            child: Row(
              children: [
                Icon(
                  selected ? item!.selectedIcon : item!.icon,
                  size: 16,
                  color: selected ? tokens.primary : tokens.muted,
                ),
                SizedBox(width: tokens.sm),
                Expanded(
                  child: Text(
                    item!.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: fg,
                          fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                          fontSize: 13,
                          decoration: selected ? TextDecoration.underline : TextDecoration.none,
                          decorationColor: tokens.fg,
                          decorationThickness: 1.1,
                        ),
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

/// Builds [NavMenuSection]s from destination groups for sidebar / More.
List<Widget> navMenuSections({
  required AppLocalizations l10n,
  required Map<NavGroup, List<AppDestination>> groups,
  required String location,
  required ValueChanged<String> onNavigate,
}) {
  bool active(String path) => location == path || location.startsWith('$path/');

  return [
    for (final entry in groups.entries)
      NavMenuSection(
        label: entry.key.label(l10n),
        items: [
          for (final destination in entry.value)
            NavMenuItem(
              icon: destination.icon,
              selectedIcon: destination.selectedIcon,
              label: destination.label(l10n),
              selected: active(destination.path),
              onTap: () => onNavigate(destination.path),
            ),
        ],
      ),
  ];
}
