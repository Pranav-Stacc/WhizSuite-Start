import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/presentation/permission_gate.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../application/leads_controller.dart';
import '../domain/lead.dart';
import '../leads_routes.dart';
import 'lead_board.dart';
import 'lead_card.dart';
import 'lead_forms.dart';
import 'lead_stage.dart';
import '../../../core/widgets/menu_filter_chip.dart';
import 'pipeline_summary_view.dart';

enum _LeadsView { board, list }

class LeadsScreen extends ConsumerStatefulWidget {
  const LeadsScreen({super.key});

  /// Width from which stage columns sit side by side.
  static const wideBreakpoint = 840.0;

  @override
  ConsumerState<LeadsScreen> createState() => _LeadsScreenState();
}

class _LeadsScreenState extends ConsumerState<LeadsScreen> {
  final _searchKey = GlobalKey();
  var _view = _LeadsView.board;
  var _filter = const LeadFilter();

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    final created = await showLeadForm(context, ref);
    if (created && mounted) showToast(context, l10n.createdToast);
  }

  Future<void> _move(Lead lead, String stage) async {
    final l10n = AppLocalizations.of(context);
    await runAction(
      context,
      () => ref.read(leadsActionsProvider).moveStage(lead.id, stage),
      success: l10n.leadMovedToast(leadStageLabel(l10n, stage)),
    );
  }

  Future<void> _refresh() => ref.refresh(leadsProvider.future);

  void _open(Lead lead) => context.push(LeadsRoutes.detail(lead.id));

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final leads = ref.watch(leadsProvider);
    final board = _view == _LeadsView.board;

    return PageScaffold(
      title: l10n.leadsTitle,
      actions: [
        IconButton(
          tooltip: board ? l10n.leadsViewList : l10n.leadsViewBoard,
          icon: Icon(board ? Icons.view_list_outlined : Icons.view_kanban_outlined),
          onPressed: () => setState(() => _view = board ? _LeadsView.list : _LeadsView.board),
        ),
      ],
      floatingActionButton: PermissionGate(
        anyOf: const [Permissions.leadsCreate],
        child: CreateFab(label: l10n.leadNew, onPressed: _create),
      ),
      body: AsyncValueView<List<Lead>>(
        value: leads,
        onRetry: () => ref.invalidate(leadsProvider),
        isEmpty: (items) => items.isEmpty,
        empty: RefreshIndicator(
          onRefresh: _refresh,
          child: LayoutBuilder(
            builder: (context, constraints) => SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: SizedBox(
                height: constraints.maxHeight,
                child: EmptyState(
                  icon: Icons.filter_alt_outlined,
                  title: l10n.leadsEmpty,
                  body: l10n.leadsEmptyBody,
                  action: PermissionGate(
                    anyOf: const [Permissions.leadsCreate],
                    child: FilledButton.icon(onPressed: _create, icon: const Icon(Icons.add), label: Text(l10n.leadNew)),
                  ),
                ),
              ),
            ),
          ),
        ),
        data: _content,
      ),
    );
  }

  Widget _content(List<Lead> all) {
    final tokens = context.tokens;
    final now = DateTime.now();
    final boardFilter = _view == _LeadsView.board ? _filter.copyWith(stage: () => null) : _filter;
    final visible = all.where((lead) => boardFilter.matches(lead, now: now)).toList();
    final summary = PipelineSummary.of(visible);
    final staff = ref.watch(staffDirectoryProvider).value;
    final canMove = ref.watch(accessPolicyProvider.select((policy) => policy.can(Permissions.leadsCreate)));
    final callbacks = LeadBoardCallbacks(
      onOpen: _open,
      onRefresh: _refresh,
      ownerName: (id) => staff?.nameOf(id),
      onMove: canMove ? _move : null,
    );
    final wide = MediaQuery.sizeOf(context).width >= LeadsScreen.wideBreakpoint;
    final header = Padding(
      padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _FilterRow(
            searchKey: _searchKey,
            filter: _filter,
            leads: all,
            showStages: _view == _LeadsView.list,
            onChanged: (filter) => setState(() => _filter = filter),
          ),
          SizedBox(height: tokens.md),
          FadeSlideIn(child: PipelineSummaryView(summary: summary)),
        ],
      ),
    );

    if (_view == _LeadsView.list) {
      return _LeadList(
        header: header,
        leads: visible,
        callbacks: callbacks,
        onClearFilters: () => setState(() => _filter = const LeadFilter()),
        filtered: _filter.isActive,
      );
    }
    if (wide) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          header,
          Expanded(child: WideLeadBoard(leads: visible, summary: summary, callbacks: callbacks)),
        ],
      );
    }
    return PhoneLeadBoard(leads: visible, summary: summary, header: header, callbacks: callbacks);
  }
}

class _FilterRow extends ConsumerWidget {
  const _FilterRow({
    required this.searchKey,
    required this.filter,
    required this.leads,
    required this.showStages,
    required this.onChanged,
  });

  final GlobalKey searchKey;
  final LeadFilter filter;
  final List<Lead> leads;
  final bool showStages;
  final ValueChanged<LeadFilter> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final me = ref.watch(sessionProvider).value?.userId;
    final staff = ref.watch(staffDirectoryProvider).value;
    final owners = <String>{?me, for (final lead in leads) ?lead.ownerId}.toList();
    String ownerLabel(String id) => id == me ? l10n.leadsFilterOwnerMe : staff?.nameOf(id) ?? l10n.valueUnknown;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SearchField(
          key: searchKey,
          hint: l10n.leadsSearch,
          onChanged: (query) => onChanged(filter.copyWith(query: query)),
        ),
        SizedBox(height: tokens.sm),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              MenuFilterChip<String>(
                label: l10n.leadsFilterOwner,
                icon: Icons.person_outline,
                options: owners,
                selected: filter.ownerId,
                labelOf: ownerLabel,
                onSelected: (id) => onChanged(filter.copyWith(ownerId: () => id)),
              ),
              SizedBox(width: tokens.sm),
              FilterChip(
                label: Text(l10n.leadsFilterFollowUp),
                avatar: const Icon(Icons.alarm, size: 18),
                showCheckmark: false,
                selected: filter.followUpOnly,
                onSelected: (selected) => onChanged(filter.copyWith(followUpOnly: selected)),
              ),
            ],
          ),
        ),
        if (showStages) ...[
          SizedBox(height: tokens.sm),
          FilterBar<String>(
            options: LeadStages.values,
            selected: filter.stage,
            labelOf: (stage) => leadStageLabel(l10n, stage),
            countOf: (stage) => stage == null ? leads.length : leads.where((l) => l.stage == stage).length,
            onSelected: (stage) => onChanged(filter.copyWith(stage: () => stage)),
          ),
        ],
      ],
    );
  }
}

class _LeadList extends StatelessWidget {
  const _LeadList({
    required this.header,
    required this.leads,
    required this.callbacks,
    required this.onClearFilters,
    required this.filtered,
  });

  final Widget header;
  final List<Lead> leads;
  final LeadBoardCallbacks callbacks;
  final VoidCallback onClearFilters;
  final bool filtered;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    return RefreshIndicator(
      onRefresh: callbacks.onRefresh,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(child: header),
          if (leads.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: EmptyState(
                icon: Icons.search_off,
                title: l10n.searchNoMatches,
                body: l10n.searchNoMatchesBody,
                action: filtered
                    ? OutlinedButton(onPressed: onClearFilters, child: Text(l10n.leadsClearFilters))
                    : null,
              ),
            )
          else
            SliverPadding(
              padding: EdgeInsets.fromLTRB(tokens.lg, tokens.sm, tokens.lg, tokens.xxl * 2),
              sliver: SliverList.separated(
                itemCount: leads.length,
                separatorBuilder: (_, _) => SizedBox(height: tokens.sm),
                itemBuilder: (context, index) => FadeSlideIn(
                  index: index,
                  child: _LeadRow(lead: leads[index], callbacks: callbacks),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Dense list row: company, stage, value, next step and owner.
class _LeadRow extends StatelessWidget {
  const _LeadRow({required this.lead, required this.callbacks});

  static const _ownerAvatarSize = 28.0;
  static const _valueWidth = 96.0;

  final Lead lead;
  final LeadBoardCallbacks callbacks;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final value = context.formats.money(lead.valueMinor, currency: lead.currency, compact: true);
    final owner = callbacks.ownerName(lead.ownerId);
    final due = lead.nextStepAt;
    final move = callbacks.onMove;
    final secondary = [lead.subtitle, lead.nextStep].whereType<String>().join(' · ');
    return SurfaceCard(
      onTap: () => callbacks.onOpen(lead),
      padding: EdgeInsetsDirectional.fromSTEB(tokens.md, tokens.sm, tokens.xs, tokens.sm),
      semanticLabel: l10n.leadCardLabel(lead.companyName, leadStageLabel(l10n, lead.stage), value),
      child: Row(
        children: [
          InitialsAvatar(name: lead.companyName, seed: lead.id, mark: true),
          SizedBox(width: tokens.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(lead.companyName, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleSmall),
                    ),
                    SizedBox(width: tokens.sm),
                    LeadStageBadge(stage: lead.stage, dense: true),
                  ],
                ),
                SizedBox(height: tokens.xs),
                Row(
                  children: [
                    if (secondary.isNotEmpty)
                      Flexible(
                        child: Text(
                          secondary,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: text.bodySmall?.copyWith(color: tokens.muted),
                        ),
                      ),
                    if (due != null && lead.isOpen) ...[SizedBox(width: tokens.sm), LeadDueBadge(date: due)],
                  ],
                ),
              ],
            ),
          ),
          SizedBox(width: tokens.sm),
          SizedBox(
            width: _valueWidth,
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: text.titleSmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
            ),
          ),
          if (owner != null) ...[
            SizedBox(width: tokens.md),
            Tooltip(message: owner, child: InitialsAvatar(name: owner, seed: lead.ownerId, size: _ownerAvatarSize)),
          ],
          if (move != null) LeadMoveMenu(stage: lead.stage, onSelected: (stage) => move(lead, stage)),
        ],
      ),
    );
  }
}

