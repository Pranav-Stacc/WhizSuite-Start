import 'package:flutter/material.dart';

import '../../../core/theme/app_tokens.dart';

/// Underlined link to another screen (project, client, task), sized for touch.
/// Shared by the tasks, projects and calendar detail views.
class EntityLink extends StatelessWidget {
  const EntityLink({required this.label, required this.onTap, this.semanticLabel, this.icon, super.key});

  final String label;
  final VoidCallback onTap;
  final String? semanticLabel;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Semantics(
      link: true,
      label: semanticLabel ?? label,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: tokens.borderRadius,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: kMinInteractiveDimension),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[Icon(icon, size: 16, color: tokens.primary), SizedBox(width: tokens.xs)],
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: tokens.primary, decoration: TextDecoration.underline),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Inline value that opens a picker; shows a dropdown affordance and a tooltip.
class EditableValue extends StatelessWidget {
  const EditableValue({required this.child, required this.tooltip, required this.onTap, super.key});

  final Widget child;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Tooltip(
      message: tooltip,
      child: Semantics(
        button: true,
        hint: tooltip,
        child: InkWell(
          onTap: onTap,
          borderRadius: tokens.borderRadius,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: kMinInteractiveDimension),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(child: child),
                SizedBox(width: tokens.xs),
                Icon(Icons.expand_more, size: 18, color: tokens.muted),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
