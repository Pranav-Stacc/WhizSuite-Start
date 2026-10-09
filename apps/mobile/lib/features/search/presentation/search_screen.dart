import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../dashboard/presentation/widgets/status_display.dart';
import '../application/search_providers.dart';
import '../domain/entity_routes.dart';
import '../domain/search_result.dart';

/// Debounce while typing before the committed query hits the API.
const _debounce = Duration(milliseconds: 300);

/// Workspace-wide search: groups of hits that open the owning feature's detail route.
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  final _focus = FocusNode();
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _controller.text = ref.read(searchQueryProvider);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focus.requestFocus();
    });
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    setState(() {});
    _debounceTimer?.cancel();
    _debounceTimer = Timer(_debounce, () => ref.read(searchQueryProvider.notifier).set(value));
  }

  void _clear() {
    _debounceTimer?.cancel();
    _controller.clear();
    setState(() {});
    ref.read(searchQueryProvider.notifier).set('');
  }

  Future<void> _refresh() => ref.refresh(searchResultsProvider.future).then<void>((_) {}, onError: (Object _) {});

  void _open(SearchHit hit) {
    final route = hit.route;
    if (route == null) return;
    context.push(route);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final query = ref.watch(searchQueryProvider);
    final results = ref.watch(searchResultsProvider);
    final typed = _controller.text.trim();

    return PageScaffold(
      title: l10n.searchTitle,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.sm),
            child: TextField(
              controller: _controller,
              focusNode: _focus,
              onChanged: _onChanged,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: l10n.searchPlaceholder,
                prefixIcon: const Icon(Icons.search),
                isDense: true,
                suffixIcon: typed.isEmpty
                    ? null
                    : IconButton(
                        tooltip: l10n.valueClear,
                        icon: const Icon(Icons.close),
                        onPressed: _clear,
                      ),
              ),
            ),
          ),
          Expanded(child: _Body(query: query, typed: typed, results: results, onRefresh: _refresh, onOpen: _open)),
        ],
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({
    required this.query,
    required this.typed,
    required this.results,
    required this.onRefresh,
    required this.onOpen,
  });

  final String query;
  final String typed;
  final AsyncValue<SearchResults> results;
  final Future<void> Function() onRefresh;
  final ValueChanged<SearchHit> onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;

    if (typed.length < searchMinQueryLength) {
      return _IdleState(typed: typed);
    }

    return switch (results) {
      AsyncValue(value: final data?) => data.isEmpty
          ? RefreshIndicator(
              onRefresh: onRefresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.all(tokens.xl),
                children: [
                  EmptyState(icon: Icons.search_off, title: l10n.searchEmpty, body: l10n.searchEmptyBody(query)),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: onRefresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.fromLTRB(tokens.lg, tokens.sm, tokens.lg, tokens.xxl * 2),
                children: [
                  Padding(
                    padding: EdgeInsets.only(bottom: tokens.md),
                    child: Text(
                      l10n.searchResultsCount(data.total),
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.muted),
                    ),
                  ),
                  for (final (g, group) in data.groups.indexed) ...[
                    if (g > 0) SizedBox(height: tokens.lg),
                    FadeSlideIn(
                      index: g,
                      child: SectionCard(
                        title: '${_groupLabel(l10n, group.kind)} · ${l10n.searchGroupCount(group.hits.length)}',
                        child: HairlineList(
                          children: [
                            for (final hit in group.hits)
                              _HitRow(hit: hit, typeLabel: _groupLabel(l10n, hit.kind), onTap: () => onOpen(hit)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
      AsyncValue(error: final error?) => ErrorState(error: error, onRetry: onRefresh),
      _ => const Center(child: CircularProgressIndicator()),
    };
  }
}

/// Idle search: editorial empty state plus entity scope chips.
class _IdleState extends StatelessWidget {
  const _IdleState({required this.typed});

  final String typed;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final scopes = [
      (Icons.business_outlined, l10n.searchGroupClients),
      (Icons.folder_outlined, l10n.searchGroupProjects),
      (Icons.check_circle_outline, l10n.searchGroupTasks),
      (Icons.handshake_outlined, l10n.searchGroupLeads),
      (Icons.article_outlined, l10n.searchGroupContent),
    ];
    return ListView(
      padding: EdgeInsets.fromLTRB(tokens.lg, tokens.xl, tokens.lg, tokens.xxl),
      children: [
        EmptyState(
          icon: Icons.search,
          title: l10n.searchIdleTitle,
          body: typed.isEmpty ? l10n.searchIdleBody : l10n.searchMinChars(searchMinQueryLength),
        ),
        if (typed.isEmpty) ...[
          SizedBox(height: tokens.xl),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: tokens.sm,
            runSpacing: tokens.sm,
            children: [
              for (final scope in scopes)
                Chip(
                  avatar: Icon(scope.$1, size: 16),
                  label: Text(scope.$2),
                  visualDensity: VisualDensity.compact,
                  side: BorderSide(color: tokens.border),
                  backgroundColor: tokens.subtle,
                ),
            ],
          ),
        ],
      ],
    );
  }
}

class _HitRow extends StatelessWidget {
  const _HitRow({required this.hit, required this.typeLabel, required this.onTap});

  static const _minHeight = 48.0;

  final SearchHit hit;
  final String typeLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final status = hit.status;
    final statusLabel = status == null || status.isEmpty ? null : l10n.searchStatus(status);
    final subtitle = hit.subtitle;
    final detail = statusLabel ?? (subtitle == null || subtitle.isEmpty ? null : subtitle);
    return Semantics(
      button: true,
      label: l10n.searchResultAria(typeLabel, hit.title),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(tokens.radius + 6),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: _minHeight),
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: tokens.xs + 2),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: tokens.subtle,
                    borderRadius: BorderRadius.circular(tokens.radius + 6),
                    border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
                  ),
                  child: Icon(_icon(hit.kind), size: 16, color: tokens.secondary),
                ),
                SizedBox(width: tokens.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(hit.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleSmall),
                      if (detail != null && statusLabel == null)
                        Text(
                          detail,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: text.bodySmall?.copyWith(color: tokens.muted),
                        ),
                    ],
                  ),
                ),
                if (statusLabel != null) ...[
                  SizedBox(width: tokens.sm),
                  StatusBadge(label: statusLabel, tone: _tone(hit.kind, status!), dense: true),
                ],
                Icon(Icons.chevron_right, color: tokens.muted, size: 18),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

StatusTone _tone(EntityKind kind, String status) => switch (kind) {
      EntityKind.client => clientStatusToneOf(status),
      EntityKind.project => projectStatusTone(status),
      EntityKind.task => taskStatusTone(status),
      EntityKind.content => contentStatusTone(status),
      EntityKind.invoice => invoiceStatusTone(status),
      EntityKind.approval => approvalStatusTone(status),
      EntityKind.lead => StatusTone.neutral,
    };

String _groupLabel(AppLocalizations l10n, EntityKind kind) => switch (kind) {
      EntityKind.client => l10n.searchGroupClients,
      EntityKind.project => l10n.searchGroupProjects,
      EntityKind.task => l10n.searchGroupTasks,
      EntityKind.lead => l10n.searchGroupLeads,
      EntityKind.content => l10n.searchGroupContent,
      EntityKind.invoice => l10n.searchGroupInvoices,
      EntityKind.approval => l10n.searchGroupApprovals,
    };

IconData _icon(EntityKind kind) => switch (kind) {
      EntityKind.client => Icons.business_outlined,
      EntityKind.project => Icons.folder_outlined,
      EntityKind.task => Icons.check_circle_outline,
      EntityKind.lead => Icons.handshake_outlined,
      EntityKind.content => Icons.article_outlined,
      EntityKind.invoice => Icons.receipt_long_outlined,
      EntityKind.approval => Icons.fact_check_outlined,
    };
