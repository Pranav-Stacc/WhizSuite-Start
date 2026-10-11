import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/approvals_controller.dart';
import '../approvals_routes.dart';
import '../domain/approval.dart';
import 'approval_card.dart';
import 'approval_labels.dart';

class ApprovalsScreen extends ConsumerStatefulWidget {
  const ApprovalsScreen({super.key});

  static const _minTileWidth = 320.0;
  static const _tileHeight = 236.0;
  static const _minMetricWidth = 160.0;

  @override
  ConsumerState<ApprovalsScreen> createState() => _ApprovalsScreenState();
}

enum _ApprovalsQuickFilter { all, pending, overdue, decided }

class _ApprovalsScreenState extends ConsumerState<ApprovalsScreen> {
  String? _status;
  _ApprovalsQuickFilter _quickFilter = _ApprovalsQuickFilter.all;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final canApprove = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.approvalsApprove)));
    final approvals = ref.watch(approvalsProvider);
    final items = approvals.value ?? const <ApprovalRequest>[];
    final titles = ref.watch(approvalSubjectTitlesProvider);
    final members = ref.watch(memberDirectoryProvider).value ?? Directory.empty;
    final pending = items.where((a) => a.isPending).length;
    final overdue = items.where((a) => a.isOverdue()).length;
    final decided = items.length - pending;

    return PageScaffold(
      title: l10n.approvalsTitle,
      body: ResourceList<ApprovalRequest>(
        value: approvals,
        onRefresh: () => ref.refresh(approvalsProvider.future),
        minTileWidth: ApprovalsScreen._minTileWidth,
        tileHeight: ApprovalsScreen._tileHeight,
        searchHint: l10n.approvalsSearch,
        matches: (approval, query) {
          final filter = ApprovalFilter(query: query, status: _status);
          return filter.matches(
            approval,
            requesterName: members.nameOf(approval.requestedById),
            subjectTitle: titles[approval.subjectId],
          );
        },
        filter: (approval) {
          switch (_quickFilter) {
            case _ApprovalsQuickFilter.pending:
              return approval.isPending;
            case _ApprovalsQuickFilter.overdue:
              return approval.isPending && approval.isOverdue();
            case _ApprovalsQuickFilter.decided:
              return !approval.isPending;
            case _ApprovalsQuickFilter.all:
              return _status == null || approval.status == _status;
          }
        },
        header: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              canApprove ? l10n.approvalsDescription : l10n.approvalsDescriptionViewer,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.secondary),
            ),
            if (items.isNotEmpty) ...[
              SizedBox(height: tokens.lg),
              LayoutBuilder(
                builder: (context, constraints) {
                  final tiles = [
                    MetricTile(
                      label: l10n.approvalsStatPending,
                      icon: Icons.hourglass_empty,
                      value: formats.number(pending),
                      caption: l10n.approvalsStatPendingHint,
                      tone: pending > 0 ? StatusTone.warning : StatusTone.neutral,
                      onTap: () => setState(() {
                        _quickFilter = _ApprovalsQuickFilter.pending;
                        _status = null;
                      }),
                    ),
                    MetricTile(
                      label: l10n.approvalsStatOverdue,
                      icon: Icons.event_busy_outlined,
                      value: formats.number(overdue),
                      caption: l10n.approvalsStatOverdueHint,
                      tone: overdue > 0 ? StatusTone.danger : StatusTone.neutral,
                      onTap: () => setState(() {
                        _quickFilter = _ApprovalsQuickFilter.overdue;
                        _status = null;
                      }),
                    ),
                    MetricTile(
                      label: l10n.approvalsStatDone,
                      icon: Icons.verified_outlined,
                      value: formats.number(decided),
                      caption: l10n.approvalsStatDoneHint,
                      tone: StatusTone.success,
                      onTap: () => setState(() {
                        _quickFilter = _ApprovalsQuickFilter.decided;
                        _status = null;
                      }),
                    ),
                  ];
                  final columns = gridColumns(constraints.maxWidth, minTileWidth: ApprovalsScreen._minMetricWidth, max: 3);
                  final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
                  return Wrap(
                    spacing: tokens.md,
                    runSpacing: tokens.md,
                    children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
                  );
                },
              ),
            ],
            SizedBox(height: tokens.lg),
            FilterBar<String>(
              options: ApprovalStatuses.values,
              selected: _status,
              labelOf: (status) => approvalStatusLabel(l10n, status),
              countOf: (status) => status == null ? items.length : items.where((a) => a.status == status).length,
              onSelected: (status) => setState(() {
                _status = status;
                _quickFilter = _ApprovalsQuickFilter.all;
              }),
            ),
          ],
        ),
        empty: EmptyState(
          icon: Icons.verified_outlined,
          title: l10n.approvalsEmpty,
          body: l10n.approvalsEmptyBody,
        ),
        itemBuilder: (context, approval) => ApprovalCard(
          approval: approval,
          subjectTitle: titles[approval.subjectId],
          onTap: () => context.push(ApprovalsRoutes.detail(approval.id)),
        ),
      ),
    );
  }
}
