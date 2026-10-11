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
import '../domain/calendar_entry.dart';
import '../domain/calendar_item.dart';
import 'calendar_source.dart';

const _defaultStartHour = 9;
const _endOfDayHour = 23;
const _endOfDayMinute = 59;

/// Create (when [item] is null) or edit a calendar item; [day] preselects the date of a new one.
/// Resolves to true when saved.
Future<bool> showCalendarItemForm(BuildContext context, WidgetRef ref, {CalendarItem? item, DateTime? day}) async {
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
  final title = TextEditingController(text: item?.title);
  final initialDay = day ?? dayOf(DateTime.now());

  var type = item?.sourceType ?? CalendarSourceTypes.manual;
  var allDay = item?.allDay ?? false;
  DateTime? start = item?.startsAt.toLocal() ??
      DateTime(initialDay.year, initialDay.month, initialDay.day, _defaultStartHour);
  var end = item?.endsAt?.toLocal();
  var visibility = item?.visibility ?? Visibilities.internal;
  var client = item?.clientId;
  var project = item?.projectId;
  final google = await ref.read(googleCalendarConnectionProvider.future);
  if (!context.mounted) return false;
  final googleConnected = google.isConnected;
  final typeForSync = item?.sourceType ?? CalendarSourceTypes.manual;
  final typeSyncAllowed = google.syncTypes.allowsSourceType(typeForSync);
  var syncToGoogle = item?.syncToGoogle ??
      (googleConnected && google.defaultSyncNewEvents && typeSyncAllowed);

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

  /// All-day items run from the start of the first day to the end of the last.
  (DateTime, DateTime?) normalized(DateTime from, DateTime? to) {
    if (!allDay) return (from, to);
    final first = dayOf(from);
    final last = to == null ? null : dayOf(to);
    return (first, last == null ? null : DateTime(last.year, last.month, last.day, _endOfDayHour, _endOfDayMinute));
  }

  final saved = await showFormSheet(
    context,
    title: item == null ? l10n.calendarNew : l10n.calendarEdit,
    submitLabel: item == null ? l10n.create : l10n.save,
    fields: (context, setState) => [
      TextFormField(
        controller: title,
        autofocus: item == null,
        textCapitalization: TextCapitalization.sentences,
        textInputAction: TextInputAction.next,
        decoration: InputDecoration(labelText: l10n.calendarTitleLabel, hintText: l10n.calendarTitleHint),
        maxLength: resourceNameMaxLength,
        validator: validators.required,
      ),
      if (item == null)
        OptionField<String>(
          label: l10n.calendarTypeLabel,
          value: type,
          options: creatableCalendarSourceTypes,
          labelOf: (t) => calendarSourceLabel(l10n, t),
          onChanged: (value) => setState(() => type = value ?? type),
        )
      else
        InputDecorator(
          decoration: InputDecoration(labelText: l10n.calendarTypeLabel, enabled: false),
          child: Text(calendarSourceLabel(l10n, item.sourceType)),
        ),
      SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(l10n.calendarAllDay),
        value: allDay,
        onChanged: (value) => setState(() => allDay = value),
      ),
      DateField(
        key: ValueKey(('start', allDay)),
        label: l10n.calendarStarts,
        value: start,
        withTime: !allDay,
        required: true,
        onChanged: (value) => setState(() => start = value),
      ),
      DateField(
        key: ValueKey(('end', allDay)),
        label: l10n.calendarEnds,
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
      OptionField<String>(
        label: l10n.calendarVisibilityLabel,
        value: visibility,
        options: Visibilities.values,
        labelOf: l10n.calendarVisibility,
        onChanged: (value) => setState(() => visibility = value ?? visibility),
      ),
      if (item == null)
        OptionField<String>(
          key: ValueKey(('client', client)),
          label: l10n.calendarClient,
          value: client,
          options: clientOptions,
          allowNone: true,
          labelOf: (id) => clients.nameOf(id) ?? l10n.valueUnknown,
          onChanged: (value) => setState(() {
            client = value;
            final current = project;
            if (current != null && value != null && projects[current]?.parentId != value) project = null;
          }),
        )
      else if (item.clientId != null)
        InputDecorator(
          decoration: InputDecoration(
            labelText: l10n.calendarClient,
            helperText: l10n.calendarClientLocked,
            enabled: false,
          ),
          child: Text(clients.nameOf(item.clientId ?? '') ?? l10n.valueUnknown),
        ),
      OptionField<String>(
        key: ValueKey(('project', client)),
        label: l10n.calendarProject,
        value: project,
        options: projectOptions(),
        allowNone: true,
        labelOf: (id) => projects.nameOf(id) ?? l10n.valueUnknown,
        onChanged: (value) => setState(() {
          project = value;
          final owner = value == null ? null : projects[value]?.parentId;
          if (item == null && owner != null) client = owner;
        }),
      ),
      if (googleConnected && typeSyncAllowed)
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(l10n.calendarGoogleSyncEvent),
          subtitle: Text(l10n.calendarGoogleSyncEventHint, style: Theme.of(context).textTheme.bodySmall),
          value: syncToGoogle,
          onChanged: (value) => setState(() => syncToGoogle = value),
        ),
    ],
    onSubmit: () async {
      final from = start;
      if (from == null) return;
      final (first, last) = normalized(from, end);
      final input = CalendarItemInput(
        title: title.text.trim(),
        sourceType: type,
        startsAt: first,
        endsAt: last,
        allDay: allDay,
        visibility: visibility,
        clientId: item == null ? client : null,
        projectId: project,
        syncToGoogle: googleConnected && typeSyncAllowed ? syncToGoogle : false,
      );
      if (item == null) {
        await actions.create(input);
      } else {
        await actions.update(item, input);
      }
    },
  );
  return saved;
}
