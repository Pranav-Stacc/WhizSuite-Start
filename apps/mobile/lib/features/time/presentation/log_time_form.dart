import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/time_controller.dart';
import '../domain/time_entry.dart';
import '../domain/time_week.dart';

const _maxHours = timeEntryMinutesMax ~/ minutesPerHour;

/// Total minutes from typed hours and minutes; null when either is not a number.
int? typedMinutes(String hours, String minutes) {
  final h = hours.trim().isEmpty ? 0 : int.tryParse(hours.trim());
  final m = minutes.trim().isEmpty ? 0 : int.tryParse(minutes.trim());
  if (h == null || m == null) return null;
  return h * minutesPerHour + m;
}

/// Log time manually. Resolves to true when saved.
Future<bool> showLogTimeForm(BuildContext context, WidgetRef ref, {DateTime? initialDate}) async {
  final l10n = AppLocalizations.of(context);
  final projects = await ref.read(projectDirectoryProvider.future).catchError((_) => Directory.empty);
  final clients = await ref.read(clientDirectoryProvider.future).catchError((_) => Directory.empty);
  final tasks = await ref.read(timeTasksProvider.future).catchError((_) => const <TaskOption>[]);
  if (!context.mounted) return false;

  final hours = TextEditingController();
  final minutes = TextEditingController();
  final note = TextEditingController();
  final today = DateUtils.dateOnly(DateTime.now());
  DateTime? date = initialDate ?? today;
  String? projectId;
  String? taskId;
  var billable = true;

  String projectLabel(String id) {
    final project = projects[id];
    final client = clients.nameOf(project?.parentId);
    final name = project?.name ?? l10n.valueUnknown;
    return client == null ? name : l10n.timeProjectOfClient(name, client);
  }

  final projectIds = projects.entries.map((p) => p.id).toList()
    ..sort((a, b) => projectLabel(a).compareTo(projectLabel(b)));

  String? validateDuration(String? _) {
    final total = typedMinutes(hours.text, minutes.text);
    if (total == null || total < 1 || total > timeEntryMinutesMax) {
      return l10n.timeDurationRange(_maxHours);
    }
    return null;
  }

  return showFormSheet(
    context,
    title: l10n.timeLog,
    submitLabel: l10n.timeLog,
    fields: (context, setState) {
      final tokens = context.tokens;
      final projectTasks = tasks.where((t) => t.projectId == projectId && t.isOpen).toList();
      return [
        DateField(
          label: l10n.timeDate,
          value: date,
          required: true,
          lastDate: today,
          onChanged: (value) => setState(() => date = value),
        ),
        OptionField<String>(
          label: l10n.timeProject,
          value: projectId,
          options: projectIds,
          labelOf: projectLabel,
          validator: (value) => value == null ? l10n.validationRequired : null,
          onChanged: (value) => setState(() {
            projectId = value;
            taskId = null;
          }),
        ),
        if (projectTasks.isNotEmpty)
          OptionField<String>(
            key: ValueKey('task-$projectId'),
            label: l10n.timeTaskOptional,
            value: taskId,
            options: projectTasks.map((t) => t.id).toList(),
            allowNone: true,
            labelOf: (id) => projectTasks.firstWhere((t) => t.id == id).title,
            onChanged: (value) => setState(() => taskId = value),
          ),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: TextFormField(
                controller: hours,
                autofocus: true,
                decoration: InputDecoration(labelText: l10n.timeHours, suffixText: l10n.timeHoursSuffix),
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                textInputAction: TextInputAction.next,
                validator: validateDuration,
                onChanged: (_) => setState(() {}),
              ),
            ),
            SizedBox(width: tokens.md),
            Expanded(
              child: TextFormField(
                controller: minutes,
                decoration: InputDecoration(labelText: l10n.timeMinutes, suffixText: l10n.timeMinutesSuffix),
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                textInputAction: TextInputAction.next,
                validator: (value) {
                  final m = int.tryParse(value?.trim() ?? '');
                  if (m != null && m >= minutesPerHour) return l10n.timeMinutesRange(minutesPerHour - 1);
                  return null;
                },
                onChanged: (_) => setState(() {}),
              ),
            ),
          ],
        ),
        TextFormField(
          controller: note,
          decoration: InputDecoration(labelText: l10n.timeNote),
          minLines: 2,
          maxLines: 4,
          maxLength: timeEntryNoteMaxLength,
        ),
        SwitchListTile.adaptive(
          contentPadding: EdgeInsets.zero,
          title: Text(l10n.timeBillable),
          subtitle: Text(l10n.timeBillableHint),
          value: billable,
          onChanged: (value) => setState(() => billable = value),
        ),
      ];
    },
    onSubmit: () async {
      final day = date;
      final total = typedMinutes(hours.text, minutes.text);
      if (day == null || total == null) return;
      final text = note.text.trim();
      await ref
          .read(timeActionsProvider)
          .log(
            TimeEntryInput(
              date: day,
              minutes: total,
              projectId: projectId,
              taskId: taskId,
              note: text.isEmpty ? null : text,
              billable: billable,
            ),
          );
    },
  );
}
