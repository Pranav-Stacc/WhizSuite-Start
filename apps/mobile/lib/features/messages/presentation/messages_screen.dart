import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/forms.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../directory/application/directory_providers.dart';
import '../application/messages_providers.dart';
import '../domain/feedback_models.dart';
import '../messages_routes.dart';
import 'conversation_labels.dart';
import 'conversation_pane.dart';
import 'conversation_tile.dart';
import 'new_conversation_sheet.dart';

/// Width from which the list and the open conversation sit side by side.
const messagesSplitBreakpoint = 840.0;
const _listPaneWidth = 380.0;

/// Conversations with clients, filterable by status and (for staff) by client.
/// On wide screens the selected conversation opens beside the list.
class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  String? _status = FeedbackThreadStatuses.open;
  String? _clientId;
  String? _selectedId;

  Future<void> _refresh() => ref.refresh(messageThreadsProvider.future).then<void>((_) {}, onError: (Object _) {});

  void _open(Conversation conversation, {required bool wide}) {
    if (wide) {
      setState(() => _selectedId = conversation.id);
    } else {
      context.push(MessagesRoutes.detail(conversation.id));
    }
  }

  Future<void> _create({required bool wide}) async {
    final id = await showNewConversationSheet(context, ref);
    if (id == null || !mounted) return;
    setState(() {
      _status = FeedbackThreadStatuses.open;
      if (wide) _selectedId = id;
    });
    if (!wide) await context.push(MessagesRoutes.detail(id));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final conversations = ref.watch(messageConversationsProvider);
    final isPortal = ref.watch(messagesPortalClientProvider).value != null;
    final clients = isPortal ? null : ref.watch(clientDirectoryProvider).value;
    final all = conversations.value ?? const <Conversation>[];
    final clientIds = {
      for (final c in all)
        if (c.subject.type == FeedbackSubjectTypes.client) c.subject.id,
    }.toList()
      ..sort((a, b) => (clients?.nameOf(a) ?? a).compareTo(clients?.nameOf(b) ?? b));
    int countOf(String? status) => all.where((c) => status == null || c.status == status).length;

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= messagesSplitBreakpoint;
        final selectedId = wide ? (_selectedId ?? all.where(_matches).firstOrNull?.id) : null;

        final list = ResourceList<Conversation>(
          value: conversations,
          onRefresh: _refresh,
          matches: (c, query) => conversationTitle(ref, l10n, c).toLowerCase().contains(query),
          searchHint: l10n.messagesSearchHint,
          filter: _matches,
          itemSpacing: tokens.xs,
          header: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.messagesThreadCount(all.where(_matches).length),
                style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.muted),
              ),
              SizedBox(height: tokens.sm),
              FilterBar<String>(
                options: FeedbackThreadStatuses.values,
                selected: _status,
                labelOf: l10n.messagesStatus,
                countOf: countOf,
                onSelected: (value) => setState(() => _status = value),
              ),
              if (!isPortal && clientIds.length > 1) ...[
                SizedBox(height: tokens.md),
                OptionField<String>(
                  key: ValueKey(_clientId),
                  label: l10n.messagesClientFilter,
                  value: _clientId,
                  allowNone: true,
                  options: clientIds,
                  labelOf: (id) => clients?.nameOf(id) ?? l10n.messagesClientConversation,
                  onChanged: (id) => setState(() => _clientId = id),
                ),
              ],
            ],
          ),
          empty: EmptyState(
            icon: Icons.chat_bubble_outline,
            title: l10n.messagesEmpty,
            body: isPortal ? l10n.messagesEmptyPortalBody : l10n.messagesEmptyBody,
          ),
          itemBuilder: (context, conversation) => ConversationTile(
            conversation: conversation,
            selected: conversation.id == selectedId,
            onTap: () => _open(conversation, wide: wide),
          ),
        );

        return PageScaffold(
          title: l10n.navMessages,
          floatingActionButton: PermissionGate(
            anyOf: const [Permissions.feedbackCreate],
            child: CreateFab(
              label: isPortal ? l10n.messagesNewPortal : l10n.messagesNew,
              icon: Icons.edit_outlined,
              onPressed: () => _create(wide: wide),
            ),
          ),
          body: !wide
              ? list
              : Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(width: _listPaneWidth, child: list),
                    VerticalDivider(width: 1, color: tokens.border),
                    Expanded(
                      child: selectedId == null
                          ? EmptyState(
                              icon: Icons.forum_outlined,
                              title: l10n.messagesSelectTitle,
                              body: l10n.messagesSelectBody,
                            )
                          : ConversationPane(key: ValueKey(selectedId), threadId: selectedId),
                    ),
                  ],
                ),
        );
      },
    );
  }

  bool _matches(Conversation c) =>
      (_status == null || c.status == _status) && (_clientId == null || c.subject.id == _clientId);
}
