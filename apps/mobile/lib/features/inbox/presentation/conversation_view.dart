import 'dart:math' as math;

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
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../auth/application/session_controller.dart';
import '../../clients/clients_routes.dart';
import '../../directory/application/directory_providers.dart';
import '../application/inbox_controller.dart';
import '../domain/conversation.dart';
import 'inbox_labels.dart';
import 'reply_composer.dart';

/// A thread: triage header, chat bubbles and the reply composer. Used as the detail
/// pane on wide screens and as the body of the phone detail route.
class ConversationView extends ConsumerWidget {
  const ConversationView({required this.conversationId, super.key});

  final String conversationId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final conversation = ref.watch(conversationProvider(conversationId));
    return AsyncValueView<InboxConversation>(
      value: conversation,
      onRetry: () => ref.invalidate(conversationProvider(conversationId)),
      data: (conversation) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FadeSlideIn(child: _ThreadHeader(conversation: conversation)),
          const Divider(height: 1),
          Expanded(
            child: _MessageList(
              conversation: conversation,
              onRefresh: () => ref.refresh(conversationProvider(conversationId).future),
            ),
          ),
          PermissionGate(
            anyOf: const [Permissions.inboxReply],
            fallback: _ReadOnlyNote(message: l10n.inboxReplyReadOnly),
            child: ReplyComposer(conversation: conversation),
          ),
        ],
      ),
    );
  }
}

class _ThreadHeader extends ConsumerWidget {
  const _ThreadHeader({required this.conversation});

  static const _avatarSize = 44.0;

  final InboxConversation conversation;

  Future<void> _change(BuildContext context, WidgetRef ref, ConversationChange change, {String? success}) async {
    final l10n = AppLocalizations.of(context);
    await runAction(
      context,
      () => ref.read(inboxActionsProvider).update(conversation.id, change),
      success: success ?? l10n.savedToast,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final author = conversation.authorHandle ?? l10n.inboxUnknownAuthor;
    final platform = conversation.platform;
    final clientName = ref.watch(clientDirectoryProvider).value?.nameOf(conversation.clientId);
    final source = [
      if (platform != null) inboxPlatformLabel(l10n, platform),
      inboxTypeLabel(l10n, conversation.type),
      formats.relative(conversation.createdAt),
    ].join(' · ');

    return Padding(
      padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.sm, tokens.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              InitialsAvatar(name: author, seed: author, size: _avatarSize),
              SizedBox(width: tokens.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Semantics(
                      header: true,
                      child: Text(author, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleMedium),
                    ),
                    Row(
                      children: [
                        Icon(
                          platform == null ? inboxTypeIcon(conversation.type) : inboxPlatformIcon(platform),
                          size: 14,
                          color: tokens.muted,
                        ),
                        SizedBox(width: tokens.xs),
                        Flexible(
                          child: Text(
                            source,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: text.bodySmall?.copyWith(color: tokens.muted),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              _StatusControl(
                conversation: conversation,
                onChanged: (status) => _change(
                  context,
                  ref,
                  ConversationChange(status: status),
                  success: status == InboxConversationStatuses.archived
                      ? l10n.inboxArchivedToast
                      : status == InboxConversationStatuses.open
                          ? l10n.inboxReopenedToast
                          : null,
                ),
              ),
            ],
          ),
          SizedBox(height: tokens.md),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                if (clientName != null) ...[
                  PermissionGate(
                    anyOf: const [Permissions.clientsView],
                    fallback: _MetaChip(icon: Icons.business_outlined, label: clientName, tooltip: l10n.inboxMetaClient),
                    child: _MetaChip(
                      icon: Icons.business_outlined,
                      label: clientName,
                      tooltip: l10n.inboxMetaClient,
                      onPressed: () => context.push(ClientsRoutes.detail(conversation.clientId)),
                    ),
                  ),
                  SizedBox(width: tokens.sm),
                ],
                _OptionMenu<String>(
                  tooltip: l10n.inboxChangeSentiment,
                  options: InboxSentiments.values,
                  selected: conversation.sentiment,
                  labelOf: (s) => inboxSentimentLabel(l10n, s),
                  onSelected: (s) => _change(context, ref, ConversationChange(sentiment: s)),
                  chip: StatusBadge(
                    label: inboxSentimentLabel(l10n, conversation.sentiment),
                    tone: inboxSentimentTone(conversation.sentiment),
                  ),
                ),
                SizedBox(width: tokens.sm),
                _OptionMenu<String>(
                  tooltip: l10n.inboxChangePriority,
                  options: InboxPriorities.values,
                  selected: conversation.priority,
                  labelOf: (p) => inboxPriorityLabel(l10n, p),
                  onSelected: (p) => _change(context, ref, ConversationChange(priority: p)),
                  chip: StatusBadge(
                    label: l10n.inboxPriorityValue(inboxPriorityLabel(l10n, conversation.priority)),
                    tone: inboxPriorityTone(conversation.priority),
                  ),
                ),
                SizedBox(width: tokens.sm),
                _AssigneeControl(
                  conversation: conversation,
                  onChanged: (id) => _change(context, ref, ConversationChange(assigneeId: () => id)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Status menu plus a one-tap archive / reopen; read-only badge without `inbox.reply`.
class _StatusControl extends StatelessWidget {
  const _StatusControl({required this.conversation, required this.onChanged});

  final InboxConversation conversation;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final badge = StatusBadge(
      label: inboxStatusLabel(l10n, conversation.status),
      tone: inboxStatusTone(conversation.status),
    );
    final archived = conversation.isArchived;
    return PermissionGate(
      anyOf: const [Permissions.inboxReply],
      fallback: badge,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _OptionMenu<String>(
            tooltip: l10n.inboxChangeStatus,
            options: InboxConversationStatuses.values,
            selected: conversation.status,
            labelOf: (s) => inboxStatusLabel(l10n, s),
            onSelected: onChanged,
            chip: badge,
          ),
          IconButton(
            tooltip: archived ? l10n.inboxReopen : l10n.inboxArchive,
            icon: Icon(archived ? Icons.unarchive_outlined : Icons.archive_outlined),
            onPressed: () => onChanged(archived ? InboxConversationStatuses.open : InboxConversationStatuses.archived),
          ),
        ],
      ),
    );
  }
}

/// Popup menu over [options] whose anchor is [chip]; falls back to the bare chip without `inbox.reply`.
class _OptionMenu<T extends Object> extends StatelessWidget {
  const _OptionMenu({
    required this.tooltip,
    required this.options,
    required this.selected,
    required this.labelOf,
    required this.onSelected,
    required this.chip,
  });

  final String tooltip;
  final List<T> options;
  final T? selected;
  final String Function(T value) labelOf;
  final ValueChanged<T> onSelected;
  final Widget chip;

  @override
  Widget build(BuildContext context) => PermissionGate(
        anyOf: const [Permissions.inboxReply],
        fallback: chip,
        child: PopupMenuButton<T>(
          tooltip: tooltip,
          onSelected: (value) {
            if (value != selected) onSelected(value);
          },
          itemBuilder: (_) => [
            for (final option in options)
              CheckedPopupMenuItem(value: option, checked: option == selected, child: Text(labelOf(option))),
          ],
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: kMinInteractiveDimension),
            child: Row(mainAxisSize: MainAxisSize.min, children: [chip, const Icon(Icons.arrow_drop_down, size: 20)]),
          ),
        ),
      );
}

/// Menu entry for the assignee picker; a null [id] unassigns.
class _Assignee {
  const _Assignee(this.id);

  final String? id;
}

class _AssigneeControl extends ConsumerWidget {
  const _AssigneeControl({required this.conversation, required this.onChanged});

  static const _avatarSize = 20.0;

  final InboxConversation conversation;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final me = ref.watch(sessionProvider).value?.userId;
    final staff = ref.watch(staffDirectoryProvider).value?.entries ?? const [];
    final members = ref.watch(memberDirectoryProvider).value;
    final current = conversation.assigneeId;
    final name = current == me ? l10n.inboxYou : members?.nameOf(current);
    final chip = _MetaChip(
      icon: current == null ? Icons.person_add_alt_outlined : null,
      leading: name == null ? null : InitialsAvatar(name: name, seed: current, size: _avatarSize),
      label: name ?? l10n.unassigned,
      tooltip: l10n.inboxMetaAssignee,
    );
    return PermissionGate(
      anyOf: const [Permissions.inboxReply],
      fallback: chip,
      child: PopupMenuButton<_Assignee>(
        tooltip: l10n.inboxChangeAssignee,
        onSelected: (choice) {
          if (choice.id != current) onChanged(choice.id);
        },
        itemBuilder: (_) => [
          if (me != null && current != me)
            PopupMenuItem(
              value: _Assignee(me),
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.person_outline),
                title: Text(l10n.inboxAssignMe),
              ),
            ),
          if (current != null)
            PopupMenuItem(
              value: const _Assignee(null),
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.person_remove_outlined),
                title: Text(l10n.inboxUnassign),
              ),
            ),
          if (staff.isNotEmpty) const PopupMenuDivider(),
          for (final member in staff)
            CheckedPopupMenuItem(
              value: _Assignee(member.id),
              checked: member.id == current,
              child: Text(member.name, overflow: TextOverflow.ellipsis),
            ),
        ],
        child: Padding(padding: EdgeInsets.symmetric(vertical: tokens.xs), child: chip),
      ),
    );
  }
}

/// Neutral pill for header metadata (client, assignee).
class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.label, required this.tooltip, this.icon, this.leading, this.onPressed});

  final String label;
  final String tooltip;
  final IconData? icon;
  final Widget? leading;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final iconWidget = icon == null ? null : Icon(icon, size: 16, color: tokens.secondary);
    final content = Container(
      constraints: const BoxConstraints(minHeight: kMinInteractiveDimension - 8),
      padding: EdgeInsets.symmetric(horizontal: tokens.sm + 2, vertical: tokens.xs),
      decoration: BoxDecoration(
        color: tokens.subtle,
        borderRadius: BorderRadius.circular(tokens.radius + 999),
        border: Border.all(color: tokens.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          ?(leading ?? iconWidget),
          SizedBox(width: tokens.xs + 2),
          Text(label, style: Theme.of(context).textTheme.labelMedium),
        ],
      ),
    );
    return Tooltip(
      message: tooltip,
      child: onPressed == null
          ? content
          : Semantics(
              link: true,
              child: InkWell(
                borderRadius: BorderRadius.circular(tokens.radius + 999),
                onTap: onPressed,
                child: content,
              ),
            ),
    );
  }
}

class _MessageList extends ConsumerStatefulWidget {
  const _MessageList({required this.conversation, required this.onRefresh});

  final InboxConversation conversation;
  final Future<void> Function() onRefresh;

  @override
  ConsumerState<_MessageList> createState() => _MessageListState();
}

class _MessageListState extends ConsumerState<_MessageList> {
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollToEnd(animate: false);
  }

  @override
  void didUpdateWidget(_MessageList oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.conversation.messages.length != oldWidget.conversation.messages.length) _scrollToEnd();
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToEnd({bool animate = true}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      final end = _scroll.position.maxScrollExtent;
      if (animate && !MediaQuery.disableAnimationsOf(context)) {
        _scroll.animateTo(end, duration: AppMotion.medium, curve: AppMotion.standard);
      } else {
        _scroll.jumpTo(end);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final me = ref.watch(sessionProvider).value?.userId;
    final members = ref.watch(memberDirectoryProvider).value;
    final conversation = widget.conversation;
    final groups = groupByDay(conversation.messages);
    String authorOf(InboxMessage message) {
      if (!message.isOutbound) return conversation.authorHandle ?? l10n.inboxUnknownAuthor;
      if (message.authorId != null && message.authorId == me) return l10n.inboxYou;
      return members?.nameOf(message.authorId) ?? l10n.inboxTeam;
    }

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: groups.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: EdgeInsets.all(tokens.xl),
              children: [
                Text(
                  l10n.inboxMessagesEmpty,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted),
                ),
              ],
            )
          : ListView(
              controller: _scroll,
              physics: const AlwaysScrollableScrollPhysics(),
              padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.lg),
              children: [
                for (final group in groups) ...[
                  _DaySeparator(day: group.day),
                  for (final (i, message) in group.messages.indexed)
                    FadeSlideIn(
                      index: i,
                      child: _MessageBubble(message: message, author: authorOf(message)),
                    ),
                ],
              ],
            ),
    );
  }
}

class _DaySeparator extends StatelessWidget {
  const _DaySeparator({required this.day});

  final DateTime day;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final days = today.difference(day).inDays;
    final label = switch (days) {
      0 => l10n.inboxToday,
      1 => l10n.inboxYesterday,
      _ => context.formats.date(day),
    };
    return Padding(
      padding: EdgeInsets.symmetric(vertical: tokens.md),
      child: Row(
        children: [
          const Expanded(child: Divider()),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: tokens.md),
            child: Semantics(
              header: true,
              child: Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted)),
            ),
          ),
          const Expanded(child: Divider()),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.author});

  static const _maxWidthFactor = 0.78;
  static const _maxWidth = 560.0;
  static const _outboundAlpha = 0.14;
  static const _pendingOpacity = 0.6;
  static const _spinnerSize = 10.0;

  final InboxMessage message;
  final String author;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final outbound = message.isOutbound;
    final time = context.formats.time(message.createdAt);
    final corner = Radius.circular(tokens.radius + 14);
    final tight = Radius.circular(tokens.radius + 2);
    final bubble = Container(
      padding: EdgeInsets.symmetric(horizontal: tokens.md + 2, vertical: tokens.sm + 2),
      decoration: BoxDecoration(
        color: outbound ? tokens.primary.withValues(alpha: _outboundAlpha) : tokens.subtle,
        border: outbound ? null : Border.all(color: tokens.border),
        borderRadius: BorderRadiusDirectional.only(
          topStart: outbound ? corner : tight,
          topEnd: outbound ? tight : corner,
          bottomStart: corner,
          bottomEnd: corner,
        ),
      ),
      child: Text(message.body, style: text.bodyMedium?.copyWith(height: 1.4)),
    );

    return Semantics(
      label: l10n.inboxMessageLabel(author, time, message.body),
      child: ExcludeSemantics(
        child: Padding(
          padding: EdgeInsets.only(bottom: tokens.md),
          child: Align(
            alignment: outbound ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
            child: LayoutBuilder(
              builder: (context, constraints) => ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: math.min(constraints.maxWidth * _maxWidthFactor, _maxWidth),
                ),
                child: Opacity(
                  opacity: message.pending ? _pendingOpacity : 1,
                  child: Column(
                    crossAxisAlignment: outbound ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: tokens.xs, vertical: 2),
                        child: Text(author, style: text.labelSmall?.copyWith(color: tokens.muted)),
                      ),
                      bubble,
                      Padding(
                        padding: EdgeInsets.fromLTRB(tokens.xs, tokens.xs, tokens.xs, 0),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (message.pending) ...[
                              const SizedBox.square(
                                dimension: _spinnerSize,
                                child: CircularProgressIndicator(strokeWidth: 1.5),
                              ),
                              SizedBox(width: tokens.xs),
                            ],
                            Text(
                              message.pending ? l10n.inboxSending : time,
                              style: text.labelSmall?.copyWith(color: tokens.muted),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ReadOnlyNote extends StatelessWidget {
  const _ReadOnlyNote({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return SafeArea(
      top: false,
      child: Container(
        padding: EdgeInsets.all(tokens.lg),
        decoration: BoxDecoration(border: Border(top: BorderSide(color: tokens.border))),
        child: Row(
          children: [
            Icon(Icons.lock_outline, size: 18, color: tokens.muted),
            SizedBox(width: tokens.sm),
            Expanded(
              child: Text(message, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted)),
            ),
          ],
        ),
      ),
    );
  }
}
