import 'package:flutter/material.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/calendar_entry.dart';
import 'calendar_source.dart';

Future<CalendarFilter?> showCalendarFilterSheet(
  BuildContext context, {
  required CalendarFilter initial,
  required List<String> clientIds,
  required String Function(String clientId) clientNameOf,
}) =>
    showModalBottomSheet<CalendarFilter>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _CalendarFilterSheet(
        initial: initial,
        clientIds: clientIds,
        clientNameOf: clientNameOf,
      ),
    );

class _CalendarFilterSheet extends StatefulWidget {
  const _CalendarFilterSheet({
    required this.initial,
    required this.clientIds,
    required this.clientNameOf,
  });

  final CalendarFilter initial;
  final List<String> clientIds;
  final String Function(String clientId) clientNameOf;

  @override
  State<_CalendarFilterSheet> createState() => _CalendarFilterSheetState();
}

class _CalendarFilterSheetState extends State<_CalendarFilterSheet> {
  static const _maxWidth = 560.0;

  late CalendarFilter _filter = widget.initial;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;

    return Center(
      heightFactor: 1,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: _maxWidth),
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(tokens.xl, 0, tokens.xl, tokens.xl + MediaQuery.viewInsetsOf(context).bottom),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(header: true, child: Text(l10n.calendarFilters, style: Theme.of(context).textTheme.titleLarge)),
              SizedBox(height: tokens.xs),
              Text(l10n.calendarFiltersBody, style: TextStyle(color: tokens.muted)),
              SizedBox(height: tokens.lg),
              if (widget.clientIds.isNotEmpty) ...[
                OptionField<String?>(
                  label: l10n.calendarFilterClient,
                  value: _filter.clientId,
                  options: [null, ...widget.clientIds],
                  labelOf: (id) => id == null ? l10n.filterAll : widget.clientNameOf(id),
                  onChanged: (id) => setState(
                    () => _filter = CalendarFilter(clientId: id, sourceType: _filter.sourceType),
                  ),
                ),
                SizedBox(height: tokens.md),
              ],
              OptionField<String?>(
                label: l10n.calendarFilterType,
                value: _filter.sourceType,
                options: [null, ...CalendarSourceTypes.values],
                labelOf: (type) => type == null ? l10n.filterAll : calendarSourceLabel(l10n, type),
                onChanged: (type) => setState(
                  () => _filter = CalendarFilter(clientId: _filter.clientId, sourceType: type),
                ),
              ),
              SizedBox(height: tokens.xl),
              Row(
                children: [
                  if (_filter.isActive)
                    TextButton(
                      onPressed: () => setState(() => _filter = const CalendarFilter()),
                      child: Text(l10n.calendarFiltersClear),
                    ),
                  const Spacer(),
                  FilledButton(onPressed: () => Navigator.pop(context, _filter), child: Text(l10n.save)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
