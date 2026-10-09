import 'package:flutter/material.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/automation.dart';
import 'automation_labels.dart';
import 'automation_widgets.dart';

class AutomationCard extends StatelessWidget {
  const AutomationCard({required this.automation, required this.onTap, super.key});

  static const _pausedOpacity = 0.72;

  final Automation automation;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final rate = automation.successRate;
    return SurfaceCard(
      onTap: onTap,
      semanticLabel: '${automation.name}, ${automationStatusLabel(l10n, automation.status)}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _IconMark(enabled: automation.enabled),
              SizedBox(width: tokens.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(automation.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleMedium),
                    SizedBox(height: 2),
                    StatusBadge(
                      label: automationStatusLabel(l10n, automation.status),
                      tone: automationStatusTone(automation.status),
                      dense: true,
                    ),
                  ],
                ),
              ),
              AutomationEnabledSwitch(automation: automation),
            ],
          ),
          SizedBox(height: tokens.md),
          AnimatedOpacity(
            opacity: automation.enabled ? 1 : _pausedOpacity,
            duration: AppMotion.medium,
            child: AutomationFlow(trigger: automation.trigger, action: automation.action),
          ),
          SizedBox(height: tokens.md),
          Row(
            children: [
              Expanded(child: _Stat(label: l10n.automationStatRuns, value: formats.number(automation.runs))),
              Expanded(
                child: _Stat(
                  label: l10n.automationStatFailures,
                  value: formats.number(automation.failures),
                  tone: automation.failures > 0 ? StatusTone.danger : null,
                ),
              ),
              Expanded(
                child: _Stat(
                  label: l10n.automationStatLastRun,
                  value: automation.lastRunAt == null ? l10n.automationNever : formats.relative(automation.lastRunAt!),
                ),
              ),
            ],
          ),
          SizedBox(height: tokens.md),
          if (rate == null)
            Text(l10n.automationNoRunsYet, style: text.labelSmall?.copyWith(color: tokens.muted))
          else ...[
            Row(
              children: [
                Expanded(
                  child: Text(l10n.automationSuccessRate, style: text.labelSmall?.copyWith(color: tokens.muted)),
                ),
                Text(formats.percent(rate), style: text.labelSmall),
              ],
            ),
            SizedBox(height: tokens.xs),
            ProgressMeter(value: rate, tone: automationSuccessTone(rate), label: l10n.automationSuccessRate),
          ],
        ],
      ),
    );
  }
}

class _IconMark extends StatelessWidget {
  const _IconMark({required this.enabled});

  static const _size = 40.0;

  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      width: _size,
      height: _size,
      decoration: BoxDecoration(
        color: tokens.subtle,
        borderRadius: BorderRadius.circular(tokens.radius + 6),
        border: Border.all(color: tokens.border),
      ),
      child: Icon(enabled ? Icons.bolt : Icons.bolt_outlined, size: 20, color: enabled ? tokens.primary : tokens.muted),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, this.tone});

  final String label;
  final String value;
  final StatusTone? tone;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.labelSmall?.copyWith(color: tokens.muted)),
        SizedBox(height: 2),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: text.titleSmall?.copyWith(
            color: tone?.color(tokens),
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ],
    );
  }
}
