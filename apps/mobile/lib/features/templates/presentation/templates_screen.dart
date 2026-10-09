import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/templates_controller.dart';
import '../domain/template.dart';
import '../templates_routes.dart';
import 'template_card.dart';
import 'template_forms.dart';
import 'template_labels.dart';

class TemplatesScreen extends ConsumerStatefulWidget {
  const TemplatesScreen({super.key});

  @override
  ConsumerState<TemplatesScreen> createState() => _TemplatesScreenState();
}

class _TemplatesScreenState extends ConsumerState<TemplatesScreen> {
  String? _type;
  String? _scope;

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    final created = await showTemplateForm(context, ref);
    if (created && mounted) showToast(context, l10n.createdToast);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final templates = ref.watch(templatesProvider);
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final items = templates.value ?? const <Template>[];

    return PageScaffold(
      title: l10n.templatesTitle,
      floatingActionButton: PermissionGate(
        anyOf: const [Permissions.orgSettingsManage],
        child: CreateFab(label: l10n.templateNew, onPressed: _create),
      ),
      body: ResourceList<Template>(
        value: templates,
        onRefresh: () => ref.refresh(templatesProvider.future),
        minTileWidth: 320,
        tileHeight: 196,
        searchHint: l10n.templatesSearch,
        matches: (template, query) =>
            template.name.toLowerCase().contains(query) ||
            template.definition.description.toLowerCase().contains(query),
        filter: (template) => (_type == null || template.type == _type) && (_scope == null || template.scope == _scope),
        header: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (items.isNotEmpty) ...[
              Row(
                children: [
                  Expanded(
                    child: MetricTile(
                      label: l10n.templateStatAll,
                      icon: Icons.dashboard_customize_outlined,
                      value: '${items.length}',
                    ),
                  ),
                  SizedBox(width: tokens.md),
                  Expanded(
                    child: MetricTile(
                      label: l10n.templateStatOrg,
                      icon: Icons.apartment_outlined,
                      value: '${items.where((t) => t.scope == TemplateScopes.organization).length}',
                    ),
                  ),
                  SizedBox(width: tokens.md),
                  Expanded(
                    child: MetricTile(
                      label: l10n.templateStatClient,
                      icon: Icons.business_outlined,
                      value: '${items.where((t) => t.scope == TemplateScopes.client).length}',
                    ),
                  ),
                ],
              ),
              SizedBox(height: tokens.md),
            ],
            FilterBar<String>(
              options: TemplateTypes.values,
              selected: _type,
              labelOf: (type) => templateTypeLabel(l10n, type),
              countOf: (type) => type == null ? items.length : items.where((t) => t.type == type).length,
              onSelected: (type) => setState(() => _type = type),
            ),
            SizedBox(height: tokens.sm),
            FilterBar<String>(
              options: TemplateScopes.values,
              selected: _scope,
              labelOf: (scope) => templateScopeLabel(l10n, scope),
              onSelected: (scope) => setState(() => _scope = scope),
            ),
          ],
        ),
        empty: EmptyState(
          icon: Icons.dashboard_customize_outlined,
          title: l10n.templatesEmpty,
          body: l10n.templatesEmptyBody,
          action: PermissionGate(
            anyOf: const [Permissions.orgSettingsManage],
            child: FilledButton.icon(onPressed: _create, icon: const Icon(Icons.add), label: Text(l10n.templateNew)),
          ),
        ),
        itemBuilder: (context, template) => TemplateCard(
          template: template,
          clientName: clients.nameOf(template.definition.clientId),
          onTap: () => context.go(TemplatesRoutes.detail(template.id)),
        ),
      ),
    );
  }
}
