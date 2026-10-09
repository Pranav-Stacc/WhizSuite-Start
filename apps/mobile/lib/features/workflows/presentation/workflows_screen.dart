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
import '../application/workflows_controller.dart';
import '../domain/workflow.dart';
import '../workflows_routes.dart';
import 'workflow_card.dart';
import 'workflow_forms.dart';

class WorkflowsScreen extends ConsumerStatefulWidget {
  const WorkflowsScreen({super.key});

  @override
  ConsumerState<WorkflowsScreen> createState() => _WorkflowsScreenState();
}

class _WorkflowsScreenState extends ConsumerState<WorkflowsScreen> {
  bool? _active;

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    final created = await showWorkflowForm(context, ref);
    if (created && mounted) showToast(context, l10n.createdToast);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final workflows = ref.watch(workflowsProvider);
    final items = workflows.value ?? const <Workflow>[];
    final active = items.where((w) => w.active).length;
    final clientApproval = items.where((w) => w.requiresClientApproval).length;

    return PageScaffold(
      title: l10n.workflowsTitle,
      floatingActionButton: PermissionGate(
        anyOf: const [Permissions.workflowsManage],
        child: CreateFab(label: l10n.workflowNew, onPressed: _create),
      ),
      body: ResourceList<Workflow>(
        value: workflows,
        onRefresh: () => ref.refresh(workflowsProvider.future),
        minTileWidth: 340,
        tileHeight: 220,
        searchHint: l10n.workflowsSearch,
        matches: (workflow, query) =>
            workflow.name.toLowerCase().contains(query) || workflow.stages.any((s) => s.toLowerCase().contains(query)),
        filter: (workflow) => _active == null || workflow.active == _active,
        header: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            LayoutBuilder(
              builder: (context, constraints) {
                final tiles = [
                  MetricTile(
                    label: l10n.workflowActive,
                    icon: Icons.play_circle_outline,
                    value: '$active',
                    caption: l10n.workflowKpiActiveOf(active, items.length),
                    onTap: () => setState(() => _active = true),
                  ),
                  MetricTile(
                    label: l10n.workflowInactive,
                    icon: Icons.pause_circle_outline,
                    value: '${items.length - active}',
                    onTap: () => setState(() => _active = false),
                  ),
                  MetricTile(
                    label: l10n.workflowClientApproval,
                    icon: Icons.verified_outlined,
                    value: '$clientApproval',
                  ),
                ];
                final columns = gridColumns(constraints.maxWidth, minTileWidth: 160, max: tiles.length);
                final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
                return Wrap(
                  spacing: tokens.md,
                  runSpacing: tokens.md,
                  children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
                );
              },
            ),
            SizedBox(height: tokens.md),
            FilterBar<bool>(
              options: const [true, false],
              selected: _active,
              labelOf: (active) => active ? l10n.workflowActive : l10n.workflowInactive,
              countOf: (active) => active == null ? items.length : items.where((w) => w.active == active).length,
              onSelected: (active) => setState(() => _active = active),
            ),
          ],
        ),
        empty: EmptyState(
          icon: Icons.account_tree_outlined,
          title: l10n.workflowsEmpty,
          body: l10n.workflowsEmptyBody,
          action: PermissionGate(
            anyOf: const [Permissions.workflowsManage],
            child: FilledButton.icon(onPressed: _create, icon: const Icon(Icons.add), label: Text(l10n.workflowNew)),
          ),
        ),
        itemBuilder: (context, workflow) => WorkflowCard(
          workflow: workflow,
          onTap: () => context.go(WorkflowsRoutes.detail(workflow.id)),
        ),
      ),
    );
  }
}

