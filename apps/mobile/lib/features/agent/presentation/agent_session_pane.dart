import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/theme/theme_settings.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/state_views.dart';
import '../../../l10n/app_localizations.dart';
import '../../calendar/application/calendar_controller.dart';
import '../../dashboard/application/dashboard_providers.dart';
import '../../notifications/application/notifications_controller.dart';
import '../application/agent_providers.dart';
import '../data/agent_repository.dart';
import '../domain/agent_models.dart';
import 'agent_insights_panel.dart';
import 'agent_markdown.dart';

/// Chat thread for one agent session: pending confirmations, messages, streaming reply, composer.
class AgentSessionPane extends ConsumerStatefulWidget {
  const AgentSessionPane({required this.sessionId, super.key});

  final String sessionId;

  @override
  ConsumerState<AgentSessionPane> createState() => _AgentSessionPaneState();
}

class _LiveStep {
  _LiveStep({
    required this.toolId,
    this.callId,
    this.input,
    this.running = true,
    this.ok,
    this.error,
    this.result,
    this.expanded = false,
  });

  final String toolId;
  final String? callId;
  final Map<String, dynamic>? input;
  final bool running;
  final bool? ok;
  final String? error;
  final Object? result;
  bool expanded;
}

class _LiveReply {
  _LiveReply();

  AgentStreamPhase phase = AgentStreamPhase.planning;
  String? statusDetail;
  String? planSummary;
  int plannedToolCount = 0;
  final steps = <_LiveStep>[];
  final StringBuffer text = StringBuffer();
}

class _AgentSessionPaneState extends ConsumerState<AgentSessionPane> {
  final _draft = TextEditingController();
  final _scroll = ScrollController();

  /// Messages shown optimistically until the refreshed session includes them.
  final _local = <AgentMessage>[];
  _LiveReply? _live;
  StreamSubscription<AgentStreamEvent>? _subscription;
  var _calendarMutated = false;
  var _workspaceMutated = false;
  final _outcomes = <AgentToolOutcome>[];
  final _insightsKey = GlobalKey<ScaffoldState>();

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
      _calendarMutated = false;
      _workspaceMutated = false;
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
      case AgentStreamStatus(:final phase, :final detail):
        setState(() {
          live.phase = phase;
          live.statusDetail = detail;
        });
        _scrollToEnd();
      case AgentStreamPlan(:final summary, :final toolCount):
        setState(() {
          live.phase = AgentStreamPhase.planning;
          live.planSummary = summary;
          live.plannedToolCount = toolCount;
        });
        _scrollToEnd();
      case AgentStreamToolStart(:final toolId, :final callId, :final input):
        setState(() {
          live.phase = AgentStreamPhase.working;
          live.steps.add(_LiveStep(toolId: toolId, callId: callId, input: input));
        });
        _scrollToEnd();
      case AgentStreamToolResult(:final toolId, :final callId, :final ok, :final error, :final result):
        if (ok == true) {
          if (toolId.startsWith('calendar.')) _calendarMutated = true;
          if (toolId.startsWith('calendar.') ||
              toolId.startsWith('tasks.') ||
              toolId.startsWith('agents.schedules')) {
            _workspaceMutated = true;
          }
          _outcomes.add(
            AgentToolOutcome(
              toolId: toolId,
              ok: ok == true,
              summary: _toolOutcomeSummary(result),
              at: DateTime.now(),
            ),
          );
        }
        setState(() {
          live.phase = AgentStreamPhase.working;
          final index = live.steps.lastIndexWhere(
            (step) =>
                step.running &&
                (callId != null ? step.callId == callId : step.toolId == toolId),
          );
          if (index >= 0) {
            final prior = live.steps[index];
            live.steps[index] = _LiveStep(
              toolId: toolId,
              callId: callId ?? prior.callId,
              input: prior.input,
              running: false,
              ok: ok,
              error: error,
              result: result,
              expanded: prior.expanded,
            );
          } else {
            live.steps.add(
              _LiveStep(toolId: toolId, callId: callId, running: false, ok: ok, error: error, result: result),
            );
          }
        });
        _scrollToEnd();
      case AgentStreamDelta(:final text):
        setState(() {
          live.phase = AgentStreamPhase.writing;
          live.text.write(text);
        });
        _scrollToEnd();
      case AgentStreamDone(:final response):
        setState(() {
          live.phase = AgentStreamPhase.writing;
          if (response.isNotEmpty) {
            live.text
              ..clear()
              ..write(response);
          }
        });
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
    if (failed) {
      showToast(context, AppLocalizations.of(context).agentSendFailed);
    } else if (_workspaceMutated) {
      ref
        ..invalidate(calendarFeedProvider)
        ..invalidate(dashboardCalendarProvider)
        ..invalidate(upcomingProvider)
        ..invalidate(agentSchedulesProvider);
      unawaited(refreshDashboard(ref));
      unawaited(ref.read(notificationsProvider.notifier).reload());
      if (_calendarMutated && mounted) {
        showToast(context, AppLocalizations.of(context).agentCalendarUpdated);
      }
    }

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

  String? _toolOutcomeSummary(Object? result) {
    if (result is Map) {
      final title = result['title'];
      if (title is String && title.isNotEmpty) return title;
      final name = result['name'];
      if (name is String && name.isNotEmpty) return name;
    }
    return null;
  }

  void _openInsights() => _insightsKey.currentState?.openEndDrawer();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final detail = ref.watch(agentSessionProvider(widget.sessionId));
    final pending = ref.watch(agentPendingProvider);

    return Scaffold(
      key: _insightsKey,
      endDrawer: Drawer(
        width: math.min(MediaQuery.sizeOf(context).width * 0.88, 400),
        child: AgentInsightsPanel(outcomes: _outcomes),
      ),
      onEndDrawerChanged: (open) {
        if (open) ref.invalidate(agentSchedulesProvider);
      },
      body: GestureDetector(
        onHorizontalDragEnd: (details) {
          final velocity = details.primaryVelocity ?? 0;
          if (velocity < -280) _openInsights();
        },
        child: Column(
      children: [
        Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
            onPressed: _openInsights,
            icon: const Icon(Icons.insights_outlined),
            label: Text(l10n.agentInsightsTitle),
          ),
        ),
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
                onStepToggle: (index) => setState(() {
                  _live?.steps[index].expanded = !_live!.steps[index].expanded;
                }),
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
        ),
      ),
    );
  }
}

class _MessageList extends StatelessWidget {
  const _MessageList({
    required this.messages,
    required this.live,
    required this.controller,
    required this.onStepToggle,
  });

  final List<AgentMessage> messages;
  final _LiveReply? live;
  final ScrollController controller;
  final void Function(int index) onStepToggle;

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
              return _Bubble(
                maxWidth: bubbleMax,
                mine: false,
                child: _LiveContent(live: live, onStepToggle: onStepToggle),
              );
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
  const _LiveContent({required this.live, required this.onStepToggle});

  final _LiveReply live;
  final void Function(int index) onStepToggle;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final answer = live.text.toString();
    final phaseLabel = switch (live.phase) {
      AgentStreamPhase.planning => l10n.agentPhasePlanning,
      AgentStreamPhase.working => l10n.agentPhaseWorking,
      AgentStreamPhase.writing => l10n.agentPhaseWriting,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const _TypingDots(),
            SizedBox(width: tokens.sm),
            Expanded(
              child: Text(
                live.statusDetail ?? phaseLabel,
                style: text.labelMedium?.copyWith(color: tokens.muted, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        if (live.planSummary != null) ...[
          SizedBox(height: tokens.md),
          Text(
            l10n.agentStreamPlan.toUpperCase(),
            style: text.labelSmall?.copyWith(color: tokens.muted, letterSpacing: 0.6, fontWeight: FontWeight.w700),
          ),
          SizedBox(height: tokens.xs),
          Text(live.planSummary!, style: text.bodySmall),
          if (live.plannedToolCount > 0) ...[
            SizedBox(height: tokens.xs),
            Text(
              l10n.agentStreamToolCount(live.plannedToolCount),
              style: text.labelSmall?.copyWith(color: tokens.muted),
            ),
          ],
        ],
        if (live.steps.isNotEmpty) ...[
          SizedBox(height: tokens.md),
          Text(
            l10n.agentStreamSteps.toUpperCase(),
            style: text.labelSmall?.copyWith(color: tokens.muted, letterSpacing: 0.6, fontWeight: FontWeight.w700),
          ),
          SizedBox(height: tokens.xs),
          for (var i = 0; i < live.steps.length; i++) ...[
            _StepRow(step: live.steps[i], onToggle: () => onStepToggle(i)),
            SizedBox(height: tokens.xs),
          ],
        ],
        if (answer.isNotEmpty) ...[
          SizedBox(height: tokens.md),
          Text(
            l10n.agentStreamAnswer.toUpperCase(),
            style: text.labelSmall?.copyWith(color: tokens.muted, letterSpacing: 0.6, fontWeight: FontWeight.w700),
          ),
          SizedBox(height: tokens.xs),
          AgentMarkdown(answer),
          if (live.phase == AgentStreamPhase.writing) const _StreamCursor(),
        ],
      ],
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({required this.step, required this.onToggle});

  final _LiveStep step;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final label = _formatToolId(step.toolId);
    final IconData icon;
    final Color color;
    if (step.running) {
      icon = Icons.sync;
      color = tokens.primary;
    } else if (step.ok == true) {
      icon = Icons.check_circle_outline;
      color = StatusColors.success;
    } else {
      icon = Icons.error_outline;
      color = StatusColors.danger;
    }
    final detail = _formatStepDetail(step);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: detail == null ? null : onToggle,
        borderRadius: BorderRadius.circular(tokens.radius),
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: tokens.xs),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  step.running
                      ? SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: tokens.primary),
                        )
                      : Icon(icon, size: 16, color: color),
                  SizedBox(width: tokens.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(label, style: text.bodySmall?.copyWith(fontWeight: FontWeight.w500)),
                        if (step.error != null && step.error!.isNotEmpty)
                          Text(step.error!, style: text.labelSmall?.copyWith(color: StatusColors.danger)),
                      ],
                    ),
                  ),
                  if (detail != null)
                    Icon(
                      step.expanded ? Icons.expand_less : Icons.expand_more,
                      size: 18,
                      color: tokens.muted,
                    ),
                ],
              ),
              if (step.expanded && detail != null) ...[
                SizedBox(height: tokens.xs),
                Container(
                  width: double.infinity,
                  padding: EdgeInsets.all(tokens.sm),
                  decoration: BoxDecoration(
                    color: tokens.surface.withValues(alpha: 0.55),
                    borderRadius: BorderRadius.circular(tokens.radius),
                    border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
                  ),
                  child: SelectableText(
                    detail,
                    style: text.labelSmall?.copyWith(fontFamily: 'monospace', height: 1.35),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

String? _formatStepDetail(_LiveStep step) {
  if (step.running) return null;
  final parts = <String>[];
  if (step.input != null && step.input!.isNotEmpty) {
    parts.add('Input:\n${const JsonEncoder.withIndent('  ').convert(step.input)}');
  }
  if (step.result != null) {
    final encoded = step.result is String ? step.result as String : const JsonEncoder.withIndent('  ').convert(step.result);
    parts.add('Result:\n$encoded');
  }
  if (parts.isEmpty && step.error != null) return step.error;
  return parts.isEmpty ? null : parts.join('\n\n');
}

String _formatToolId(String toolId) =>
    toolId.split('.').map((part) => part.isEmpty ? part : '${part[0].toUpperCase()}${part.substring(1)}').join(' · ');

class _StreamCursor extends StatelessWidget {
  const _StreamCursor();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(top: context.tokens.xs),
      child: Container(
        width: 8,
        height: 14,
        color: context.tokens.primary.withValues(alpha: 0.75),
      ),
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
