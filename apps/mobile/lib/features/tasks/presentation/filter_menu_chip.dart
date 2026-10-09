import 'package:flutter/material.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../l10n/app_localizations.dart';

/// Compact single-select filter: a chip showing the current choice that opens a menu with "All" and [options].
/// Shared by the tasks, projects and calendar screens.
class FilterMenuChip<T> extends StatelessWidget {
  const FilterMenuChip({
    required this.label,
    required this.value,
    required this.options,
    required this.labelOf,
    required this.onSelected,
    this.icon,
    super.key,
  });

  static const _maxLabelWidth = 180.0;
  static const _iconSize = 18.0;

  final String label;
  final T? value;
  final List<T> options;
  final String Function(T value) labelOf;
  final ValueChanged<T?> onSelected;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final selected = value;
    Widget mark(bool on) => on ? const Icon(Icons.check, size: _iconSize) : const SizedBox.square(dimension: _iconSize);
    final current = selected == null ? label : labelOf(selected);

    return MenuAnchor(
      menuChildren: [
        MenuItemButton(
          leadingIcon: mark(selected == null),
          onPressed: () => onSelected(null),
          child: Text(l10n.filterAll),
        ),
        for (final option in options)
          MenuItemButton(
            leadingIcon: mark(option == selected),
            onPressed: () => onSelected(option),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: _maxLabelWidth * 1.5),
              child: Text(labelOf(option), overflow: TextOverflow.ellipsis),
            ),
          ),
      ],
      builder: (context, controller, _) => Semantics(
        button: true,
        label: '$label: ${selected == null ? l10n.filterAll : current}',
        excludeSemantics: true,
        child: FilterChip(
          avatar: icon == null ? null : Icon(icon, size: _iconSize),
          showCheckmark: false,
          selected: selected != null,
          tooltip: label,
          label: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: _maxLabelWidth),
                child: Text(current, overflow: TextOverflow.ellipsis),
              ),
              SizedBox(width: tokens.xs),
              const Icon(Icons.arrow_drop_down, size: _iconSize),
            ],
          ),
          onSelected: (_) => controller.isOpen ? controller.close() : controller.open(),
        ),
      ),
    );
  }
}
