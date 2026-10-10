import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/state_views.dart';
import '../../../l10n/app_localizations.dart';
import '../application/agent_providers.dart';
import '../data/agent_repository.dart';
import '../domain/agent_models.dart';
import 'agent_markdown.dart';

/// Chat thread for one agent session: pending confirmations, messages, streaming reply, composer.
class AgentSessionPane extends ConsumerStatefulWidget {
  const AgentSessionPane({required this.sessionId, super.key});

  final String sessionId;

  @override
  ConsumerState<AgentSessionPane> createState() => _AgentSessionPaneState();
}

class _LiveReply {
  _LiveReply();

  AgentStreamPhase phase = AgentStreamPhase.planning;
  final StringBuffer text = StringBuffer();
}

class _AgentSessionPaneState extends ConsumerState<AgentSessionPane> {
  final _draft = TextEditingController();
  final _scroll = ScrollController();

  /// Messages shown optimistically until the refreshed session includes them.
  final _local = <AgentMessage>[];
  _LiveReply? _live;
  StreamSubscription<AgentStreamEvent>? _subscription;

  bool get _streaming => _live != null;

  @override
  void initState() {
    super.initState();
    _draft.addListener(_onDraftChanged);
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _draft
      ..removeListener(_onDraftChanged)
      ..dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _onDraftChanged() => setState(() {});

  AgentMessage _message(String role, String content) => AgentMessage(
        id: 'local-$role-${DateTime.now().microsecondsSinceEpoch}',
        role: role,
        content: content,
        createdAt: DateTime.now(),
      );

  void _send() {
    final text = _draft.text.trim();
    if (text.isEmpty || _streaming) return;
    _draft.clear();
    setState(() {
      _local.add(_message('user', text));
      _live = _LiveReply();
    });
    _scrollToEnd();

    _subscription = ref.read(agentRepositoryProvider).streamMessage(widget.sessionId, text).listen(
          _onEvent,
          onError: (Object _) => _finish(failed: true),
          onDone: _finish,
          cancelOnError: true,
        );
  }

  void _onEvent(AgentStreamEvent event) {
    final live = _live;
    if (live == null) return;
    switch (event) {
      case AgentStreamStatus(:final phase):
        setState(() => live.phase = phase);
      case AgentStreamDelta(:final text):
        setState(() {
          live.phase = AgentStreamPhase.writing;
          live.text.write(text);
        });
        _scrollToEnd();
      case AgentStreamDone(:final response):
        if (response.isNotEmpty) {
          live.text
            ..clear()
            ..write(response);
        }
      case AgentStreamError():
        _subscription?.cancel();
        _finish(failed: true);
    }
  }

  Future<void> _finish({bool failed = false}) async {
    final live = _live;
    if (live == null || !mounted) return;
    final answer = live.text.toString();
    setState(() {
      if (answer.isNotEmpty) _local.add(_message('assistant', answer));
      _live = null;
    });
    if (failed) showToast(context, AppLocalizations.of(context).agentSendFailed);

    ref
      ..invalidate(agentPendingProvider)
      ..invalidate(agentSessionsProvider)
      ..invalidate(agentSessionProvider(widget.sessionId));
    try {
      await ref.read(agentSessionProvider(widget.sessionId).future);
      if (mounted && !_streaming) setState(_local.clear);
    } catch (_) {
      // Keep optimistic messages visible if the refresh fails.
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _confirm(String pendingId) async {
    await ref.read(agentRepositoryProvider).confirmPending(pendingId);
    ref
      ..invalidate(agentPendingProvider)
      ..invalidate(agentSessionProvider(widget.sessionId));
  }

  Future<void> _reject(String pendingId) async {
    await ref.read(agentRepositoryProvider).rejectPending(pendingId);
    ref.invalidate(agentPendingProvider);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final detail = ref.watch(agentSessionProvider(widget.sessionId));
    final pending = ref.watch(agentPendingProvider);

    return Column(
      children: [
        if (pending case AsyncValue(value: final actions?) when actions.isNotEmpty)
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 168),
            child: ListView(
              shrinkWrap: true,
              padding: EdgeInsets.zero,
              children: [
                for (final action in actions)
                  MaterialBanner(
                    content: Text(action.summary),
                    leading: const Icon(Icons.warning_amber_outlined),
                    actions: [
                      TextButton(
                        onPressed: () => _reject(action.id),
                        child: Text(MaterialLocalizations.of(context).cancelButtonLabel),
                      ),
                      TextButton(
                        onPressed: () => _confirm(action.id),
                        child: Text(l10n.agentConfirm),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        Expanded(
          child: switch (detail) {
            AsyncValue(value: final session?) => _MessageList(
                messages: [...session.messages, ..._local],
                live: _live,
                controller: _scroll,
              ),
            AsyncValue(error: final error?, stackTrace: _) => ErrorState(
                error: error,
                onRetry: () => ref.invalidate(agentSessionProvider(widget.sessionId)),
              ),
            _ => const Center(child: CircularProgressIndicator()),
          },
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: EdgeInsets.fromLTRB(tokens.md, tokens.sm, tokens.md, tokens.md),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: TextField(
                    controller: _draft,
                    minLines: 1,
                    maxLines: 4,
                    textInputAction: TextInputAction.send,
                    decoration: InputDecoration(hintText: l10n.agentComposerHint),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                SizedBox(width: tokens.sm),
                IconButton.filled(
                  tooltip: l10n.agentSend,
                  onPressed: _streaming || _draft.text.trim().isEmpty ? null : _send,
                  icon: const Icon(Icons.send),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _MessageList extends StatelessWidget {
  const _MessageList({required this.messages, required this.live, required this.controller});

  final List<AgentMessage> messages;
  final _LiveReply? live;
  final ScrollController controller;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final live = this.live;
    if (messages.isEmpty && live == null) {
      final l10n = AppLocalizations.of(context);
      return EmptyState(
        icon: Icons.chat_bubble_outline,
        title: l10n.agentEmptyTitle,
        body: l10n.agentComposerHint,
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final bubbleMax = math.min(560.0, math.max(220.0, constraints.maxWidth * 0.88));
        final count = messages.length + (live == null ? 0 : 1);
        return ListView.builder(
          controller: controller,
          padding: EdgeInsets.fromLTRB(tokens.md, tokens.md, tokens.md, tokens.sm),
          itemCount: count,
          itemBuilder: (context, index) {
            if (index == messages.length && live != null) {
              return _Bubble(maxWidth: bubbleMax, mine: false, child: _LiveContent(live));
            }
            final message = messages[index];
            final mine = message.role == 'user';
            return _Bubble(
              maxWidth: bubbleMax,
              mine: mine,
              child: mine ? SelectableText(message.content) : AgentMarkdown(message.content),
            );
          },
        );
      },
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.maxWidth, required this.mine, required this.child});

  final double maxWidth;
  final bool mine;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: EdgeInsets.only(bottom: tokens.sm),
        padding: EdgeInsets.all(tokens.md),
        constraints: BoxConstraints(maxWidth: maxWidth),
        decoration: BoxDecoration(
          color: mine ? tokens.primary.withValues(alpha: 0.12) : tokens.subtle,
          borderRadius: BorderRadius.circular(tokens.radius + 4),
        ),
        child: child,
      ),
    );
  }
}

class _LiveContent extends StatelessWidget {
  const _LiveContent(this.live);

  final _LiveReply live;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = live.text.toString();
    if (text.isNotEmpty) return AgentMarkdown(text);

    final label = switch (live.phase) {
      AgentStreamPhase.planning => l10n.agentPhasePlanning,
      AgentStreamPhase.working => l10n.agentPhaseWorking,
      AgentStreamPhase.writing => l10n.agentPhaseWriting,
    };
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const _TypingDots(),
        SizedBox(width: tokens.sm),
        Flexible(
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.muted),
          ),
        ),
      ],
    );
  }
}

class _TypingDots extends StatefulWidget {
  const _TypingDots();

  @override
  State<_TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<_TypingDots> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = context.tokens.primary;
    return Semantics(
      label: AppLocalizations.of(context).agentPhasePlanning,
      excludeSemantics: true,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) => Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < 3; i++)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: ExcludeSemantics(
                  child: Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: color.withValues(
                        alpha: 0.35 + 0.65 * math.max(0, math.sin((_controller.value - i * 0.2) * math.pi * 2)),
                      ),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
