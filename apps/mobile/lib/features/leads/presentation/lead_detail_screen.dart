import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/presentation/permission_gate.dart';
import '../../clients/clients_routes.dart';
import '../../directory/application/directory_providers.dart';
import '../application/leads_controller.dart';
import '../domain/lead.dart';
import '../leads_routes.dart';
import 'lead_card.dart';
import 'lead_forms.dart';
import 'lead_stage.dart';

enum _LeadMenu { delete }

class LeadDetailScreen extends ConsumerWidget {
  const LeadDetailScreen({required this.leadId, super.key});

  final String leadId;

  Future<void> _delete(BuildContext context, WidgetRef ref, Lead lead) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await confirmAction(
      context,
      title: l10n.deleteConfirmTitle(lead.companyName),
      body: l10n.deleteConfirmBody,
      confirmLabel: l10n.delete,
      destructive: true,
    );
    if (!confirmed || !context.mounted) return;
    final deleted = await runAction(context, () => ref.read(leadsActionsProvider).delete(lead.id), success: l10n.deletedToast);
    if (deleted && context.mounted) context.go(LeadsRoutes.root);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final lead = ref.watch(leadProvider(leadId));
    final loaded = lead.value;

    return PageScaffold(
      title: loaded?.companyName ?? l10n.leadsTitle,
      actions: [
        if (loaded != null)
          PermissionGate(
            anyOf: const [Permissions.leadsCreate],
            child: IconButton(
              tooltip: l10n.leadEdit,
              icon: const Icon(Icons.edit_outlined),
              onPressed: () async {
                final saved = await showLeadForm(context, ref, lead: loaded);
                if (saved && context.mounted) showToast(context, l10n.savedToast);
              },
            ),
          ),
        if (loaded != null)
          PermissionGate(
            anyOf: const [Permissions.leadsCreate],
            child: PopupMenuButton<_LeadMenu>(
              tooltip: l10n.moreActions,
              onSelected: (_) => _delete(context, ref, loaded),
              itemBuilder: (_) => [
                PopupMenuItem(
                  value: _LeadMenu.delete,
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error),
                    title: Text(l10n.leadDelete),
                  ),
                ),
              ],
            ),
          ),
      ],
      body: AsyncValueView<Lead>(
        value: lead,
        onRetry: () => ref.invalidate(leadProvider(leadId)),
        data: (lead) => _LeadBody(lead: lead, onRefresh: () => ref.refresh(leadProvider(leadId).future)),
      ),
    );
  }
}

class _LeadBody extends ConsumerWidget {
  const _LeadBody({required this.lead, required this.onRefresh});

  static const _markSize = 56.0;
  static const _minMetricWidth = 160.0;
  static const _metricColumns = 4;

  final Lead lead;
  final Future<void> Function() onRefresh;

  Future<void> _move(BuildContext context, WidgetRef ref, String stage) async {
    final l10n = AppLocalizations.of(context);
    await runAction(
      context,
      () => ref.read(leadsActionsProvider).moveStage(lead.id, stage),
      success: l10n.leadMovedToast(leadStageLabel(l10n, stage)),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final subtitle = [lead.contactName, lead.industry].whereType<String>().join(' · ');
    final converted = lead.convertedClientId;
    final weight = LeadPipeline.weightOf(lead.stage);
    String money(int minor) => formats.money(minor, currency: lead.currency);
    final metrics = [
      MetricTile(label: l10n.leadValue, icon: Icons.payments_outlined, value: money(lead.valueMinor)),
      MetricTile(label: l10n.leadProbability, icon: Icons.percent, value: formats.percent(weight)),
      MetricTile(
        label: l10n.leadWeightedValue,
        icon: Icons.trending_up,
        value: money((lead.valueMinor * weight).round()),
      ),
      MetricTile(label: l10n.leadCreated, icon: Icons.event_outlined, value: formats.date(lead.createdAt)),
    ];
    var section = 0;
    Widget staggered(Widget child) => FadeSlideIn(index: section++, child: child);

    return ReadableBody(
      onRefresh: onRefresh,
      children: [
        staggered(
          Row(
            children: [
              InitialsAvatar(name: lead.companyName, seed: lead.id, mark: true, size: _markSize),
              SizedBox(width: tokens.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Semantics(header: true, child: Text(lead.companyName, style: text.headlineSmall)),
                    if (subtitle.isNotEmpty) Text(subtitle, style: text.bodyMedium?.copyWith(color: tokens.muted)),
                  ],
                ),
              ),
              SizedBox(width: tokens.sm),
              LeadStageBadge(stage: lead.stage),
            ],
          ),
        ),
        if (converted != null) ...[
          SizedBox(height: tokens.lg),
          staggered(_ConvertedBanner(clientId: converted)),
        ],
        SizedBox(height: tokens.xl),
        staggered(
          SectionCard(
            title: l10n.leadStageLabel,
            child: _StageSection(lead: lead, onMove: (stage) => _move(context, ref, stage)),
          ),
        ),
        SizedBox(height: tokens.xl),
        staggered(
          LayoutBuilder(
            builder: (context, constraints) {
              final columns = gridColumns(constraints.maxWidth, minTileWidth: _minMetricWidth, max: _metricColumns);
              final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
              return Wrap(
                spacing: tokens.md,
                runSpacing: tokens.md,
                children: [for (final tile in metrics) SizedBox(width: width, child: tile)],
              );
            },
          ),
        ),
        SizedBox(height: tokens.xl),
        staggered(_NextStepSection(lead: lead)),
        SizedBox(height: tokens.xl),
        staggered(SectionCard(title: l10n.leadContactSection, child: _ContactSection(lead: lead))),
        SizedBox(height: tokens.xl),
        staggered(SectionCard(title: l10n.leadDetails, child: _DetailsSection(lead: lead))),
      ],
    );
  }
}

class _ConvertedBanner extends StatelessWidget {
  const _ConvertedBanner({required this.clientId});

  static const _fillAlpha = 0.08;

  final String clientId;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final color = StatusTone.success.color(tokens);
    return Container(
      padding: EdgeInsetsDirectional.fromSTEB(tokens.lg, tokens.sm, tokens.sm, tokens.sm),
      decoration: BoxDecoration(
        color: color.withValues(alpha: _fillAlpha),
        borderRadius: BorderRadius.circular(tokens.radius + 6),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          Icon(Icons.check_circle_outline, color: color),
          SizedBox(width: tokens.md),
          Expanded(child: Text(l10n.leadConverted, style: Theme.of(context).textTheme.titleSmall)),
          PermissionGate(
            anyOf: const [Permissions.clientsView],
            child: TextButton.icon(
              onPressed: () => context.push(ClientsRoutes.detail(clientId)),
              icon: const Icon(Icons.open_in_new, size: 18),
              label: Text(l10n.leadOpenClient),
            ),
          ),
        ],
      ),
    );
  }
}

/// Progress through the open stages to a won/lost close, plus the move actions.
class _StageSection extends ConsumerWidget {
  const _StageSection({required this.lead, required this.onMove});

  final Lead lead;
  final ValueChanged<String> onMove;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final canMove = ref.watch(accessPolicyProvider.select((policy) => policy.can(Permissions.leadsCreate)));
    final next = LeadPipeline.next(lead.stage);
    final previous = LeadPipeline.previous(lead.stage);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _StageStepper(stage: lead.stage, onSelected: canMove ? onMove : null),
        if (canMove) ...[
          SizedBox(height: tokens.lg),
          Wrap(
            spacing: tokens.sm,
            runSpacing: tokens.sm,
            children: [
              if (lead.isOpen) ...[
                if (previous != null)
                  OutlinedButton.icon(
                    onPressed: () => onMove(previous),
                    icon: const Icon(Icons.arrow_back, size: 18),
                    label: Text(l10n.leadStepBack(leadStageLabel(l10n, previous))),
                  ),
                if (next != null && next != LeadStages.won)
                  FilledButton.icon(
                    onPressed: () => onMove(next),
                    icon: const Icon(Icons.arrow_forward, size: 18),
                    label: Text(l10n.leadAdvance(leadStageLabel(l10n, next))),
                  ),
                FilledButton.tonalIcon(
                  onPressed: () => onMove(LeadStages.won),
                  icon: Icon(Icons.emoji_events_outlined, size: 18, color: StatusTone.success.color(tokens)),
                  label: Text(l10n.leadMarkWon),
                ),
                TextButton.icon(
                  onPressed: () => onMove(LeadStages.lost),
                  icon: const Icon(Icons.do_not_disturb_on_outlined, size: 18),
                  label: Text(l10n.leadMarkLost),
                ),
              ] else if (previous != null)
                OutlinedButton.icon(
                  onPressed: () => onMove(previous),
                  icon: const Icon(Icons.replay, size: 18),
                  label: Text(l10n.leadReopen),
                ),
            ],
          ),
        ],
      ],
    );
  }
}

class _StageStepper extends StatelessWidget {
  const _StageStepper({required this.stage, this.onSelected});

  static const _barHeight = 6.0;

  final String stage;
  final ValueChanged<String>? onSelected;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final closing = stage == LeadStages.lost ? LeadStages.lost : LeadStages.won;
    final steps = [...LeadPipeline.openStages, closing];
    final current = LeadPipeline.openStages.contains(stage) ? steps.indexOf(stage) : steps.length - 1;
    final reachedColor = leadStageTone(stage).color(tokens);
    return Semantics(
      label: '${l10n.leadStageProgress(current + 1, steps.length)}, ${leadStageLabel(l10n, stage)}',
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final (i, step) in steps.indexed) ...[
            if (i > 0) SizedBox(width: tokens.xs),
            Expanded(
              child: Tooltip(
                message: leadStageLabel(l10n, step),
                child: InkWell(
                  borderRadius: BorderRadius.circular(tokens.radius),
                  onTap: onSelected == null || step == stage ? null : () => onSelected?.call(step),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: kMinInteractiveDimension),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        AnimatedContainer(
                          duration: AppMotion.medium,
                          curve: AppMotion.standard,
                          height: _barHeight,
                          decoration: BoxDecoration(
                            color: i <= current ? reachedColor : tokens.subtle,
                            borderRadius: BorderRadius.circular(_barHeight),
                            border: Border.all(color: i <= current ? reachedColor : tokens.border),
                          ),
                        ),
                        SizedBox(height: tokens.xs),
                        ExcludeSemantics(
                          child: Text(
                            leadStageLabel(l10n, step),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: text.labelSmall?.copyWith(
                              color: i == current ? tokens.fg : tokens.muted,
                              fontWeight: i == current ? FontWeight.w600 : null,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _NextStepSection extends ConsumerWidget {
  const _NextStepSection({required this.lead});

  final Lead lead;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final step = lead.nextStep;
    final due = lead.nextStepAt;
    return SectionCard(
      title: l10n.leadNextStep,
      trailing: PermissionGate(
        anyOf: const [Permissions.leadsCreate],
        child: TextButton.icon(
          onPressed: () async {
            final saved = await showNextStepForm(context, ref, lead);
            if (saved && context.mounted) showToast(context, l10n.savedToast);
          },
          icon: const Icon(Icons.edit_outlined, size: 18),
          label: Text(l10n.leadNextStepEdit),
        ),
      ),
      child: step == null && due == null
          ? Text(l10n.leadNextStepEmpty, style: text.bodyMedium?.copyWith(color: tokens.muted))
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (step != null) Text(step, style: text.bodyLarge),
                if (due != null) ...[
                  SizedBox(height: tokens.sm),
                  Row(
                    children: [
                      Icon(Icons.event_outlined, size: 18, color: tokens.muted),
                      SizedBox(width: tokens.sm),
                      Text(context.formats.date(due), style: text.bodyMedium?.copyWith(color: tokens.secondary)),
                      if (lead.isOpen) ...[SizedBox(width: tokens.sm), LeadDueBadge(date: due)],
                    ],
                  ),
                ],
              ],
            ),
    );
  }
}

class _ContactSection extends StatelessWidget {
  const _ContactSection({required this.lead});

  final Lead lead;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final name = lead.contactName;
    final email = lead.contactEmail;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: InitialsAvatar(name: name ?? lead.companyName, seed: lead.id),
      title: Text(name ?? l10n.valueUnknown),
      subtitle: Text(email ?? l10n.valueUnknown, style: TextStyle(color: tokens.muted)),
      trailing: email == null
          ? null
          : IconButton(
              tooltip: l10n.leadEmailContact(name ?? email),
              icon: const Icon(Icons.mail_outline),
              onPressed: () => launchUrl(Uri(scheme: 'mailto', path: email)),
            ),
    );
  }
}

class _DetailsSection extends ConsumerWidget {
  const _DetailsSection({required this.lead});

  static const _ownerAvatarSize = 22.0;

  final Lead lead;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final owner = ref.watch(staffDirectoryProvider).value?.nameOf(lead.ownerId);
    final website = lead.website;
    final updated = lead.updatedAt;
    return Column(
      children: [
        InfoRow(label: l10n.leadIndustry, value: Text(lead.industry ?? l10n.valueUnknown)),
        InfoRow(
          label: l10n.leadWebsite,
          value: website == null ? Text(l10n.valueUnknown) : _LinkText(label: website),
        ),
        InfoRow(
          label: l10n.leadSource,
          value: lead.source == null ? Text(l10n.valueUnknown) : TagChip(label: lead.source ?? ''),
        ),
        InfoRow(
          label: l10n.leadOwner,
          value: owner == null
              ? Text(l10n.unassigned)
              : Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    InitialsAvatar(name: owner, seed: lead.ownerId, size: _ownerAvatarSize),
                    SizedBox(width: tokens.sm),
                    Flexible(child: Text(owner, overflow: TextOverflow.ellipsis)),
                  ],
                ),
        ),
        InfoRow(label: l10n.leadCreated, value: Text(formats.date(lead.createdAt))),
        if (updated != null) InfoRow(label: l10n.leadUpdated, value: Text(formats.relative(updated))),
      ],
    );
  }
}

class _LinkText extends StatelessWidget {
  const _LinkText({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final uri = Uri.tryParse(label.contains('://') ? label : 'https://$label');
    if (uri == null) return Text(label);
    return Semantics(
      link: true,
      child: InkWell(
        onTap: () => launchUrl(uri, mode: LaunchMode.externalApplication),
        child: Text(
          label,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(color: context.tokens.primary, decoration: TextDecoration.underline),
        ),
      ),
    );
  }
}
