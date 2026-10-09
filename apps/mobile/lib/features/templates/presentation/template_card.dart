import 'package:flutter/material.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/template.dart';
import 'template_labels.dart';

class TemplateCard extends StatelessWidget {
  const TemplateCard({required this.template, required this.onTap, this.clientName, super.key});

  static const _markSize = 40.0;
  static const _fillAlpha = 0.12;

  final Template template;
  final String? clientName;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final tone = templateTypeTone(template.type);
    final definition = template.definition;
    final description = definition.description.isNotEmpty ? definition.description : definition.body;
    return SurfaceCard(
      onTap: onTap,
      semanticLabel: '${template.name}, ${templateTypeLabel(l10n, template.type)}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: _markSize,
                height: _markSize,
                decoration: BoxDecoration(
                  color: tone.color(tokens).withValues(alpha: _fillAlpha),
                  borderRadius: BorderRadius.circular(tokens.radius + 6),
                ),
                child: Icon(templateTypeIcon(template.type), size: 20, color: tone.color(tokens)),
              ),
              SizedBox(width: tokens.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(template.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleMedium),
                    SizedBox(height: 2),
                    Wrap(
                      spacing: tokens.xs + 2,
                      runSpacing: tokens.xs,
                      children: [
                        StatusBadge(label: templateTypeLabel(l10n, template.type), tone: tone, dense: true),
                        TagChip(
                          label: (template.isClientScoped ? clientName : null) ??
                              templateScopeLabel(l10n, template.scope),
                          icon: template.isClientScoped ? Icons.business_outlined : Icons.apartment_outlined,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: tokens.md),
          Text(
            description.isEmpty ? l10n.templateNoDescription : description,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: text.bodySmall?.copyWith(color: description.isEmpty ? tokens.muted : tokens.secondary),
          ),
          SizedBox(height: tokens.md),
          Row(
            children: [
              Expanded(
                child: _Stat(
                  label: templateItemsLabel(l10n, template.type),
                  value: definition.items.isEmpty ? l10n.valueUnknown : '${definition.items.length}',
                ),
              ),
              Expanded(
                child: _Stat(label: l10n.templateVersionField, value: l10n.templateVersion(template.version)),
              ),
              Expanded(
                child: _Stat(label: l10n.templateCreated, value: formats.shortDate(template.createdAt)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.labelSmall?.copyWith(color: tokens.muted)),
        SizedBox(height: 2),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: text.titleSmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
        ),
      ],
    );
  }
}
