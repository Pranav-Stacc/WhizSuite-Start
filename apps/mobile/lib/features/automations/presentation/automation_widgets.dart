import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/automations_controller.dart';
import '../domain/automation.dart';
import 'automation_labels.dart';

/// "When (trigger) → then (action)" as two connected pills.
class AutomationFlow extends StatelessWidget {
  const AutomationFlow({required this.trigger, required this.action, this.vertical = false, super.key});

  final String? trigger;
  final String? action;

  /// Stacks the pills with a downward arrow (detail screens) instead of wrapping inline.
  final bool vertical;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final triggerLabel = automationTriggerLabel(l10n, trigger);
    final actionLabel = automationActionLabel(l10n, action);
    final when = _FlowPill(prefix: l10n.automationWhen, label: triggerLabel, icon: Icons.sensors_outlined);
    final then = _FlowPill(prefix: l10n.automationThen, label: actionLabel, icon: Icons.bolt, emphasized: true);
    return Semantics(
      label: l10n.automationSentence(triggerLabel, actionLabel),
      child: ExcludeSemantics(
        child: vertical
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  when,
                  Padding(
                    padding: EdgeInsets.symmetric(vertical: tokens.xs),
                    child: Icon(Icons.arrow_downward, size: 18, color: tokens.primary),
                  ),
                  then,
                ],
              )
            : Wrap(
                spacing: tokens.xs,
                runSpacing: tokens.xs,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [when, Icon(Icons.arrow_forward, size: 16, color: tokens.primary), then],
              ),
      ),
    );
  }
}

class _FlowPill extends StatelessWidget {
  const _FlowPill({required this.prefix, required this.label, required this.icon, this.emphasized = false});

  static const _fillAlpha = 0.08;
  static const _borderAlpha = 0.3;

  final String prefix;
  final String label;
  final IconData icon;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme.bodySmall;
    return Container(
      padding: EdgeInsets.symmetric(horizontal: tokens.sm + 2, vertical: tokens.xs + 2),
      decoration: BoxDecoration(
        color: emphasized ? tokens.primary.withValues(alpha: _fillAlpha) : tokens.subtle,
        borderRadius: BorderRadius.circular(tokens.radius + 6),
        border: Border.all(color: emphasized ? tokens.primary.withValues(alpha: _borderAlpha) : tokens.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: emphasized ? tokens.primary : tokens.muted),
          SizedBox(width: tokens.xs + 2),
          Flexible(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(text: '$prefix ', style: TextStyle(color: tokens.muted)),
                  TextSpan(text: label, style: TextStyle(color: tokens.fg, fontWeight: FontWeight.w500)),
                ],
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: text,
            ),
          ),
        ],
      ),
    );
  }
}

/// On/off switch that shows the requested state while the API call is in flight.
class AutomationEnabledSwitch extends ConsumerStatefulWidget {
  const AutomationEnabledSwitch({required this.automation, super.key});

  final Automation automation;

  @override
  ConsumerState<AutomationEnabledSwitch> createState() => _AutomationEnabledSwitchState();
}

class _AutomationEnabledSwitchState extends ConsumerState<AutomationEnabledSwitch> {
  bool? _pending;

  Future<void> _toggle(bool enabled) async {
    final l10n = AppLocalizations.of(context);
    setState(() => _pending = enabled);
    await runAction(
      context,
      () => ref.read(automationsActionsProvider).setEnabled(widget.automation.id, enabled: enabled),
      success: enabled ? l10n.automationEnabledToast : l10n.automationPausedToast,
    );
    if (mounted) setState(() => _pending = null);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final value = _pending ?? widget.automation.enabled;
    return PermissionGate(
      anyOf: const [Permissions.automationsManage],
      child: Semantics(
        label: l10n.automationToggle(widget.automation.name),
        child: Switch(value: value, onChanged: _pending == null ? _toggle : null),
      ),
    );
  }
}

/// One run: outcome icon, automation, note and time.
class AutomationRunTile extends StatelessWidget {
  const AutomationRunTile({required this.run, this.showAutomation = true, super.key});

  final AutomationRun run;
  final bool showAutomation;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final tone = run.ok ? StatusTone.success : StatusTone.danger;
    final outcome = run.ok ? l10n.automationRunOk : l10n.automationRunFailed;
    final title = showAutomation
        ? (run.automationName.isEmpty ? l10n.automationRunDeleted : run.automationName)
        : (run.detail ?? outcome);
    final subtitle = showAutomation ? run.detail : null;
    return Semantics(
      container: true,
      label: '$outcome, $title',
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Icon(
              run.ok ? Icons.check_circle_outline : Icons.highlight_off,
              size: 20,
              color: tone.color(tokens),
            ),
          ),
          SizedBox(width: tokens.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleSmall),
                if (subtitle != null)
                  Text(
                    subtitle,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: text.bodySmall?.copyWith(color: tokens.secondary),
                  ),
                SizedBox(height: tokens.xs),
                Text(
                  context.formats.relative(run.createdAt),
                  style: text.labelSmall?.copyWith(color: tokens.muted),
                ),
              ],
            ),
          ),
          SizedBox(width: tokens.sm),
          StatusBadge(label: outcome, tone: tone, dense: true),
        ],
      ),
    );
  }
}
