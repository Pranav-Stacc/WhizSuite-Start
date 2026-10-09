import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../clients/clients_routes.dart';
import '../../content/content_routes.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../../projects/projects_routes.dart';
import '../../tasks/presentation/entity_link.dart';
import '../../tasks/presentation/task_status.dart';
import '../../tasks/tasks_routes.dart';
import '../domain/calendar_entry.dart';
import 'calendar_form.dart';
import 'calendar_source.dart';

/// Details of one calendar entry, with edit for stored items and links to the source.
Future<void> showCalendarEntrySheet(BuildContext context, CalendarEntry entry) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _EntrySheet(entry: entry),
    );

/// Date (and time) span of an entry for detail views.
String entryWhenLabel(BuildContext context, CalendarEntry entry) {
  final l10n = AppLocalizations.of(context);
  final formats = context.formats;
  final end = entry.end;
  if (entry.allDay) {
    return entry.spansDays
        ? l10n.calendarTimeRange(formats.date(entry.firstDay), formats.date(entry.lastDay))
        : formats.date(entry.start);
  }
  if (end == null || !end.isAfter(entry.start)) return formats.dateTime(entry.start);
  return entry.spansDays
      ? l10n.calendarTimeRange(formats.dateTime(entry.start), formats.dateTime(end))
      : l10n.calendarTimeRange(formats.dateTime(entry.start), formats.time(end));
}

class _EntrySheet extends ConsumerWidget {
  const _EntrySheet({required this.entry});

  static const _maxWidth = 640.0;

  final CalendarEntry entry;

  void _go(BuildContext context, String location) {
    final router = GoRouter.of(context);
    Navigator.of(context).pop();
    router.push(location);
  }

  Future<void> _edit(BuildContext context, WidgetRef ref) async {
    final item = entry.item;
    if (item == null) return;
    final l10n = AppLocalizations.of(context);
    final navigator = Navigator.of(context);
    final saved = await showCalendarItemForm(context, ref, item: item);
    if (!saved || !context.mounted) return;
    showToast(context, l10n.savedToast);
    navigator.pop();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final projects = ref.watch(projectDirectoryProvider).value ?? Directory.empty;
    final tone = calendarSourceTone(entry.sourceType);
    final item = entry.item;
    final clientId = entry.clientId;
    final projectId = entry.projectId;
    final clientName = clientId == null ? null : clients.nameOf(clientId);
    final projectName = projectId == null ? null : projects.nameOf(projectId);
    final taskId = entry.taskId;
    final contentId = entry.contentId;
    final status = entry.status;

    return Center(
      heightFactor: 1,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: _maxWidth),
        child: ListView(
          shrinkWrap: true,
          padding: EdgeInsets.fromLTRB(tokens.xl, 0, tokens.xl, tokens.xl),
          children: [
            Row(
              children: [
                Icon(calendarSourceIcon(entry.sourceType), color: tone.color(tokens)),
                SizedBox(width: tokens.sm),
                StatusBadge(label: calendarSourceLabel(l10n, entry.sourceType), tone: tone),
                if (item != null) ...[
                  SizedBox(width: tokens.sm),
                  Flexible(
                    child: StatusBadge(
                      label: l10n.calendarVisibility(item.visibility),
                      tone: item.visibility == Visibilities.clientVisible ? StatusTone.info : StatusTone.neutral,
                    ),
                  ),
                ],
                if (taskId != null && status != null) ...[
                  SizedBox(width: tokens.sm),
                  Flexible(child: StatusBadge(label: taskStatusLabel(l10n, status), tone: taskStatusTone(status))),
                ],
              ],
            ),
            SizedBox(height: tokens.md),
            Semantics(header: true, child: Text(entry.title, style: text.titleLarge)),
            SizedBox(height: tokens.lg),
            InfoRow(icon: Icons.schedule, label: l10n.calendarWhen, value: Text(entryWhenLabel(context, entry))),
            if (clientId != null && clientName != null)
              InfoRow(
                icon: Icons.business_outlined,
                label: l10n.calendarClient,
                value: EntityLink(
                  label: clientName,
                  semanticLabel: l10n.calendarOpenClient(clientName),
                  onTap: () => _go(context, ClientsRoutes.detail(clientId)),
                ),
              ),
            if (projectId != null && projectName != null)
              InfoRow(
                icon: Icons.folder_outlined,
                label: l10n.calendarProject,
                value: EntityLink(
                  label: projectName,
                  semanticLabel: l10n.calendarOpenProject(projectName),
                  onTap: () => _go(context, ProjectsRoutes.detail(projectId)),
                ),
              ),
            SizedBox(height: tokens.lg),
            Wrap(
              spacing: tokens.sm,
              runSpacing: tokens.sm,
              children: [
                if (item != null)
                  PermissionGate(
                    anyOf: const [Permissions.projectsEdit],
                    child: FilledButton.icon(
                      onPressed: () => _edit(context, ref),
                      icon: const Icon(Icons.edit_outlined),
                      label: Text(l10n.calendarEdit),
                    ),
                  ),
                if (taskId != null)
                  OutlinedButton.icon(
                    onPressed: () => _go(context, TasksRoutes.detail(taskId)),
                    icon: const Icon(Icons.open_in_new),
                    label: Text(l10n.calendarOpenTask),
                  ),
                if (contentId != null)
                  OutlinedButton.icon(
                    onPressed: () => _go(context, ContentRoutes.detail(contentId)),
                    icon: const Icon(Icons.open_in_new),
                    label: Text(l10n.calendarOpenContent),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}