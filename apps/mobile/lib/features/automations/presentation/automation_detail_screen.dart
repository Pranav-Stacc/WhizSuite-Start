import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

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
import '../application/automations_controller.dart';
import '../automations_routes.dart';
import '../domain/automation.dart';
import 'automation_forms.dart';
import 'automation_labels.dart';
import 'automation_widgets.dart';

enum _MenuAction { publish, delete }

class AutomationDetailScreen extends ConsumerWidget {
  const AutomationDetailScreen({required this.automationId, super.key});

  final String automationId;

  Future<void> _edit(BuildContext context, WidgetRef ref, Automation automation) async {
    final l10n = AppLocalizations.of(context);
    final saved = await showAutomationForm(context, ref, automation: automation);
    if (saved && context.mounted) showToast(context, l10n.savedToast);
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, Automation automation) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await confirmAction(
      context,
      title: l10n.deleteConfirmTitle(automation.name),
      body: l10n.automationDeleteBody,
      confirmLabel: l10n.delete,
      destructive: true,
    );
    if (!confirmed || !context.mounted) return;
    final deleted = await runAction(context, () => ref.read(automationsActionsProvider).delete(automation.id));
    if (deleted && context.mounted) {
      showToast(context, l10n.deletedToast);
      context.go(AutomationsRoutes.root);
    }
  }

  Future<void> _publish(BuildContext context, WidgetRef ref, Automation automation) async {
    final l10n = AppLocalizations.of(context);
    int? version;
    final published = await runAction(
      context,
      () async => version = await ref.read(automationsActionsProvider).publish(automation.id),
    );
    final number = version;
    if (published && number != null && context.mounted) showToast(context, l10n.automationPublished(number));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final automation = ref.watch(automationProvider(automationId));
    final loaded = automation.value;

    return PageScaffold(
      title: loaded?.name ?? l10n.automationsTitle,
      actions: [
        if (loaded != null)
          PermissionGate(
            anyOf: const [Permissions.automationsManage],
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  tooltip: l10n.automationEdit,
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: () => _edit(context, ref, loaded),
                ),
                PopupMenuButton<_MenuAction>(
                  tooltip: l10n.moreActions,
                  onSelected: (action) => switch (action) {
                    _MenuAction.publish => _publish(context, ref, loaded),
                    _MenuAction.delete => _delete(context, ref, loaded),
                  },
                  itemBuilder: (_) => [
                    PopupMenuItem(
                      value: _MenuAction.publish,
                      child: ListTile(leading: const Icon(Icons.publish_outlined), title: Text(l10n.automationPublish)),
                    ),
                    PopupMenuItem(
                      value: _MenuAction.delete,
                      child: ListTile(
                        leading: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error),
                        title: Text(l10n.delete, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
      ],
      body: AsyncValueView<Automation>(
        value: automation,
        onRetry: () => ref.invalidate(automationProvider(automationId)),
        data: (automation) => _Body(
          automation: automation,
          onPublish: () => _publish(context, ref, automation),
          onRefresh: () async {
            ref
              ..invalidate(automationRunsProvider)
              ..invalidate(automationProvider(automationId));
            await ref.read(automationProvider(automationId).future);
          },
        ),
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.automation, required this.onPublish, required this.onRefresh});

  static const _recentRunsLimit = 10;

  final Automation automation;
  final VoidCallback onPublish;
  final Future<void> Function() onRefresh;

  Future<void> _run(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final ran = await showRunAutomationForm(context, ref, automation);
    if (ran && context.mounted) showToast(context, l10n.automationRunDone(automation.name));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final rate = automation.successRate;
    final lastRun = automation.lastRunAt;

    return ReadableBody(
      onRefresh: onRefresh,
      children: [
        FadeSlideIn(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(automation.name, style: text.headlineSmall),
                    SizedBox(height: tokens.xs),
                    StatusBadge(
                      label: automationStatusLabel(l10n, automation.status),
                      tone: automationStatusTone(automation.status),
                    ),
                  ],
                ),
              ),
              AutomationEnabledSwitch(automation: automation),
            ],
          ),
        ),
        SizedBox(height: tokens.xl),
        FadeSlideIn(
          index: 1,
          child: SectionCard(
            title: l10n.automationFlowTitle,
            child: AutomationFlow(trigger: automation.trigger, action: automation.action, vertical: true),
          ),
        ),
        SizedBox(height: tokens.lg),
        FadeSlideIn(
          index: 2,
          child: PermissionGate(
            anyOf: const [Permissions.automationsManage],
            child: Wrap(
              spacing: tokens.sm,
              runSpacing: tokens.sm,
              children: [
                FilledButton.icon(
                  onPressed: () => _run(context, ref),
                  icon: const Icon(Icons.play_arrow),
                  label: Text(l10n.automationRunNow),
                ),
                OutlinedButton.icon(
                  onPressed: onPublish,
                  icon: const Icon(Icons.publish_outlined),
                  label: Text(l10n.automationPublish),
                ),
              ],
            ),
          ),
        ),
        SizedBox(height: tokens.xl),
        FadeSlideIn(
          index: 3,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final tiles = [
                MetricTile(label: l10n.automationStatRuns, icon: Icons.play_circle_outline, value: formats.number(automation.runs)),
                MetricTile(
                  label: l10n.automationStatFailures,
                  icon: Icons.error_outline,
                  value: formats.number(automation.failures),
                  tone: automation.failures > 0 ? StatusTone.danger : StatusTone.neutral,
                ),
                MetricTile(
                  label: l10n.automationSuccessRate,
                  icon: Icons.verified_outlined,
                  value: rate == null ? l10n.valueUnknown : formats.percent(rate),
                  tone: rate == null ? StatusTone.neutral : automationSuccessTone(rate),
                ),
                MetricTile(
                  label: l10n.automationStatLastRun,
                  icon: Icons.schedule,
                  value: lastRun == null ? l10n.automationNever : formats.relative(lastRun),
                ),
              ];
              final columns = gridColumns(constraints.maxWidth, minTileWidth: 160, max: 4);
              final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
              return Wrap(
                spacing: tokens.md,
                runSpacing: tokens.md,
                children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
              );
            },
          ),
        ),
        SizedBox(height: tokens.xl),
        FadeSlideIn(
          index: 4,
          child: SectionCard(
            title: l10n.automationConfigTitle,
            child: Column(
              children: [
                InfoRow(label: l10n.automationTriggerField, value: Text(automationTriggerLabel(l10n, automation.trigger))),
                InfoRow(label: l10n.automationActionField, value: Text(automationActionLabel(l10n, automation.action))),
                InfoRow(label: l10n.automationStatusField, value: Text(automationStatusLabel(l10n, automation.status))),
                InfoRow(label: l10n.automationCreated, value: Text(formats.dateTime(automation.createdAt))),
                InfoRow(label: l10n.automationUpdated, value: Text(formats.relative(automation.updatedAt))),
              ],
            ),
          ),
        ),
        SizedBox(height: tokens.xl),
        FadeSlideIn(index: 5, child: _RecentRuns(automationId: automation.id, limit: _recentRunsLimit)),
      ],
    );
  }
}

class _RecentRuns extends ConsumerWidget {
  const _RecentRuns({required this.automationId, required this.limit});

  final String automationId;
  final int limit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final runs = ref.watch(automationRunsProvider);
    final muted = Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted);
    return SectionCard(
      title: l10n.automationRecentRuns,
      child: switch (runs) {
        AsyncValue(:final value?) => () {
            final own = value.where((r) => r.automationId == automationId).take(limit).toList();
            if (own.isEmpty) return Text(l10n.automationRunsEmpty, style: muted);
            return Column(
              children: [
                for (final (i, run) in own.indexed) ...[
                  if (i > 0) Divider(height: tokens.lg),
                  AutomationRunTile(run: run, showAutomation: false),
                ],
              ],
            );
          }(),
        AsyncValue(hasError: true) => Row(
            children: [
              Expanded(child: Text(l10n.errorTitle, style: muted)),
              TextButton(onPressed: () => ref.invalidate(automationRunsProvider), child: Text(l10n.retry)),
            ],
          ),
        _ => const LinearProgressIndicator(),
      },
    );
  }
}
