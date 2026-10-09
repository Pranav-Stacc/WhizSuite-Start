import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/forms.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/workflows_controller.dart';
import '../domain/workflow.dart';
import '../workflows_routes.dart';
import 'workflow_forms.dart';
import 'workflow_widgets.dart';

class WorkflowDetailScreen extends ConsumerWidget {
  const WorkflowDetailScreen({required this.workflowId, super.key});

  final String workflowId;

  Future<void> _edit(BuildContext context, WidgetRef ref, Workflow workflow) async {
    final l10n = AppLocalizations.of(context);
    final saved = await showWorkflowForm(context, ref, workflow: workflow);
    if (saved && context.mounted) showToast(context, l10n.savedToast);
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, Workflow workflow) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await confirmAction(
      context,
      title: l10n.deleteConfirmTitle(workflow.name),
      body: l10n.deleteConfirmBody,
      confirmLabel: l10n.delete,
      destructive: true,
    );
    if (!confirmed || !context.mounted) return;
    final deleted = await runAction(context, () => ref.read(workflowsActionsProvider).delete(workflow.id));
    if (deleted && context.mounted) {
      showToast(context, l10n.deletedToast);
      context.go(WorkflowsRoutes.root);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final workflow = ref.watch(workflowProvider(workflowId));
    final loaded = workflow.value;
    final error = Theme.of(context).colorScheme.error;

    return PageScaffold(
      title: loaded?.name ?? l10n.workflowsTitle,
      actions: [
        if (loaded != null)
          PermissionGate(
            anyOf: const [Permissions.workflowsManage],
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  tooltip: l10n.workflowEdit,
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: () => _edit(context, ref, loaded),
                ),
                PopupMenuButton<VoidCallback>(
                  tooltip: l10n.moreActions,
                  onSelected: (action) => action(),
                  itemBuilder: (_) => [
                    PopupMenuItem(
                      value: () => _delete(context, ref, loaded),
                      child: ListTile(
                        leading: Icon(Icons.delete_outline, color: error),
                        title: Text(l10n.delete, style: TextStyle(color: error)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
      ],
      body: AsyncValueView<Workflow>(
        value: workflow,
        onRetry: () => ref.invalidate(workflowProvider(workflowId)),
        data: (workflow) => _Body(
          workflow: workflow,
          onRefresh: () async {
            final versionId = workflow.versionId;
            if (versionId != null) ref.invalidate(workflowVersionProvider(versionId));
            ref.invalidate(workflowProvider(workflowId));
            await ref.read(workflowProvider(workflowId).future);
          },
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.workflow, required this.onRefresh});

  final Workflow workflow;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final sla = workflow.slaHours;
    final versionId = workflow.versionId;

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
                    Text(workflow.name, style: text.headlineSmall),
                    SizedBox(height: tokens.xs),
                    WorkflowBadges(workflow: workflow),
                  ],
                ),
              ),
              WorkflowActiveSwitch(workflow: workflow),
            ],
          ),
        ),
        SizedBox(height: tokens.xl),
        FadeSlideIn(
          index: 1,
          child: SectionCard(
            title: l10n.workflowStagesTitle,
            child: WorkflowStageStepper(stages: workflow.stages),
          ),
        ),
        SizedBox(height: tokens.xl),
        FadeSlideIn(
          index: 2,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final tiles = [
                MetricTile(
                  label: l10n.workflowStagesTitle,
                  icon: Icons.linear_scale,
                  value: formats.number(workflow.stages.length),
                ),
                MetricTile(
                  label: l10n.workflowSlaField,
                  icon: Icons.schedule,
                  value: sla == null ? l10n.valueUnknown : formats.duration(sla * Duration.minutesPerHour),
                ),
                MetricTile(
                  label: l10n.workflowApprovalMetric,
                  icon: Icons.how_to_reg_outlined,
                  value: workflow.requiresClientApproval ? l10n.workflowClientApproval : l10n.workflowInternalOnly,
                  tone: workflow.requiresClientApproval ? StatusTone.violet : StatusTone.neutral,
                ),
              ];
              final columns = gridColumns(constraints.maxWidth, minTileWidth: 180, max: 3);
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
        if (versionId == null)
          FadeSlideIn(
            index: 3,
            child: SectionCard(
              title: l10n.workflowVersionsTitle,
              child: Text(l10n.workflowNoVersion, style: text.bodyMedium?.copyWith(color: tokens.muted)),
            ),
          )
        else ...[
          FadeSlideIn(index: 3, child: _VersionSection(workflow: workflow, versionId: versionId)),
          SizedBox(height: tokens.xl),
          FadeSlideIn(index: 4, child: _TransitionChecker(versionId: versionId)),
        ],
        SizedBox(height: tokens.xl),
        FadeSlideIn(
          index: 5,
          child: SectionCard(
            title: l10n.details,
            child: Column(
              children: [
                InfoRow(label: l10n.workflowEntityType, value: Text(l10n.workflowEntity(workflow.entityType))),
                InfoRow(label: l10n.workflowCreated, value: Text(formats.dateTime(workflow.createdAt))),
                InfoRow(label: l10n.workflowUpdated, value: Text(formats.relative(workflow.updatedAt))),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _VersionSection extends ConsumerWidget {
  const _VersionSection({required this.workflow, required this.versionId});

  final Workflow workflow;
  final String versionId;

  Future<void> _publish(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    await runAction(
      context,
      () => ref.read(workflowsActionsProvider).publishVersion(workflow.id, versionId),
      success: l10n.workflowVersionPublishedToast,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final version = ref.watch(workflowVersionProvider(versionId));
    return SectionCard(
      title: l10n.workflowVersionsTitle,
      child: AsyncValueView<WorkflowVersion>(
        value: version,
        onRetry: () => ref.invalidate(workflowVersionProvider(versionId)),
        loading: const LinearProgressIndicator(),
        data: (version) {
          final publishedAt = version.publishedAt;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: tokens.xs),
                    decoration: BoxDecoration(
                      color: tokens.subtle,
                      borderRadius: BorderRadius.circular(tokens.radius + 4),
                      border: Border.all(color: tokens.border),
                    ),
                    child: Text(l10n.workflowVersionLabel(version.version), style: text.labelLarge),
                  ),
                  SizedBox(width: tokens.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l10n.workflowVersionCurrent, style: text.titleSmall),
                        Text(
                          publishedAt == null ? l10n.workflowVersionUnpublished : l10n.workflowVersionPublishedOn(formats.date(publishedAt)),
                          style: text.bodySmall?.copyWith(color: tokens.muted),
                        ),
                      ],
                    ),
                  ),
                  StatusBadge(
                    label: l10n.workflowVersionStatus(version.status),
                    tone: version.isPublished ? StatusTone.success : StatusTone.warning,
                    dense: true,
                  ),
                ],
              ),
              if (!version.isPublished) ...[
                SizedBox(height: tokens.md),
                PermissionGate(
                  anyOf: const [Permissions.workflowsManage],
                  child: Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: FilledButton.icon(
                      onPressed: () => _publish(context, ref),
                      icon: const Icon(Icons.publish_outlined),
                      label: Text(l10n.workflowVersionPublish),
                    ),
                  ),
                ),
              ],
              SizedBox(height: tokens.lg),
              Text(l10n.workflowTransitionsTitle, style: text.labelMedium?.copyWith(color: tokens.muted)),
              SizedBox(height: tokens.sm),
              if (version.transitions.isEmpty)
                Text(l10n.workflowTransitionsEmpty, style: text.bodyMedium?.copyWith(color: tokens.muted))
              else
                for (final transition in version.transitions)
                  Padding(
                    padding: EdgeInsets.only(bottom: tokens.xs),
                    child: Row(
                      children: [
                        Flexible(child: Text(version.nameOf(transition.fromKey), overflow: TextOverflow.ellipsis)),
                        Padding(
                          padding: EdgeInsets.symmetric(horizontal: tokens.sm),
                          child: Icon(Icons.arrow_forward, size: 16, color: tokens.muted),
                        ),
                        Flexible(child: Text(version.nameOf(transition.toKey), overflow: TextOverflow.ellipsis)),
                      ],
                    ),
                  ),
            ],
          );
        },
      ),
    );
  }
}

class _TransitionChecker extends ConsumerStatefulWidget {
  const _TransitionChecker({required this.versionId});

  final String versionId;

  @override
  ConsumerState<_TransitionChecker> createState() => _TransitionCheckerState();
}

class _TransitionCheckerState extends ConsumerState<_TransitionChecker> {
  String? _from;
  String? _to;
  bool? _allowed;
  bool _checking = false;

  Future<void> _check(String from, String to) async {
    setState(() {
      _checking = true;
      _allowed = null;
    });
    bool? allowed;
    await runAction(
      context,
      () async => allowed = await ref
          .read(workflowsActionsProvider)
          .canTransition(widget.versionId, fromKey: from, toKey: to),
    );
    if (mounted) {
      setState(() {
        _checking = false;
        _allowed = allowed;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final version = ref.watch(workflowVersionProvider(widget.versionId)).value;
    final states = version?.states ?? const <WorkflowState>[];
    final from = _from;
    final to = _to;
    final allowed = _allowed;

    return SectionCard(
      title: l10n.workflowCheckerTitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.workflowCheckerBody, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted)),
          SizedBox(height: tokens.md),
          OptionField<String>(
            label: l10n.workflowCheckerFrom,
            value: from,
            options: [for (final s in states) s.key],
            labelOf: (key) => version?.nameOf(key) ?? key,
            onChanged: (value) => setState(() {
              _from = value;
              _allowed = null;
            }),
          ),
          SizedBox(height: tokens.md),
          OptionField<String>(
            label: l10n.workflowCheckerTo,
            value: to,
            options: [for (final s in states) s.key],
            labelOf: (key) => version?.nameOf(key) ?? key,
            onChanged: (value) => setState(() {
              _to = value;
              _allowed = null;
            }),
          ),
          SizedBox(height: tokens.md),
          Row(
            children: [
              FilledButton.tonalIcon(
                onPressed: from == null || to == null || _checking ? null : () => _check(from, to),
                icon: _checking
                    ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.rule),
                label: Text(l10n.workflowCheckerCheck),
              ),
              SizedBox(width: tokens.md),
              if (allowed != null)
                Flexible(
                  child: Semantics(
                    liveRegion: true,
                    child: StatusBadge(
                      label: allowed ? l10n.workflowCheckerAllowed : l10n.workflowCheckerBlocked,
                      tone: allowed ? StatusTone.success : StatusTone.danger,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
