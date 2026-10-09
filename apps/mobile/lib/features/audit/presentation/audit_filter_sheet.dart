import 'package:flutter/material.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/audit_entry.dart';
import '../domain/audit_filter.dart';
import 'audit_labels.dart';

/// Values present in the loaded log, so every option narrows to something.
class AuditFilterOptions {
  const AuditFilterOptions({
    required this.actors,
    required this.actionDomains,
    required this.entityTypes,
  });

  factory AuditFilterOptions.of(Iterable<AuditEntry> entries) {
    final actors = <String>{};
    final domains = <String>{};
    final types = <String>{};
    for (final entry in entries) {
      if (entry.actorId case final id?) actors.add(id);
      domains.add(entry.actionDomain);
      types.add(entry.entityType);
    }
    return AuditFilterOptions(
      actors: actors.toList(),
      actionDomains: domains.toList()..sort(),
      entityTypes: types.toList()..sort(),
    );
  }

  final List<String> actors;
  final List<String> actionDomains;
  final List<String> entityTypes;
}

/// Returns the edited filter, or null when dismissed.
Future<AuditFilter?> showAuditFilterSheet(
  BuildContext context, {
  required AuditFilter initial,
  required AuditFilterOptions options,
  required String Function(String actorId) actorNameOf,
}) =>
    showModalBottomSheet<AuditFilter>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _AuditFilterSheet(initial: initial, options: options, actorNameOf: actorNameOf),
    );

class _AuditFilterSheet extends StatefulWidget {
  const _AuditFilterSheet({required this.initial, required this.options, required this.actorNameOf});

  final AuditFilter initial;
  final AuditFilterOptions options;
  final String Function(String actorId) actorNameOf;

  @override
  State<_AuditFilterSheet> createState() => _AuditFilterSheetState();
}

class _AuditFilterSheetState extends State<_AuditFilterSheet> {
  static const _maxWidth = 560.0;

  late AuditFilter _filter = widget.initial;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final options = widget.options;
    final actors = [...options.actors]
      ..sort((a, b) => widget.actorNameOf(a).toLowerCase().compareTo(widget.actorNameOf(b).toLowerCase()));

    return Center(
      heightFactor: 1,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: _maxWidth),
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(tokens.xl, 0, tokens.xl, tokens.xl + MediaQuery.viewInsetsOf(context).bottom),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(header: true, child: Text(l10n.auditFilters, style: Theme.of(context).textTheme.titleLarge)),
              SizedBox(height: tokens.xs),
              Text(l10n.auditFiltersBody, style: TextStyle(color: tokens.muted)),
              SizedBox(height: tokens.lg),
              Text(l10n.auditRangeLabel, style: Theme.of(context).textTheme.labelLarge),
              SizedBox(height: tokens.sm),
              Wrap(
                spacing: tokens.sm,
                runSpacing: tokens.sm,
                children: [
                  for (final days in auditRangeDays)
                    ChoiceChip(
                      label: Text(days == null ? l10n.auditRangeAll : l10n.auditRangeDays(days)),
                      selected: _filter.rangeDays == days,
                      onSelected: (_) => setState(() => _filter = _filter.copyWith(rangeDays: () => days)),
                    ),
                ],
              ),
              SizedBox(height: tokens.lg),
              OptionField<String>(
                label: l10n.auditOutcomeLabel,
                value: _filter.outcome,
                options: AuditOutcomes.values,
                labelOf: (value) => auditOutcomeLabel(l10n, value),
                allowNone: true,
                onChanged: (value) => setState(() => _filter = _filter.copyWith(outcome: () => value)),
              ),
              SizedBox(height: tokens.md),
              OptionField<String>(
                label: l10n.auditActor,
                value: _filter.actorId,
                options: actors,
                labelOf: widget.actorNameOf,
                allowNone: true,
                onChanged: (value) => setState(() => _filter = _filter.copyWith(actorId: () => value)),
              ),
              SizedBox(height: tokens.md),
              OptionField<String>(
                label: l10n.auditAction,
                value: _filter.actionDomain,
                options: options.actionDomains,
                labelOf: (value) => auditActionDomainLabel(l10n, value),
                allowNone: true,
                onChanged: (value) => setState(() => _filter = _filter.copyWith(actionDomain: () => value)),
              ),
              SizedBox(height: tokens.md),
              OptionField<String>(
                label: l10n.auditEntity,
                value: _filter.entityType,
                options: options.entityTypes,
                labelOf: (value) => auditEntityTypeLabel(l10n, value),
                allowNone: true,
                onChanged: (value) => setState(() => _filter = _filter.copyWith(entityType: () => value)),
              ),
              SizedBox(height: tokens.xl),
              Row(
                children: [
                  TextButton(
                    onPressed: _filter.activeCount == 0 ? null : () => setState(() => _filter = _filter.cleared()),
                    child: Text(l10n.auditClearFilters),
                  ),
                  const Spacer(),
                  FilledButton(
                    onPressed: () => Navigator.of(context).pop(_filter),
                    child: Text(l10n.auditApplyFilters),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
