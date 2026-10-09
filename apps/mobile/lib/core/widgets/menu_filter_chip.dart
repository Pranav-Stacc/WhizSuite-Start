import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';

/// Filter chip that opens a single-select menu. Shows [label] until a value is
/// chosen, then "[label]: [value]"; the first entry clears the filter.
class MenuFilterChip<T extends Object> extends StatelessWidget {
  const MenuFilterChip({
    required this.label,
    required this.options,
    required this.selected,
    required this.labelOf,
    required this.onSelected,
    this.icon,
    super.key,
  });

  static const _checkSize = 18.0;

  final String label;
  final List<T> options;
  final T? selected;
  final String Function(T value) labelOf;
  final ValueChanged<T?> onSelected;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final current = selected;
    final text = current == null ? label : '$label: ${labelOf(current)}';
    Widget check(bool on) => on ? const Icon(Icons.check, size: _checkSize) : const SizedBox.square(dimension: _checkSize);
    return MenuAnchor(
      menuChildren: [
        MenuItemButton(leadingIcon: check(current == null), onPressed: () => onSelected(null), child: Text(l10n.filterAll)),
        for (final option in options)
          MenuItemButton(
            leadingIcon: check(option == current),
            onPressed: () => onSelected(option),
            child: Text(labelOf(option), overflow: TextOverflow.ellipsis),
          ),
      ],
      builder: (context, controller, _) => FilterChip(
        selected: current != null,
        showCheckmark: false,
        tooltip: label,
        avatar: icon == null ? null : Icon(icon, size: _checkSize),
        label: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(text),
            const Icon(Icons.arrow_drop_down, size: _checkSize),
          ],
        ),
        onSelected: (_) => controller.isOpen ? controller.close() : controller.open(),
      ),
    );
  }
}
