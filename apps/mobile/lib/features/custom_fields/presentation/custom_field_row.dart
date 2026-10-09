import 'package:flutter/material.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/custom_field.dart';
import 'custom_field_labels.dart';

/// One field definition: label, key, type and flags, with its options for select types.
class CustomFieldRow extends StatelessWidget {
  const CustomFieldRow({required this.field, this.onTap, super.key});

  static const _iconBox = 36.0;
  static const _maxOptionsShown = 8;

  final CustomField field;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final typeLabel = customFieldTypeLabel(l10n, field.type);
    final hiddenOptions = field.options.length - _maxOptionsShown;
    final flags = [
      if (field.isFilterable) (Icons.filter_alt_outlined, l10n.customFieldFilterable),
      if (field.clientVisible) (Icons.visibility_outlined, l10n.customFieldClientVisible),
    ];

    return Semantics(
      button: onTap != null,
      label: '${field.label}, $typeLabel${field.isRequired ? ', ${l10n.customFieldRequired}' : ''}',
      child: InkWell(
        onTap: onTap,
        borderRadius: tokens.borderRadius,
        child: ExcludeSemantics(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: tokens.xs),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: _iconBox,
                  height: _iconBox,
                  decoration: BoxDecoration(
                    color: tokens.subtle,
                    borderRadius: BorderRadius.circular(tokens.radius + 4),
                    border: Border.all(color: tokens.border),
                  ),
                  child: Icon(customFieldTypeIcon(field.type), size: 18, color: tokens.secondary),
                ),
                SizedBox(width: tokens.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(field.label, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleSmall),
                      Text(
                        field.key,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: text.bodySmall?.copyWith(color: tokens.muted, fontFamily: 'monospace'),
                      ),
                      if (field.hasOptions && field.options.isNotEmpty) ...[
                        SizedBox(height: tokens.sm),
                        Wrap(
                          spacing: tokens.xs,
                          runSpacing: tokens.xs,
                          children: [
                            for (final option in field.options.take(_maxOptionsShown)) TagChip(label: option),
                            if (hiddenOptions > 0) TagChip(label: l10n.customFieldMoreOptions(hiddenOptions)),
                          ],
                        ),
                      ],
                      if (flags.isNotEmpty) ...[
                        SizedBox(height: tokens.sm),
                        Wrap(
                          spacing: tokens.md,
                          runSpacing: tokens.xs,
                          children: [
                            for (final (icon, label) in flags)
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(icon, size: 14, color: tokens.muted),
                                  SizedBox(width: tokens.xs),
                                  Text(label, style: text.labelSmall?.copyWith(color: tokens.muted)),
                                ],
                              ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                SizedBox(width: tokens.sm),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    StatusBadge(label: typeLabel, tone: StatusTone.info, dense: true),
                    if (field.isRequired) ...[
                      SizedBox(height: tokens.xs),
                      StatusBadge(label: l10n.customFieldRequired, tone: StatusTone.warning, dense: true),
                    ],
                  ],
                ),
                if (onTap != null) ...[
                  SizedBox(width: tokens.xs),
                  Icon(Icons.chevron_right, color: tokens.muted),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
