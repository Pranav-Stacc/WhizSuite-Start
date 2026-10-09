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
import '../domain/chat_models.dart';
import '../messages_routes.dart';
import 'conversation_labels.dart';
import 'conversation_pane.dart';
import 'conversation_tile.dart';
import 'new_conversation_sheet.dart';

/// Width from which the list and the open conversation sit side by side.
const messagesSplitBreakpoint = 840.0;
const _listPaneWidth = 380.0;

/// Chat rooms, filterable by client for staff. On wide screens the selected room opens beside the list.
class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  String? _clientId;
  String? _selectedId;
  var _handledClientDeepLink = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _openClientDeepLink());
  }

  Future<void> _openClientDeepLink() async {
    if (_handledClientDeepLink) return;
    _handledClientDeepLink = true;
    final clientId = GoRouterState.of(context).uri.queryParameters['clientId'];
    if (clientId == null || clientId.isEmpty) return;
    try {
      final room = await ref.read(messagesActionsProvider).openClientRoom(clientId);
      if (!mounted) return;
      final wide = MediaQuery.sizeOf(context).width >= messagesSplitBreakpoint;
      _open(room, wide: wide);
    } catch (_) {}
  }

  Future<void> _refresh() => ref.refresh(chatRoomsProvider.future).then<void>((_) {}, onError: (Object _) {});

  void _open(ChatRoom room, {required bool wide}) {
    if (wide) {
      setState(() => _selectedId = room.id);
    } else {
      context.push(MessagesRoutes.detail(room.id));
    }
  }

  Future<void> _create({required bool wide}) async {
    final id = await showNewConversationSheet(context, ref);
    if (id == null || !mounted) return;
    setState(() {
      if (wide) _selectedId = id;
    });
    if (!wide) await context.push(MessagesRoutes.detail(id));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final rooms = ref.watch(chatRoomsProvider);
    final isPortal = ref.watch(messagesPortalClientProvider).value != null;
    final clients = isPortal ? null : ref.watch(clientDirectoryProvider).value;
    final all = rooms.value ?? const <ChatRoom>[];
    final clientIds = {
      for (final room in all)
        if (room.isClientRoom && room.clientId != null) room.clientId!,
    }.toList()
      ..sort((a, b) => (clients?.nameOf(a) ?? a).compareTo(clients?.nameOf(b) ?? b));

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= messagesSplitBreakpoint;
        final filtered = all.where(_matches).toList();
        final selectedId = wide ? (_selectedId ?? filtered.firstOrNull?.id) : null;

        final list = ResourceList<ChatRoom>(
          value: rooms,
          onRefresh: _refresh,
          matches: (room, query) => roomTitle(ref, l10n, room).toLowerCase().contains(query),
          searchHint: l10n.messagesSearchHint,
          filter: _matches,
          itemSpacing: tokens.xs,
          header: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.messagesThreadCount(filtered.length),
                style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.muted),
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
          itemBuilder: (context, room) => ConversationTile(
            room: room,
            selected: room.id == selectedId,
            onTap: () => _open(room, wide: wide),
          ),
        );

        return PageScaffold(
          title: l10n.navMessages,
          floatingActionButton: PermissionGate(
            anyOf: const [Permissions.chatCreateRoom, Permissions.chatSend],
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

  bool _matches(ChatRoom room) => _clientId == null || room.clientId == _clientId;
}
