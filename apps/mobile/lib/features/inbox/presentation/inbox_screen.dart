import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/menu_filter_chip.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../application/inbox_controller.dart';
import '../domain/conversation.dart';
import '../inbox_routes.dart';
import 'conversation_tile.dart';
import 'conversation_view.dart';
import 'inbox_labels.dart';

class InboxScreen extends ConsumerStatefulWidget {
  const InboxScreen({super.key});

  /// Width from which the list and the open thread sit side by side.
  static const splitBreakpoint = 840.0;

  @override
  ConsumerState<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends ConsumerState<InboxScreen> {
  static const _listPaneWidth = 400.0;

  var _filter = const InboxFilter();
  String? _selectedId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final conversations = ref.watch(conversationsProvider);
    final items = conversations.value ?? const <InboxConversation>[];
    final me = ref.watch(sessionProvider).value?.userId;
    final clients = ref.watch(clientDirectoryProvider).value;
    final staff = ref.watch(memberDirectoryProvider).value;
    final wide = MediaQuery.sizeOf(context).width >= InboxScreen.splitBreakpoint;
    final selectedId = wide ? _selectedId : null;

    final list = ResourceList<InboxConversation>(
      value: conversations,
      onRefresh: () => ref.refresh(conversationsProvider.future),
      searchHint: l10n.inboxSearch,
      matches: matchesInboxQuery,
      filter: (conversation) => _filter.matches(conversation, userId: me),
      sort: byLatestActivity,
      header: _InboxFilters(
        filter: _filter,
        items: items,
        userId: me,
        onChanged: (filter) => setState(() => _filter = filter),
      ),
      empty: EmptyState(icon: Icons.forum_outlined, title: l10n.inboxEmpty, body: l10n.inboxEmptyBody),
      itemBuilder: (context, conversation) => ConversationTile(
        conversation: conversation,
        clientName: clients?.nameOf(conversation.clientId),
        assigneeName: staff?.nameOf(conversation.assigneeId),
        selected: conversation.id == selectedId,
        onTap: () => wide
            ? setState(() => _selectedId = conversation.id)
            : context.go(InboxRoutes.detail(conversation.id)),
      ),
    );

    return PageScaffold(
      title: l10n.inboxTitle,
      body: !wide
          ? list
          : Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(width: _listPaneWidth, child: list),
                const VerticalDivider(width: 1),
                Expanded(
                  child: selectedId == null
                      ? EmptyState(
                          icon: Icons.chat_bubble_outline,
                          title: l10n.inboxSelectTitle,
                          body: l10n.inboxSelectBody,
                        )
                      : ConversationView(key: ValueKey(selectedId), conversationId: selectedId),
                ),
              ],
            ),
    );
  }
}

class _InboxFilters extends ConsumerWidget {
  const _InboxFilters({
    required this.filter,
    required this.items,
    required this.userId,
    required this.onChanged,
  });

  static const _minMetricWidth = 140.0;

  final InboxFilter filter;
  final List<InboxConversation> items;
  final String? userId;
  final ValueChanged<InboxFilter> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final clients = ref.watch(clientDirectoryProvider).value;
    final scoped = items.where((c) => filter.matchesScope(c, userId: userId)).toList();
    final clientIds = {for (final conversation in items) conversation.clientId}.toList();
    final open = items.where((c) => c.isOpen).length;
    final urgent = items.where((c) => c.isOpen && isElevatedPriority(c.priority)).length;
    final mine = userId == null ? 0 : items.where((c) => c.assigneeId == userId).length;
    Widget gap() => SizedBox(width: tokens.sm);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (items.isNotEmpty)
          LayoutBuilder(
            builder: (context, constraints) {
              final tiles = [
                MetricTile(
                  label: l10n.inboxStatOpen,
                  icon: Icons.mark_chat_unread_outlined,
                  value: formats.number(open),
                  caption: l10n.inboxStatOpenHint,
                  tone: open > 0 ? StatusTone.warning : StatusTone.neutral,
                  onTap: () => onChanged(const InboxFilter(status: InboxConversationStatuses.open)),
                ),
                MetricTile(
                  label: l10n.inboxStatUrgent,
                  icon: Icons.priority_high,
                  value: formats.number(urgent),
                  caption: l10n.inboxStatUrgentHint,
                  tone: urgent > 0 ? StatusTone.danger : StatusTone.neutral,
                  onTap: () => onChanged(
                    const InboxFilter(status: InboxConversationStatuses.open, priority: InboxPriorities.urgent),
                  ),
                ),
                MetricTile(
                  label: l10n.inboxStatMine,
                  icon: Icons.person_outline,
                  value: formats.number(mine),
                  caption: l10n.inboxStatMineHint,
                  onTap: userId == null
                      ? null
                      : () => onChanged(const InboxFilter(status: null, assignedToMe: true)),
                ),
              ];
              final columns = gridColumns(constraints.maxWidth, minTileWidth: _minMetricWidth, max: 3);
              final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
              return Padding(
                padding: EdgeInsets.only(bottom: tokens.md),
                child: Wrap(
                  spacing: tokens.md,
                  runSpacing: tokens.md,
                  children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
                ),
              );
            },
          ),
        FilterBar<String>(
          options: InboxConversationStatuses.values,
          selected: filter.status,
          labelOf: (status) => inboxStatusLabel(l10n, status),
          countOf: (status) => status == null ? scoped.length : scoped.where((c) => c.status == status).length,
          onSelected: (status) => onChanged(filter.copyWith(status: () => status)),
        ),
        SizedBox(height: tokens.sm),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              FilterChip(
                label: Text(l10n.inboxFilterMine),
                avatar: const Icon(Icons.person_outline, size: 18),
                showCheckmark: false,
                selected: filter.assignedToMe,
                onSelected: (selected) => onChanged(filter.copyWith(assignedToMe: selected)),
              ),
              gap(),
              MenuFilterChip<String>(
                label: l10n.inboxFilterType,
                options: InboxConversationTypes.values,
                selected: filter.type,
                labelOf: (type) => inboxTypeLabel(l10n, type),
                onSelected: (type) => onChanged(filter.copyWith(type: () => type)),
              ),
              gap(),
              MenuFilterChip<String>(
                label: l10n.inboxFilterSentiment,
                options: InboxSentiments.values,
                selected: filter.sentiment,
                labelOf: (sentiment) => inboxSentimentLabel(l10n, sentiment),
                onSelected: (sentiment) => onChanged(filter.copyWith(sentiment: () => sentiment)),
              ),
              gap(),
              MenuFilterChip<String>(
                label: l10n.inboxFilterPriority,
                options: InboxPriorities.values,
                selected: filter.priority,
                labelOf: (priority) => inboxPriorityLabel(l10n, priority),
                onSelected: (priority) => onChanged(filter.copyWith(priority: () => priority)),
              ),
              if (clientIds.length > 1) ...[
                gap(),
                MenuFilterChip<String>(
                  label: l10n.inboxFilterClient,
                  options: clientIds,
                  selected: filter.clientId,
                  labelOf: (id) => clients?.nameOf(id) ?? l10n.valueUnknown,
                  onSelected: (id) => onChanged(filter.copyWith(clientId: () => id)),
                ),
              ],
              if (filter.narrowed) ...[
                gap(),
                TextButton(
                  onPressed: () => onChanged(InboxFilter(query: filter.query, status: filter.status)),
                  child: Text(l10n.inboxClearFilters),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

