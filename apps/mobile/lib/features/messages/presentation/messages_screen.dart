import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/messages_providers.dart';
import '../domain/chat_models.dart';
import '../messages_routes.dart';
import 'conversation_labels.dart';
import 'conversation_pane.dart';
import 'conversation_tile.dart';
import 'new_conversation_sheet.dart';
import 'whiz_chat_pane.dart';

/// Width from which the list and the open conversation sit side by side.
const messagesSplitBreakpoint = 840.0;
const _listPaneWidth = 380.0;

/// Chat rooms + pinned Whiz AI. On wide screens the selected thread opens beside the list.
class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  String? _selectedId;
  var _handledDeepLink = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _handleDeepLinks());
  }

  Future<void> _handleDeepLinks() async {
    if (_handledDeepLink) return;
    _handledDeepLink = true;
    final uri = GoRouterState.of(context).uri;
    final whiz = uri.queryParameters['whiz'];
    if (whiz == '1' || whiz == 'true') {
      final wide = MediaQuery.sizeOf(context).width >= messagesSplitBreakpoint;
      _openWhiz(wide: wide);
      return;
    }
    final threadId = uri.queryParameters['threadId'];
    if (threadId != null && threadId.isNotEmpty) {
      if (!mounted) return;
      final wide = MediaQuery.sizeOf(context).width >= messagesSplitBreakpoint;
      if (wide) {
        setState(() => _selectedId = threadId);
      } else {
        await context.push(MessagesRoutes.detail(threadId));
      }
      return;
    }
    final clientId = uri.queryParameters['clientId'];
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

  void _openWhiz({required bool wide}) {
    if (wide) {
      setState(() => _selectedId = MessagesRoutes.whizSelectionId);
    } else {
      context.push(MessagesRoutes.whiz);
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
    final canWhiz = !isPortal &&
        ref.watch(
          accessPolicyProvider.select(
            (p) => p.canAny(const [Permissions.aiChat, Permissions.aiView]),
          ),
        );
    final all = rooms.value ?? const <ChatRoom>[];

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= messagesSplitBreakpoint;
        final selectedId = wide
            ? (_selectedId ?? (canWhiz ? MessagesRoutes.whizSelectionId : all.firstOrNull?.id))
            : null;
        final whizSelected = selectedId == MessagesRoutes.whizSelectionId;

        final list = ResourceList<ChatRoom>(
          value: rooms,
          onRefresh: _refresh,
          matches: (room, query) => roomTitle(ref, l10n, room).toLowerCase().contains(query),
          searchHint: l10n.messagesSearchHint,
          itemSpacing: tokens.xs,
          header: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.messagesThreadCount(all.length),
                style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.muted),
              ),
              if (canWhiz) ...[
                SizedBox(height: tokens.md),
                _WhizTile(
                  selected: whizSelected,
                  onTap: () => _openWhiz(wide: wide),
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
            selected: !whizSelected && room.id == selectedId,
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
                      child: whizSelected
                          ? const WhizChatHost()
                          : selectedId == null
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
}

class _WhizTile extends StatelessWidget {
  const _WhizTile({required this.selected, required this.onTap});

  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return Material(
      color: selected ? tokens.primary.withValues(alpha: 0.1) : tokens.subtle,
      borderRadius: BorderRadius.circular(tokens.radius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(tokens.radius),
        child: Padding(
          padding: EdgeInsets.all(tokens.md),
          child: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: tokens.primary.withValues(alpha: 0.15),
                child: Icon(Icons.auto_awesome, size: 18, color: tokens.primary),
              ),
              SizedBox(width: tokens.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l10n.messagesWhiz, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                    Text(
                      l10n.messagesWhizHint,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: text.labelSmall?.copyWith(color: tokens.muted),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: tokens.muted),
            ],
          ),
        ),
      ),
    );
  }
}
