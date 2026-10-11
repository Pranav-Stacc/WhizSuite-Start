import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_message.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/calendar_controller.dart';
import '../application/google_calendar_providers.dart';
import '../data/calendar_repository.dart';
import '../domain/calendar_entry.dart';

const _defaultStartHour = 9;
const _endOfDayHour = 23;
const _endOfDayMinute = 59;

/// Opens the plan-shoot form. Resolves to true when saved.
Future<bool> showPlanShootSheet(
  BuildContext context,
  WidgetRef ref, {
  DateTime? day,
  String? clientId,
}) async {
  final l10n = AppLocalizations.of(context);
  final Directory clients;
  final Directory projects;
  try {
    clients = await ref.read(clientDirectoryProvider.future);
    projects = await ref.read(projectDirectoryProvider.future);
  } on ApiException catch (error) {
    if (context.mounted) showToast(context, describeError(l10n, error));
    return false;
  }
  if (!context.mounted) return false;

  final actions = ref.read(calendarActionsProvider);
  final validators = Validators(l10n);
  final title = TextEditingController();
  final tasks = TextEditingController();
  final initialDay = day ?? dayOf(DateTime.now());

  var allDay = true;
  var createFolders = true;
  final google = await ref.read(googleCalendarConnectionProvider.future);
  if (!context.mounted) return false;
  final googleConnected = google.isConnected;
  final typeSyncAllowed = google.syncTypes.allowsSourceType('SHOOT');
  var syncToGoogle = googleConnected && google.defaultSyncNewEvents && typeSyncAllowed;
  DateTime? start = DateTime(initialDay.year, initialDay.month, initialDay.day, _defaultStartHour);
  DateTime? end;
  String? client = clientId ?? (clients.entries.isEmpty ? null : clients.entries.first.id);
  String? project;

  final clientOptions = clients.entries.map((c) => c.id).toList()
    ..sort((a, b) => (clients.nameOf(a) ?? '').compareTo(clients.nameOf(b) ?? ''));

  List<String> projectOptions() {
    final current = project;
    return [
      for (final p in projects.entries)
        if (client == null || p.parentId == client) p.id,
      if (current != null && projects[current] == null) current,
    ]..sort((a, b) => (projects.nameOf(a) ?? '').compareTo(projects.nameOf(b) ?? ''));
  }

  (DateTime, DateTime?) normalized(DateTime from, DateTime? to) {
    if (!allDay) return (from, to);
    final first = dayOf(from);
    final last = to == null ? null : dayOf(to);
    return (
      first,
      last == null ? null : DateTime(last.year, last.month, last.day, _endOfDayHour, _endOfDayMinute),
    );
  }

  final saved = await showFormSheet(
    context,
    title: l10n.calendarShootHeading,
    submitLabel: l10n.calendarShootSubmit,
    fields: (context, setState) => [
      Text(
        l10n.calendarShootDesc,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
      ),
      TextFormField(
        controller: title,
        autofocus: true,
        textCapitalization: TextCapitalization.sentences,
        textInputAction: TextInputAction.next,
        decoration: InputDecoration(
          labelText: l10n.calendarShootTitle,
          hintText: l10n.calendarShootTitleHint,
          prefixIcon: const Icon(Icons.camera_alt_outlined),
        ),
        maxLength: resourceNameMaxLength,
        validator: validators.required,
      ),
      OptionField<String>(
        key: ValueKey(('shoot-client', client)),
        label: l10n.calendarShootClient,
        value: client,
        options: clientOptions,
        labelOf: (id) => clients.nameOf(id) ?? l10n.valueUnknown,
        validator: (value) => value == null || value.isEmpty ? l10n.validationRequired : null,
        onChanged: (value) => setState(() {
          client = value;
          final current = project;
          if (current != null && value != null && projects[current]?.parentId != value) project = null;
        }),
      ),
      OptionField<String>(
        key: ValueKey(('shoot-project', client)),
        label: l10n.calendarShootProject,
        value: project,
        options: projectOptions(),
        allowNone: true,
        labelOf: (id) => projects.nameOf(id) ?? l10n.valueUnknown,
        onChanged: (value) => setState(() {
          project = value;
          final owner = value == null ? null : projects[value]?.parentId;
          if (owner != null) client = owner;
        }),
      ),
      SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(l10n.calendarAllDay),
        value: allDay,
        onChanged: (value) => setState(() => allDay = value),
      ),
      DateField(
        key: ValueKey(('shoot-start', allDay)),
        label: l10n.calendarShootStarts,
        value: start,
        withTime: !allDay,
        required: true,
        onChanged: (value) => setState(() => start = value),
      ),
      DateField(
        key: ValueKey(('shoot-end', allDay)),
        label: l10n.calendarShootEnds,
        value: end,
        withTime: !allDay,
        onChanged: (value) => setState(() => end = value),
      ),
      FormField<void>(
        validator: (_) {
          final from = start;
          final to = end;
          if (from == null || to == null) return null;
          final (first, last) = normalized(from, to);
          return last != null && last.isBefore(first) ? l10n.calendarEndBeforeStart : null;
        },
        builder: (field) => field.hasError
            ? Text(field.errorText ?? '', style: TextStyle(color: Theme.of(context).colorScheme.error))
            : const SizedBox.shrink(),
      ),
      SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(l10n.calendarShootCreateFolders),
        subtitle: Text(l10n.calendarShootCreateFoldersHint),
        value: createFolders,
        onChanged: (value) => setState(() => createFolders = value),
      ),
      if (googleConnected && typeSyncAllowed)
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(l10n.calendarGoogleSyncEvent),
          subtitle: Text(l10n.calendarGoogleSyncEventHint, style: Theme.of(context).textTheme.bodySmall),
          value: syncToGoogle,
          onChanged: (value) => setState(() => syncToGoogle = value),
        ),
      TextFormField(
        controller: tasks,
        minLines: 3,
        maxLines: 6,
        textCapitalization: TextCapitalization.sentences,
        decoration: InputDecoration(
          labelText: l10n.calendarShootTasks,
          hintText: l10n.calendarShootTasksHint,
          alignLabelWithHint: true,
        ),
      ),
    ],
    onSubmit: () async {
      final from = start;
      final selectedClient = client;
      if (from == null || selectedClient == null || selectedClient.isEmpty) return;
      final (first, last) = normalized(from, end);
      final taskTitles = tasks.text
          .split(RegExp(r'[\r\n]+'))
          .map((line) => line.trim())
          .where((line) => line.isNotEmpty)
          .take(20)
          .toList();
      await actions.createShoot(
        CreateShootInput(
          title: title.text.trim(),
          startsAt: first,
          endsAt: last,
          allDay: allDay,
          clientId: selectedClient,
          projectId: project,
          createFolders: createFolders,
          taskTitles: taskTitles,
          syncToGoogle: googleConnected && typeSyncAllowed ? syncToGoogle : false,
        ),
      );
    },
  );
  return saved;
}
