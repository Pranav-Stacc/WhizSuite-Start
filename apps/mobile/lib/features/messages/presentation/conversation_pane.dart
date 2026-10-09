import 'dart:async';
import 'dart:math' as math;

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
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/presentation/permission_gate.dart';
import '../../content/content_routes.dart';
import '../application/messages_providers.dart';
import '../domain/feedback_models.dart';
import 'conversation_labels.dart';

/// How often an open conversation re-reads its messages; feedback has no realtime event.
const messagesPollInterval = Duration(seconds: 20);

/// A conversation: header with status actions, day-grouped messages and the composer.
/// Used full-screen on phones and as the detail pane on wide layouts.
class ConversationPane extends ConsumerWidget {
  const ConversationPane({required this.threadId, this.showTitle = true, super.key});

  final String threadId;

  /// The full-screen route shows the title in its app bar instead.
  final bool showTitle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(conversationProvider(threadId));
    return switch (value) {
      AsyncValue(value: final conversation?) => _Conversation(
          key: ValueKey(conversation.subject),
          conversation: conversation,
          showTitle: showTitle,
        ),
      AsyncValue(error: final error?) => ErrorState(
          error: error,
          onRetry: () => ref.invalidate(messageThreadsProvider),
        ),
      _ => const SkeletonList(itemCount: 4),
    };
  }
}

class _Conversation extends ConsumerStatefulWidget {
  const _Conversation({required this.conversation, required this.showTitle, super.key});

  final Conversation conversation;
  final bool showTitle;

  @override
  ConsumerState<_Conversation> createState() => _ConversationState();
}

class _ConversationState extends ConsumerState<_Conversation> {
  Timer? _poll;

  FeedbackSubject get _subject => widget.conversation.subject;

  @override
  void initState() {
    super.initState();
    _poll = Timer.periodic(messagesPollInterval, (_) => _refresh());
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  /// Skipped while a message is sending so the optimistic copy is not dropped.
  void _refresh() {
    final sending = ref.read(subjectCommentsProvider(_subject)).value?.any((c) => c.pending) ?? false;
    if (sending) return;
    ref
      ..invalidate(subjectCommentsProvider(_subject))
      ..invalidate(messageThreadsProvider);
  }

  Future<void> _pullToRefresh() async {
    ref.invalidate(messageThreadsProvider);
    await ref.refresh(subjectCommentsProvider(_subject).future).then<void>((_) {}, onError: (Object _) {});
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(messagesRealtimeProvider, (_, next) {
      if (next.hasValue) _refresh();
    });
    final comments = ref.watch(subjectCommentsProvider(_subject));
    return Column(
      children: [
        _Header(conversation: widget.conversation, showTitle: widget.showTitle),
        Expanded(
          child: switch (comments) {
            AsyncValue(value: final list?) => _MessageList(comments: list, onRefresh: _pullToRefresh),
            AsyncValue(error: final error?) => ErrorState(
                error: error,
                onRetry: () => ref.invalidate(subjectCommentsProvider(_subject)),
              ),
            _ => const SkeletonList(itemCount: 5),
          },
        ),
        PermissionGate(
          anyOf: const [Permissions.feedbackCreate],
          fallback: _ReadOnlyNote(message: AppLocalizations.of(context).messagesReadOnly),
          child: _Composer(subject: _subject, resolved: !widget.conversation.isOpen),
        ),
      ],
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header({required this.conversation, required this.showTitle});

  final Conversation conversation;
  final bool showTitle;

  Future<void> _toggle(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final actions = ref.read(messagesActionsProvider);
    if (conversation.isOpen) {
      await runAction(context, () => actions.resolve(conversation), success: l10n.messagesResolvedToast);
    } else {
      await runAction(context, () => actions.reopen(conversation), success: l10n.messagesReopenedToast);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final title = conversationTitle(ref, l10n, conversation);
    final subject = conversation.subject;
    final isOpen = conversation.isOpen;
    final canOpenPost = subject.type == FeedbackSubjectTypes.content &&
        ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.contentView)));

    return Container(
      padding: EdgeInsets.fromLTRB(tokens.lg, tokens.sm, tokens.sm, tokens.sm),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: tokens.border))),
      child: Row(
        children: [
          if (showTitle) ...[
            Expanded(
              child: Semantics(
                header: true,
                child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleMedium),
              ),
            ),
            SizedBox(width: tokens.sm),
          ],
          StatusBadge(label: l10n.messagesStatus(conversation.status), tone: conversationTone(conversation.status)),
          if (!showTitle) const Spacer(),
          if (canOpenPost)
            IconButton(
              tooltip: l10n.messagesOpenPost,
              icon: const Icon(Icons.open_in_new),
              onPressed: () => context.push(ContentRoutes.detail(subject.id)),
            ),
          PermissionGate(
            anyOf: const [Permissions.feedbackCreate],
            child: TextButton.icon(
              onPressed: () => _toggle(context, ref),
              icon: Icon(isOpen ? Icons.check_circle_outline : Icons.replay),
              label: Text(isOpen ? l10n.messagesResolve : l10n.messagesReopen),
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageList extends ConsumerStatefulWidget {
  const _MessageList({required this.comments, required this.onRefresh});

  final List<FeedbackComment> comments;
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
    if (widget.comments.length != oldWidget.comments.length) _scrollToEnd();
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
    final days = groupCommentsByDay(widget.comments);

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
          for (final day in days) ...[
            _DaySeparator(day: day.day),
            for (final (i, comment) in day.comments.indexed)
              FadeSlideIn(
                index: i,
                child: _Bubble(
                  comment: comment,
                  author: names.of(comment),
                  mine: names.isMine(comment),
                  // Consecutive messages from one author share a single name and avatar.
                  showAuthor: i == 0 || day.comments[i - 1].authorId != comment.authorId,
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

class _Bubble extends StatelessWidget {
  const _Bubble({required this.comment, required this.author, required this.mine, required this.showAuthor});

  static const _maxWidthFactor = 0.78;
  static const _maxWidth = 560.0;
  static const _mineAlpha = 0.14;
  static const _pendingOpacity = 0.6;
  static const _spinnerSize = 10.0;
  static const _avatarSize = 26.0;
  static const _cornerExtra = 12.0;

  final FeedbackComment comment;
  final String author;
  final bool mine;
  final bool showAuthor;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final time = context.formats.time(comment.createdAt);
    final corner = Radius.circular(tokens.radius + _cornerExtra);
    final tight = Radius.circular(tokens.radius);
    final bubble = Container(
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
      child: SelectableText(comment.body, style: text.bodyMedium?.copyWith(height: 1.35)),
    );

    final column = Column(
      crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        if (showAuthor && !mine)
          Padding(
            padding: EdgeInsets.only(left: tokens.xs, bottom: tokens.xs),
            child: Text(author, style: text.labelSmall?.copyWith(color: tokens.muted, fontWeight: FontWeight.w600)),
          ),
        bubble,
        Padding(
          padding: EdgeInsets.fromLTRB(tokens.xs, tokens.xs, tokens.xs, 0),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (comment.pending) ...[
                const SizedBox.square(
                  dimension: _spinnerSize,
                  child: CircularProgressIndicator(strokeWidth: 1.5),
                ),
                SizedBox(width: tokens.xs),
              ],
              Text(
                comment.pending ? l10n.messagesSending : time,
                style: text.labelSmall?.copyWith(color: tokens.muted),
              ),
            ],
          ),
        ),
      ],
    );

    return Semantics(
      label: l10n.messagesMessageLabel(author, comment.pending ? l10n.messagesSending : time, comment.body),
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
                            child: InitialsAvatar(name: author, seed: comment.authorId, size: _avatarSize),
                          )
                        : const SizedBox(width: _avatarSize),
                    SizedBox(width: tokens.sm),
                  ],
                  ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: maxWidth),
                    child: Opacity(opacity: comment.pending ? _pendingOpacity : 1, child: column),
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

class _Composer extends ConsumerStatefulWidget {
  const _Composer({required this.subject, required this.resolved});

  final FeedbackSubject subject;
  final bool resolved;

  @override
  ConsumerState<_Composer> createState() => _ComposerState();
}

class _ComposerState extends ConsumerState<_Composer> {
  static const _maxLines = 6;

  final _controller = TextEditingController();
  final _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    _controller.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  bool get _canSend => _controller.text.trim().isNotEmpty;

  Future<void> _send() async {
    if (!_canSend) return;
    final l10n = AppLocalizations.of(context);
    final body = _controller.text;
    _controller.clear();
    try {
      await ref.read(subjectCommentsProvider(widget.subject).notifier).send(body);
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
        padding: EdgeInsets.fromLTRB(tokens.md, tokens.sm, tokens.sm, tokens.sm),
        decoration: BoxDecoration(border: Border(top: BorderSide(color: tokens.border))),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (widget.resolved)
              Padding(
                padding: EdgeInsets.only(bottom: tokens.xs, left: tokens.xs),
                child: Text(
                  l10n.messagesReopenHint,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted),
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
                      maxLength: feedbackCommentMaxLengthDefault,
                      maxLengthEnforcement: MaxLengthEnforcement.enforced,
                      keyboardType: TextInputType.multiline,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: InputDecoration(
                        hintText: l10n.messagesComposerHint,
                        isDense: true,
                        counterText: '',
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
