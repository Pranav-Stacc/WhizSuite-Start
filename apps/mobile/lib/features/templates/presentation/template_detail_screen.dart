import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../directory/application/directory_providers.dart';
import '../application/templates_controller.dart';
import '../domain/template.dart';
import 'template_forms.dart';
import 'template_labels.dart';

class TemplateDetailScreen extends ConsumerWidget {
  const TemplateDetailScreen({required this.templateId, super.key});

  final String templateId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final template = ref.watch(templateProvider(templateId));
    final loaded = template.value;

    return PageScaffold(
      title: loaded?.name ?? l10n.templatesTitle,
      actions: [
        if (loaded != null)
          PermissionGate(
            anyOf: const [Permissions.orgSettingsManage],
            child: IconButton(
              tooltip: l10n.templateEdit,
              icon: const Icon(Icons.edit_outlined),
              onPressed: () async {
                final saved = await showTemplateForm(context, ref, template: loaded);
                if (saved && context.mounted) showToast(context, l10n.savedToast);
              },
            ),
          ),
      ],
      body: AsyncValueView<Template>(
        value: template,
        onRetry: () => ref.invalidate(templateProvider(templateId)),
        data: (template) => _Body(
          template: template,
          onRefresh: () => ref.refresh(templateProvider(templateId).future),
        ),
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.template, required this.onRefresh});

  final Template template;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final definition = template.definition;
    final clientName = ref.watch(clientDirectoryProvider).value?.nameOf(definition.clientId);
    final muted = text.bodyMedium?.copyWith(color: tokens.muted);
    final sections = <Widget>[
      SectionCard(
        title: l10n.details,
        child: Column(
          children: [
            InfoRow(label: l10n.templateTypeField, value: Text(templateTypeLabel(l10n, template.type))),
            InfoRow(label: l10n.templateScopeField, value: Text(templateScopeLabel(l10n, template.scope))),
            if (template.isClientScoped)
              InfoRow(label: l10n.templateClientField, value: Text(clientName ?? l10n.valueUnknown)),
            InfoRow(label: l10n.templateVersionField, value: Text(formats.number(template.version))),
            InfoRow(label: l10n.templateCreated, value: Text(formats.date(template.createdAt))),
          ],
        ),
      ),
      SectionCard(
        title: l10n.templateDescriptionField,
        child: definition.description.isEmpty
            ? Text(l10n.templateNoDescription, style: muted)
            : SelectableText(definition.description, style: text.bodyLarge),
      ),
      SectionCard(
        title: templateItemsLabel(l10n, template.type),
        child: definition.items.isEmpty
            ? Text(l10n.templateNoItems, style: muted)
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final (i, item) in definition.items.indexed)
                    Padding(
                      padding: EdgeInsets.symmetric(vertical: tokens.xs),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: tokens.xl,
                            child: Text('${i + 1}.', style: text.bodyMedium?.copyWith(color: tokens.muted)),
                          ),
                          Expanded(child: Text(item, style: text.bodyMedium)),
                        ],
                      ),
                    ),
                ],
              ),
      ),
      if (definition.body.isNotEmpty)
        SectionCard(
          title: l10n.templateBodyField,
          child: SelectableText(definition.body, style: text.bodyMedium?.copyWith(height: 1.6)),
        ),
      if (definition.extras.isNotEmpty)
        SectionCard(
          title: l10n.templateOtherFields,
          child: Column(
            children: [
              for (final MapEntry(:key, :value) in definition.extras.entries)
                InfoRow(
                  label: key,
                  value: Text(
                    value is String ? value : jsonEncode(value),
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontFamily: 'monospace'),
                  ),
                ),
            ],
          ),
        ),
    ];

    return ReadableBody(
      onRefresh: onRefresh,
      children: [
        FadeSlideIn(
          child: Row(
            children: [
              Icon(templateTypeIcon(template.type), size: 28, color: templateTypeTone(template.type).color(tokens)),
              SizedBox(width: tokens.md),
              Expanded(child: Text(template.name, style: text.headlineSmall)),
              StatusBadge(label: templateTypeLabel(l10n, template.type), tone: templateTypeTone(template.type)),
            ],
          ),
        ),
        for (final (i, section) in sections.indexed) ...[
          SizedBox(height: tokens.xl),
          FadeSlideIn(index: i + 1, child: section),
        ],
      ],
    );
  }
}
