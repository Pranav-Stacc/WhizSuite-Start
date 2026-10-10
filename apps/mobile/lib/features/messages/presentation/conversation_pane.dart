import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/error_message.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/widgets/state_views.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../team/team_routes.dart';
import '../application/messages_providers.dart';
import '../domain/chat_models.dart';
import 'conversation_labels.dart';

/// A chat room: title header, day-grouped messages and the composer.
class ConversationPane extends ConsumerWidget {
  const ConversationPane({required this.threadId, this.showTitle = true, super.key});

  final String threadId;

  /// The full-screen route shows the title in its app bar instead.
  final bool showTitle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roomValue = ref.watch(roomProvider(threadId));
    return switch (roomValue) {
      AsyncValue(value: final room?) => _Conversation(
          key: ValueKey(room.id),
          room: room,
          showTitle: showTitle,
        ),
      AsyncValue(error: final error?) => ErrorState(
          error: error,
          onRetry: () => ref.invalidate(roomProvider(threadId)),
        ),
      _ => const SkeletonList(itemCount: 4),
    };
  }
}

class _Conversation extends ConsumerStatefulWidget {
  const _Conversation({required this.room, required this.showTitle, super.key});

  final ChatRoom room;
  final bool showTitle;

  @override
  ConsumerState<_Conversation> createState() => _ConversationState();
}

class _ConversationState extends ConsumerState<_Conversation> {
  ChatMessage? _replyTo;

  Future<void> _pullToRefresh() async {
    ref.invalidate(chatRoomsProvider);
    await ref.refresh(roomMessagesProvider(widget.room.id).future).then<void>((_) {}, onError: (Object _) {});
  }

  List<MentionCandidate> _mentionCandidates() {
    final members = ref.watch(memberDirectoryProvider).value;
    final me = ref.watch(sessionProvider).value?.userId;
    final whiz = MentionCandidate(
      id: whizAgentTargetId,
      label: whizAgentDisplay,
      type: ChatMentionTypes.agent,
    );
    if (members == null) return [whiz];
    return [
      whiz,
      for (final entry in members.entries)
        if (entry.id != me)
          MentionCandidate(
            id: entry.id,
            label: entry.name.split(' ').where((p) => p.isNotEmpty).firstOrNull ?? entry.name,
          ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(messagesRealtimeProvider);
    final messages = ref.watch(roomMessagesProvider(widget.room.id));
    final canPost = widget.room.viewerCanPost;
    return Column(
      children: [
        if (widget.showTitle) _Header(room: widget.room),
        Expanded(
          child: switch (messages) {
            AsyncValue(value: final list?) => _MessageList(
                roomId: widget.room.id,
                messages: list,
                onRefresh: _pullToRefresh,
                onReply: (message) => setState(() => _replyTo = message),
              ),
            AsyncValue(error: final error?) => ErrorState(
                error: error,
                onRetry: () => ref.invalidate(roomMessagesProvider(widget.room.id)),
              ),
            _ => const SkeletonList(itemCount: 5),
          },
        ),
        PermissionGate(
          anyOf: const [Permissions.chatSend],
          fallback: _ReadOnlyNote(message: AppLocalizations.of(context).messagesReadOnly),
          child: canPost
              ? _Composer(
                  roomId: widget.room.id,
                  replyTo: _replyTo,
                  mentionCandidates: _mentionCandidates(),
                  onClearReply: () => setState(() => _replyTo = null),
                )
              : _ReadOnlyNote(message: AppLocalizations.of(context).messagesReadOnly),
        ),
      ],
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header({required this.room});

  final ChatRoom room;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final title = roomTitle(ref, l10n, room);

    return Container(
      padding: EdgeInsets.fromLTRB(tokens.lg, tokens.sm, tokens.sm, tokens.sm),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: tokens.border))),
      child: Semantics(
        header: true,
        child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleMedium),
      ),
    );
  }
}

class _MessageList extends ConsumerStatefulWidget {
  const _MessageList({
    required this.roomId,
    required this.messages,
    required this.onRefresh,
    required this.onReply,
  });

  final String roomId;
  final List<ChatMessage> messages;
  final Future<void> Function() onRefresh;
  final ValueChanged<ChatMessage> onReply;

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
    if (widget.messages.length != oldWidget.messages.length) _scrollToEnd();
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToEnd({bool animate = true}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scroll.hasClients) return;
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
    final names = AuthorNames(ref, l10n);
    final days = groupMessagesByDay(widget.messages);
    final byId = {for (final m in widget.messages) m.id: m};
    final notifier = ref.read(roomMessagesProvider(widget.roomId).notifier);
    final hasMore = notifier.hasMore;

    if (days.isEmpty) {
      return RefreshIndicator(
        onRefresh: widget.onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.all(tokens.xl),
          children: [
            EmptyState(icon: Icons.chat_bubble_outline, title: l10n.messagesNoMessages, body: l10n.messagesNoMessagesBody),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView(
        controller: _scroll,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.fromLTRB(tokens.md, tokens.sm, tokens.md, tokens.md),
        children: [
          if (hasMore)
            Center(
              child: TextButton(
                onPressed: () => notifier.loadMore(),
                child: Text(l10n.auditLoadMore),
              ),
            ),
          for (final day in days) ...[
            _DaySeparator(day: day.day),
            for (final (i, message) in day.messages.indexed)
              FadeSlideIn(
                index: i,
                child: Builder(
                  builder: (_) {
                    final parent = message.replyToId == null ? null : byId[message.replyToId];
                    return _Bubble(
                      message: message,
                      parent: parent,
                      author: names.of(message),
                      parentAuthor: parent == null ? null : names.of(parent),
                      mine: names.isMine(message),
                      showAuthor: i == 0 ||
                          day.messages[i - 1].senderId != message.senderId ||
                          day.messages[i - 1].isSystem != message.isSystem,
                      onReply: () => widget.onReply(message),
                      onOpenProfile: message.isSystem || message.senderId.isEmpty
                          ? null
                          : () => context.push(TeamRoutes.member(message.senderId)),
                      onMentionTap: (mention) {
                        if (mention.type == ChatMentionTypes.user) {
                          context.push(TeamRoutes.member(mention.targetId));
                        }
                      },
                    );
                  },
                ),
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
    final days = DateTime(now.year, now.month, now.day).difference(day).inDays;
    final label = switch (days) {
      0 => l10n.messagesToday,
      1 => l10n.messagesYesterday,
      _ => context.formats.date(day),
    };
    return Padding(
      padding: EdgeInsets.symmetric(vertical: tokens.sm),
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

class _Bubble extends StatefulWidget {
  const _Bubble({
    required this.message,
    required this.author,
    required this.mine,
    required this.showAuthor,
    required this.onReply,
    this.parent,
    this.parentAuthor,
    this.onOpenProfile,
    this.onMentionTap,
  });

  final ChatMessage message;
  final ChatMessage? parent;
  final String author;
  final String? parentAuthor;
  final bool mine;
  final bool showAuthor;
  final VoidCallback onReply;
  final VoidCallback? onOpenProfile;
  final ValueChanged<ChatMention>? onMentionTap;

  @override
  State<_Bubble> createState() => _BubbleState();
}

class _BubbleState extends State<_Bubble> {
  static const _maxWidthFactor = 0.78;
  static const _maxWidth = 560.0;
  static const _mineAlpha = 0.14;
  static const _pendingOpacity = 0.6;
  static const _spinnerSize = 10.0;
  static const _avatarSize = 26.0;
  static const _cornerExtra = 12.0;
  static const _replyThreshold = 56.0;

  double _drag = 0;

  @override
  Widget build(BuildContext context) {
    final message = widget.message;
    final mine = widget.mine;
    final showAuthor = widget.showAuthor;
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final time = context.formats.time(message.createdAt);
    final corner = Radius.circular(tokens.radius + _cornerExtra);
    final tight = Radius.circular(tokens.radius);
    final body = message.isDeleted ? l10n.messagesDeleted : message.body;
    final replySnippet = message.replyPreview ??
        (widget.parent == null
            ? null
            : (widget.parent!.isDeleted ? l10n.messagesDeleted : widget.parent!.body));

    final bubble = GestureDetector(
      onLongPress: message.isDeleted ? null : widget.onReply,
      onHorizontalDragUpdate: message.isDeleted
          ? null
          : (details) {
              setState(() {
                final next = _drag + details.delta.dx;
                _drag = mine ? next.clamp(-88.0, 0.0) : next.clamp(0.0, 88.0);
              });
            },
      onHorizontalDragEnd: message.isDeleted
          ? null
          : (_) {
              if (_drag.abs() >= _replyThreshold) {
                HapticFeedback.selectionClick();
                widget.onReply();
              }
              setState(() => _drag = 0);
            },
      onHorizontalDragCancel: () => setState(() => _drag = 0),
      child: Transform.translate(
        offset: Offset(_drag, 0),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            if (!mine && _drag.abs() > 12)
              ExcludeSemantics(
                child: Padding(
                  padding: EdgeInsets.only(right: tokens.xs),
                  child: Icon(
                    Icons.reply,
                    size: 18,
                    color: tokens.muted.withValues(alpha: (_drag.abs() / _replyThreshold).clamp(0.0, 1.0)),
                  ),
                ),
              ),
            Container(
              padding: EdgeInsets.symmetric(horizontal: tokens.md, vertical: tokens.sm),
              decoration: BoxDecoration(
                color: mine ? tokens.primary.withValues(alpha: _mineAlpha) : tokens.subtle,
                border: mine ? null : Border.all(color: tokens.border),
                borderRadius: BorderRadiusDirectional.only(
                  topStart: mine || !showAuthor ? corner : tight,
                  topEnd: mine && showAuthor ? tight : corner,
                  bottomStart: corner,
                  bottomEnd: corner,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (replySnippet != null && !message.isDeleted)
                    Container(
                      margin: EdgeInsets.only(bottom: tokens.sm),
                      padding: EdgeInsets.all(tokens.sm),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface.withValues(alpha: 0.65),
                        borderRadius: BorderRadius.circular(tokens.radius),
                        border: Border(left: BorderSide(color: tokens.primary, width: 2)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (widget.parentAuthor != null)
                            Text(
                              widget.parentAuthor!,
                              style: text.labelSmall?.copyWith(color: tokens.primary, fontWeight: FontWeight.w600),
                            ),
                          Text(
                            replySnippet,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: text.labelSmall?.copyWith(color: tokens.muted),
                          ),
                        ],
                      ),
                    ),
                  _MentionText(
                    body: body,
                    mentions: message.mentions,
                    style: text.bodyMedium?.copyWith(height: 1.35),
                    onMentionTap: widget.onMentionTap,
                  ),
                ],
              ),
            ),
            if (mine && _drag.abs() > 12)
              ExcludeSemantics(
                child: Padding(
                  padding: EdgeInsets.only(left: tokens.xs),
                  child: Icon(
                    Icons.reply,
                    size: 18,
                    color: tokens.muted.withValues(alpha: (_drag.abs() / _replyThreshold).clamp(0.0, 1.0)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );

    final column = Column(
      crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        if (showAuthor && !mine)
          Padding(
            padding: EdgeInsets.only(left: tokens.xs, bottom: tokens.xs),
            child: InkWell(
              onTap: widget.onOpenProfile,
              borderRadius: BorderRadius.circular(tokens.radius),
              child: Text(
                widget.author,
                style: text.labelSmall?.copyWith(color: tokens.muted, fontWeight: FontWeight.w600),
              ),
            ),
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
                message.pending ? l10n.messagesSending : time,
                style: text.labelSmall?.copyWith(color: tokens.muted),
              ),
              if (!message.isDeleted && !message.pending) ...[
                SizedBox(width: tokens.xs),
                InkWell(
                  onTap: widget.onReply,
                  borderRadius: BorderRadius.circular(tokens.radius),
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: tokens.xs),
                    child: Icon(Icons.reply, size: 14, color: tokens.primary),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );

    return Semantics(
      label: l10n.messagesMessageLabel(widget.author, message.pending ? l10n.messagesSending : time, message.body),
      child: ExcludeSemantics(
        child: Padding(
          padding: EdgeInsets.only(bottom: showAuthor ? tokens.sm + tokens.xs : tokens.xs + 2),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final maxWidth = math.min(constraints.maxWidth * _maxWidthFactor, _maxWidth);
              return Row(
                mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!mine) ...[
                    showAuthor
                        ? Padding(
                            padding: EdgeInsets.only(top: tokens.lg),
                            child: InkWell(
                              onTap: widget.onOpenProfile,
                              customBorder: const CircleBorder(),
                              child: InitialsAvatar(
                                name: widget.author,
                                seed: message.senderId.isEmpty ? whizAgentTargetId : message.senderId,
                                size: _avatarSize,
                              ),
                            ),
                          )
                        : const SizedBox(width: _avatarSize),
                    SizedBox(width: tokens.sm),
                  ],
                  ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: maxWidth),
                    child: message.pending
                        ? Opacity(opacity: _pendingOpacity, alwaysIncludeSemantics: true, child: column)
                        : column,
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _MentionText extends StatefulWidget {
  const _MentionText({
    required this.body,
    required this.mentions,
    this.style,
    this.onMentionTap,
  });

  final String body;
  final List<ChatMention> mentions;
  final TextStyle? style;
  final ValueChanged<ChatMention>? onMentionTap;

  @override
  State<_MentionText> createState() => _MentionTextState();
}

class _MentionTextState extends State<_MentionText> {
  final _recognizers = <TapGestureRecognizer>[];

  @override
  void dispose() {
    _disposeRecognizers();
    super.dispose();
  }

  void _disposeRecognizers() {
    for (final recognizer in _recognizers) {
      recognizer.dispose();
    }
    _recognizers.clear();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.mentions.isEmpty) return SelectableText(widget.body, style: widget.style);
    _disposeRecognizers();
    final tokens = context.tokens;
    final spans = <TextSpan>[];
    var cursor = 0;
    final ordered = [...widget.mentions]..sort((a, b) => (a.startOffset ?? 0).compareTo(b.startOffset ?? 0));
    for (final mention in ordered) {
      final start = mention.startOffset ?? widget.body.indexOf('@${mention.displayText}');
      if (start < cursor || start < 0) continue;
      if (start > cursor) spans.add(TextSpan(text: widget.body.substring(cursor, start)));
      final end = mention.endOffset ?? start + mention.displayText.length + 1;
      final tappable = mention.type == ChatMentionTypes.user && widget.onMentionTap != null;
      TapGestureRecognizer? recognizer;
      if (tappable) {
        recognizer = TapGestureRecognizer()..onTap = () => widget.onMentionTap!(mention);
        _recognizers.add(recognizer);
      }
      spans.add(
        TextSpan(
          text: widget.body.substring(start, end.clamp(0, widget.body.length)),
          style: widget.style?.copyWith(
            color: tokens.primary,
            fontWeight: FontWeight.w600,
            decoration: tappable ? TextDecoration.underline : null,
            decorationColor: tokens.primary.withValues(alpha: 0.35),
          ),
          recognizer: recognizer,
        ),
      );
      cursor = end;
    }
    if (cursor < widget.body.length) spans.add(TextSpan(text: widget.body.substring(cursor)));
    return SelectableText.rich(TextSpan(style: widget.style, children: spans));
  }
}

class _Composer extends ConsumerStatefulWidget {
  const _Composer({
    required this.roomId,
    required this.mentionCandidates,
    this.replyTo,
    required this.onClearReply,
  });

  final String roomId;
  final List<MentionCandidate> mentionCandidates;
  final ChatMessage? replyTo;
  final VoidCallback onClearReply;

  @override
  ConsumerState<_Composer> createState() => _ComposerState();
}

class _ComposerState extends ConsumerState<_Composer> {
  static const _maxLines = 4;

  final _controller = TextEditingController();
  final _focus = FocusNode();
  String? _mentionQuery;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onChanged);
  }

  @override
  void dispose() {
    _controller.removeListener(_onChanged);
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _onChanged() {
    setState(() {
      final text = _controller.text;
      final caret = _controller.selection.baseOffset.clamp(0, text.length);
      final before = text.substring(0, caret);
      final match = RegExp(r'(?:^|\s)@([\w.-]*)$').firstMatch(before);
      _mentionQuery = match?.group(1);
    });
  }

  bool get _canSend => _controller.text.trim().isNotEmpty;

  List<MentionCandidate> get _suggestions {
    if (_mentionQuery == null) return const [];
    final q = _mentionQuery!.toLowerCase();
    return widget.mentionCandidates.where((c) => q.isEmpty || c.label.toLowerCase().contains(q)).take(6).toList();
  }

  void _insertMention(MentionCandidate candidate) {
    final text = _controller.text;
    final caret = _controller.selection.baseOffset.clamp(0, text.length);
    final before = text.substring(0, caret);
    final after = text.substring(caret);
    final replaced = before.replaceFirstMapped(RegExp(r'(?:^|\s)@([\w.-]*)$'), (match) {
      final prefix = match.group(0)!.startsWith('@') ? '' : match.group(0)![0];
      return '$prefix@${candidate.label} ';
    });
    final next = '$replaced$after';
    _controller.value = TextEditingValue(text: next, selection: TextSelection.collapsed(offset: replaced.length));
    setState(() => _mentionQuery = null);
  }

  Future<void> _send() async {
    if (!_canSend) return;
    final l10n = AppLocalizations.of(context);
    final body = _controller.text;
    final mentions = extractMentions(body, widget.mentionCandidates);
    final replyToId = widget.replyTo?.id;
    final replyPreview = widget.replyTo?.body;
    _controller.clear();
    widget.onClearReply();
    try {
      await ref.read(roomMessagesProvider(widget.roomId).notifier).send(
            body,
            mentions: mentions,
            replyToId: replyToId,
            replyPreview: replyPreview,
          );
    } on ApiException catch (error) {
      if (!mounted) return;
      if (_controller.text.isEmpty) _controller.text = body;
      showToast(context, describeError(l10n, error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    return SafeArea(
      top: false,
      child: Container(
        padding: EdgeInsets.fromLTRB(tokens.sm, tokens.xs, tokens.xs, tokens.xs),
        decoration: BoxDecoration(border: Border(top: BorderSide(color: tokens.border))),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (widget.replyTo != null)
              Container(
                margin: EdgeInsets.only(bottom: tokens.sm),
                padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: tokens.xs),
                decoration: BoxDecoration(
                  color: tokens.subtle,
                  borderRadius: BorderRadius.circular(tokens.radius),
                  border: Border(left: BorderSide(color: tokens.primary, width: 2)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.reply, size: 16, color: tokens.primary),
                    SizedBox(width: tokens.xs),
                    Expanded(
                      child: Text(
                        widget.replyTo!.body,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.labelSmall,
                      ),
                    ),
                    IconButton(
                      tooltip: l10n.storageClearSelection,
                      onPressed: widget.onClearReply,
                      icon: const Icon(Icons.close, size: 18),
                    ),
                  ],
                ),
              ),
            if (_suggestions.isNotEmpty)
              Card(
                margin: EdgeInsets.only(bottom: tokens.sm),
                child: Column(
                  children: [
                    for (final candidate in _suggestions)
                      ListTile(
                        dense: true,
                        leading: Icon(
                          candidate.type == ChatMentionTypes.agent ? Icons.auto_awesome : Icons.person_outline,
                          size: 18,
                          color: tokens.primary,
                        ),
                        title: Text('@${candidate.label}'),
                        onTap: () => _insertMention(candidate),
                      ),
                  ],
                ),
              ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: CallbackShortcuts(
                    bindings: {
                      const SingleActivator(LogicalKeyboardKey.enter, control: true): _send,
                      const SingleActivator(LogicalKeyboardKey.enter, meta: true): _send,
                    },
                    child: TextField(
                      controller: _controller,
                      focusNode: _focus,
                      minLines: 1,
                      maxLines: _maxLines,
                      maxLength: chatMessageMaxLength,
                      maxLengthEnforcement: MaxLengthEnforcement.enforced,
                      keyboardType: TextInputType.multiline,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: InputDecoration(
                        hintText: l10n.messagesComposerHint,
                        isDense: true,
                        counterText: '',
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(tokens.radius + 8)),
                      ),
                    ),
                  ),
                ),
                SizedBox(width: tokens.sm),
                IconButton.filled(
                  tooltip: l10n.messagesSend,
                  onPressed: _canSend ? _send : null,
                  icon: const Icon(Icons.send),
                ),
              ],
            ),
          ],
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
