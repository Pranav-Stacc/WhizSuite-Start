import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/forms.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/time_controller.dart';
import '../domain/time_entry.dart';

const _tabular = [FontFeature.tabularFigures()];

/// Live timer: a ticking stopwatch with Stop while running, a task picker with Start while idle.
class TimerCard extends ConsumerWidget {
  const TimerCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final timer = ref.watch(runningTimerProvider);
    final running = timer.value;

    final Widget body;
    if (timer.hasValue || running != null) {
      body = running == null ? const _StartForm() : _RunningView(timer: running);
    } else if (timer.hasError) {
      body = Row(
        children: [
          Expanded(
            child: Text(l10n.timeTimerLoadFailed, style: text.bodyMedium?.copyWith(color: tokens.muted)),
          ),
          TextButton(onPressed: () => ref.invalidate(runningTimerProvider), child: Text(l10n.retry)),
        ],
      );
    } else {
      body = const Shimmer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [SkeletonBox(width: 180, height: 36), SizedBox(height: 12), SkeletonBox(height: 44)],
        ),
      );
    }

    return Semantics(
      container: true,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(tokens.radius + 6),
          border: running == null ? null : Border.all(color: tokens.primary.withValues(alpha: 0.5), width: 1.5),
        ),
        child: SurfaceCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    padding: EdgeInsets.all(tokens.sm),
                    decoration: BoxDecoration(
                      color: tokens.subtle,
                      borderRadius: BorderRadius.circular(tokens.radius + 4),
                    ),
                    child: Icon(running == null ? Icons.timer_outlined : Icons.timer, size: 18, color: tokens.fg),
                  ),
                  SizedBox(width: tokens.md),
                  Expanded(
                    child: Semantics(header: true, child: Text(l10n.timeTimerTitle, style: text.titleSmall)),
                  ),
                  if (running != null) const _LiveDot(),
                ],
              ),
              SizedBox(height: tokens.lg),
              AnimatedSwitcher(
                duration: AppMotion.medium,
                child: KeyedSubtree(key: ValueKey(running?.id), child: body),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RunningView extends ConsumerWidget {
  const _RunningView({required this.timer});

  final RunningTimer timer;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final tasks = ref.watch(timeTasksProvider).value ?? const <TaskOption>[];
    final projects = ref.watch(projectDirectoryProvider).value ?? Directory.empty;
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final task = tasks.where((t) => t.id == timer.taskId).firstOrNull;
    final where = [projects.nameOf(timer.projectId), clients.nameOf(timer.clientId)].whereType<String>().join(' · ');
    final error = Theme.of(context).colorScheme.error;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Stopwatch(timer: timer),
        SizedBox(height: tokens.xs),
        Text(
          task?.title ?? l10n.timeTimerRunningUnknown,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: text.bodyLarge,
        ),
        if (where.isNotEmpty)
          Text(
            where,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: text.bodySmall?.copyWith(color: tokens.muted),
          ),
        Text(
          l10n.timeTimerStartedAt(context.formats.time(timer.startedAt)),
          style: text.bodySmall?.copyWith(color: tokens.muted),
        ),
        SizedBox(height: tokens.lg),
        _BusyButton(
          label: l10n.timeTimerStop,
          icon: Icons.stop_rounded,
          style: FilledButton.styleFrom(backgroundColor: error, foregroundColor: Theme.of(context).colorScheme.onError),
          onPressed: () =>
              runAction(context, () => ref.read(timeActionsProvider).stopTimer(), success: l10n.timeTimerSaved),
        ),
      ],
    );
  }
}

/// Ticks once a second while mounted.
class _Stopwatch extends StatefulWidget {
  const _Stopwatch({required this.timer});

  final RunningTimer timer;

  @override
  State<_Stopwatch> createState() => _StopwatchState();
}

class _StopwatchState extends State<_Stopwatch> {
  static const _tick = Duration(seconds: 1);

  late final Timer _ticker;

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(_tick, (_) => setState(() {}));
  }

  @override
  void dispose() {
    _ticker.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final elapsed = widget.timer.elapsed(DateTime.now());
    return Semantics(
      label: l10n.timeTimerElapsedSemantics(formats.duration(elapsed.inMinutes)),
      excludeSemantics: true,
      child: FittedBox(
        fit: BoxFit.scaleDown,
        alignment: AlignmentDirectional.centerStart,
        child: Text(
          formats.stopwatch(elapsed),
          style: Theme.of(
            context,
          ).textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w600, fontFeatures: _tabular),
        ),
      ),
    );
  }
}

class _StartForm extends ConsumerStatefulWidget {
  const _StartForm();

  @override
  ConsumerState<_StartForm> createState() => _StartFormState();
}

class _StartFormState extends ConsumerState<_StartForm> {
  String? _projectId;
  String? _taskId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final userId = ref.watch(sessionProvider.select((s) => s.value?.userId));
    final tasks = ref.watch(timeTasksProvider);
    final projects = ref.watch(projectDirectoryProvider).value ?? Directory.empty;
    final open = (tasks.value ?? const <TaskOption>[]).where((t) => t.isOpen);
    // Without a project picked, offer the member's own open tasks; a project widens it to all its open tasks.
    final options = _projectId == null
        ? open.where((t) => userId != null && t.isAssignedTo(userId)).toList()
        : open.where((t) => t.projectId == _projectId).toList();
    final byId = {for (final t in options) t.id: t};
    final projectIds = {for (final t in open) ?t.projectId}.where((id) => projects[id] != null).toList()
      ..sort((a, b) => (projects.nameOf(a) ?? '').compareTo(projects.nameOf(b) ?? ''));
    final taskId = byId.containsKey(_taskId) ? _taskId : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          context.formats.stopwatch(Duration.zero),
          style: text.displaySmall?.copyWith(fontWeight: FontWeight.w600, color: tokens.muted, fontFeatures: _tabular),
        ),
        Text(l10n.timeTimerIdle, style: text.bodySmall?.copyWith(color: tokens.muted)),
        SizedBox(height: tokens.lg),
        if (tasks.isLoading && !tasks.hasValue)
          const Shimmer(child: SkeletonBox(height: 48))
        else ...[
          if (projectIds.isNotEmpty) ...[
            OptionField<String>(
              key: ValueKey('project-$_projectId'),
              label: l10n.timeProject,
              value: _projectId,
              options: projectIds,
              allowNone: true,
              labelOf: (id) => projects.nameOf(id) ?? l10n.valueUnknown,
              onChanged: (value) => setState(() {
                _projectId = value;
                _taskId = null;
              }),
            ),
            SizedBox(height: tokens.md),
          ],
          OptionField<String>(
            key: ValueKey('task-$_projectId'),
            label: l10n.timeTask,
            value: taskId,
            options: options.map((t) => t.id).toList(),
            labelOf: (id) => byId[id]?.title ?? l10n.valueUnknown,
            onChanged: (value) => setState(() => _taskId = value),
          ),
          if (options.isEmpty) ...[
            SizedBox(height: tokens.xs),
            Text(
              _projectId == null ? l10n.timeTimerNoAssignedTasks : l10n.timeTimerNoProjectTasks,
              style: text.bodySmall?.copyWith(color: tokens.muted),
            ),
          ],
          SizedBox(height: tokens.md),
          _BusyButton(
            label: l10n.timeTimerStart,
            icon: Icons.play_arrow_rounded,
            onPressed: taskId == null
                ? null
                : () => runAction(
                    context,
                    () => ref.read(timeActionsProvider).startTimer(taskId),
                    success: l10n.timeTimerStarted,
                  ),
          ),
        ],
      ],
    );
  }
}

/// Filled button that disables itself and shows a spinner while its action runs.
class _BusyButton extends StatefulWidget {
  const _BusyButton({required this.label, required this.icon, required this.onPressed, this.style});

  final String label;
  final IconData icon;
  final Future<bool> Function()? onPressed;
  final ButtonStyle? style;

  @override
  State<_BusyButton> createState() => _BusyButtonState();
}

class _BusyButtonState extends State<_BusyButton> {
  static const _spinnerSize = 18.0;

  bool _busy = false;

  Future<void> _run(Future<bool> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final action = widget.onPressed;
    return SizedBox(
      height: 48,
      child: FilledButton.icon(
        style: widget.style,
        onPressed: action == null || _busy ? null : () => _run(action),
        icon: _busy
            ? const SizedBox.square(dimension: _spinnerSize, child: CircularProgressIndicator(strokeWidth: 2))
            : Icon(widget.icon),
        label: Text(widget.label),
      ),
    );
  }
}

/// Softly pulsing "recording" indicator; static when reduced motion is requested.
class _LiveDot extends StatefulWidget {
  const _LiveDot();

  @override
  State<_LiveDot> createState() => _LiveDotState();
}

class _LiveDotState extends State<_LiveDot> with SingleTickerProviderStateMixin {
  static const _size = 10.0;
  static const _period = Duration(milliseconds: 1200);

  late final AnimationController _controller = AnimationController(vsync: this, duration: _period);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.value = 1;
    } else if (!_controller.isAnimating) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = context.tokens.primary;
    return ExcludeSemantics(
      child: FadeTransition(
        opacity: Tween<double>(begin: 0.35, end: 1).animate(_controller),
        child: Container(
          width: _size,
          height: _size,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
      ),
    );
  }
}
