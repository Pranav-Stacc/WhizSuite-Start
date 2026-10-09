import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/automations_controller.dart';
import '../automations_routes.dart';
import '../domain/automation.dart';
import 'automation_card.dart';
import 'automation_forms.dart';
import 'automation_labels.dart';
import 'automation_recipes.dart';
import 'automation_widgets.dart';

class AutomationsScreen extends ConsumerStatefulWidget {
  const AutomationsScreen({super.key});

  @override
  ConsumerState<AutomationsScreen> createState() => _AutomationsScreenState();
}

class _AutomationsScreenState extends ConsumerState<AutomationsScreen> {
  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    final created = await showAutomationForm(context, ref);
    if (created && mounted) showToast(context, l10n.createdToast);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return DefaultTabController(
      length: 2,
      child: PageScaffold(
        title: l10n.automationsTitle,
        floatingActionButton: PermissionGate(
          anyOf: const [Permissions.automationsManage],
          child: CreateFab(label: l10n.automationNew, onPressed: _create),
        ),
        bottom: TabBar(
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: [Tab(text: l10n.automationTabRules), Tab(text: l10n.automationTabRuns)],
        ),
        body: TabBarView(children: [_RulesTab(onCreate: _create), const _RunsTab()]),
      ),
    );
  }
}

class _RulesTab extends ConsumerStatefulWidget {
  const _RulesTab({required this.onCreate});

  final VoidCallback onCreate;

  @override
  ConsumerState<_RulesTab> createState() => _RulesTabState();
}

class _RulesTabState extends ConsumerState<_RulesTab> {
  String? _status;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final automations = ref.watch(automationsProvider);
    final items = automations.value ?? const <Automation>[];
    final recipes = availableRecipes(items);

    return ResourceList<Automation>(
      value: automations,
      onRefresh: () => ref.refresh(automationsProvider.future),
      minTileWidth: 340,
      tileHeight: 236,
      searchHint: l10n.automationsSearch,
      matches: (automation, query) =>
          automation.name.toLowerCase().contains(query) ||
          automationTriggerLabel(l10n, automation.trigger).toLowerCase().contains(query) ||
          automationActionLabel(l10n, automation.action).toLowerCase().contains(query),
      filter: (automation) => _status == null || automation.status == _status,
      header: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Summary(automations: items),
          SizedBox(height: tokens.lg),
          if (recipes.isNotEmpty) ...[AutomationRecipeStrip(recipes: recipes), SizedBox(height: tokens.lg)],
          FilterBar<String>(
            options: AutomationStatuses.values,
            selected: _status,
            labelOf: (status) => automationStatusLabel(l10n, status),
            countOf: (status) => status == null ? items.length : items.where((a) => a.status == status).length,
            onSelected: (status) => setState(() => _status = status),
          ),
        ],
      ),
      empty: ListView(
        padding: EdgeInsets.all(tokens.lg),
        children: [
          EmptyState(
            icon: Icons.bolt_outlined,
            title: l10n.automationsEmpty,
            body: l10n.automationsEmptyBody,
            action: PermissionGate(
              anyOf: const [Permissions.automationsManage],
              child: FilledButton.icon(
                onPressed: widget.onCreate,
                icon: const Icon(Icons.add),
                label: Text(l10n.automationNew),
              ),
            ),
          ),
          AutomationRecipeStrip(recipes: recipes),
        ],
      ),
      itemBuilder: (context, automation) => AutomationCard(
        automation: automation,
        onTap: () => context.go(AutomationsRoutes.detail(automation.id)),
      ),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.automations});

  final List<Automation> automations;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final active = automations.where((a) => a.enabled).length;
    final runs = automations.fold(0, (sum, a) => sum + a.runs);
    final failures = automations.fold(0, (sum, a) => sum + a.failures);
    final rate = runs == 0 ? null : (runs - failures) / runs;
    final tiles = [
      MetricTile(
        label: l10n.automationKpiActive,
        icon: Icons.bolt,
        value: formats.number(active),
        caption: l10n.automationKpiActiveOf(automations.length),
      ),
      MetricTile(label: l10n.automationKpiRuns, icon: Icons.play_circle_outline, value: formats.number(runs, compact: true)),
      MetricTile(
        label: l10n.automationSuccessRate,
        icon: Icons.verified_outlined,
        value: rate == null ? l10n.valueUnknown : formats.percent(rate),
        tone: rate == null ? StatusTone.neutral : automationSuccessTone(rate),
      ),
    ];
    return Row(
      children: [
        for (final (i, tile) in tiles.indexed) ...[
          if (i > 0) SizedBox(width: tokens.sm),
          Expanded(child: tile),
        ],
      ],
    );
  }
}

class _RunsTab extends ConsumerStatefulWidget {
  const _RunsTab();

  @override
  ConsumerState<_RunsTab> createState() => _RunsTabState();
}

class _RunsTabState extends ConsumerState<_RunsTab> {
  bool _failedOnly = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final runs = ref.watch(automationRunsProvider);
    final failed = (runs.value ?? const <AutomationRun>[]).where((r) => !r.ok).length;
    return ResourceList<AutomationRun>(
      value: runs,
      onRefresh: () => ref.refresh(automationRunsProvider.future),
      searchHint: l10n.automationRunsSearch,
      matches: (run, query) =>
          run.automationName.toLowerCase().contains(query) || (run.detail?.toLowerCase().contains(query) ?? false),
      filter: (run) => !_failedOnly || !run.ok,
      header: Align(
        alignment: AlignmentDirectional.centerStart,
        child: FilterChip(
          avatar: const Icon(Icons.highlight_off, size: 18),
          label: Text(l10n.automationRunsFailedOnly(failed)),
          selected: _failedOnly,
          onSelected: (value) => setState(() => _failedOnly = value),
        ),
      ),
      empty: EmptyState(icon: Icons.history, title: l10n.automationRunsEmpty, body: l10n.automationRunsEmptyBody),
      itemBuilder: (context, run) => SurfaceCard(
        onTap: run.automationId.isEmpty ? null : () => context.go(AutomationsRoutes.detail(run.automationId)),
        child: AutomationRunTile(run: run),
      ),
    );
  }
}
