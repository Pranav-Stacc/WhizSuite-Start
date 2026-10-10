import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/contracts/contracts.g.dart';
import '../../../../core/theme/app_tokens.dart';
import '../../../../core/widgets/feedback.dart';
import '../../../../core/widgets/resource_list.dart';
import '../../../../core/widgets/state_views.dart';
import '../../../../core/widgets/surfaces.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../access/presentation/permission_gate.dart';
import '../../../templates/application/templates_controller.dart';
import '../../../templates/domain/template.dart';
import '../../../templates/presentation/template_card.dart';
import '../../../templates/presentation/template_forms.dart';
import '../../../templates/presentation/template_labels.dart';
import '../../../templates/templates_routes.dart';
import '../team_labels.dart';

class AgencyHrDocumentsTab extends ConsumerStatefulWidget {
  const AgencyHrDocumentsTab({super.key});

  @override
  ConsumerState<AgencyHrDocumentsTab> createState() => _AgencyHrDocumentsTabState();
}

class _AgencyHrDocumentsTabState extends ConsumerState<AgencyHrDocumentsTab> {
  String? _type;

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
    final hrTypes = hrTemplateTypes;

    return ResourceList<Template>(
      value: templates,
      onRefresh: () => ref.refresh(templatesProvider.future),
      minTileWidth: 320,
      tileHeight: 196,
      searchHint: l10n.templatesSearch,
      matches: (template, query) =>
          template.name.toLowerCase().contains(query) ||
          template.definition.description.toLowerCase().contains(query),
      filter: (template) => isHrTemplate(template.type) && (_type == null || template.type == _type),
      header: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.hrTemplatesBody, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted)),
          SizedBox(height: tokens.md),
          FilterBar<String>(
            options: hrTypes,
            selected: _type,
            labelOf: (t) => templateTypeLabel(l10n, t),
            countOf: (t) => (templates.value ?? const <Template>[])
                .where((item) => isHrTemplate(item.type) && (t == null || item.type == t))
                .length,
            onSelected: (t) => setState(() => _type = t),
          ),
          SizedBox(height: tokens.sm),
        ],
      ),
      empty: EmptyState(
        icon: Icons.description_outlined,
        title: l10n.hrTemplatesEmpty,
        body: l10n.hrTemplatesBody,
        action: PermissionGate(
          anyOf: const [Permissions.orgSettingsManage],
          child: FilledButton.icon(onPressed: _create, icon: const Icon(Icons.add), label: Text(l10n.templateNew)),
        ),
      ),
      itemBuilder: (context, template) => TemplateCard(
        template: template,
        onTap: () => context.push(TemplatesRoutes.detail(template.id)),
      ),
    );
  }
}
