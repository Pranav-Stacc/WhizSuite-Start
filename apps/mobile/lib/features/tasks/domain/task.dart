import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

const int _dateKeyLength = 10;
const int minutesPerHour = 60;

/// Calendar day of a date-only API field (`2026-10-09` or `2026-10-09T00:00:00.000Z`) as local midnight,
/// so the day never shifts with the device's UTC offset.
DateTime? readDateOnly(Json json, String key) {
  final raw = json.strOrNull(key);
  if (raw == null || raw.length < _dateKeyLength) return null;
  final parsed = DateTime.tryParse(raw.substring(0, _dateKeyLength));
  return parsed == null ? null : DateTime(parsed.year, parsed.month, parsed.day);
}

/// Whole minutes for an hours value typed in a form; null when empty or invalid.
int? minutesFromHours(String raw) {
  final hours = double.tryParse(raw.trim().replaceAll(',', '.'));
  if (hours == null || hours < 0 || hours.isNaN || hours.isInfinite) return null;
  return (hours * minutesPerHour).round();
}

/// Hours text for a form field (`1.5`, `2`).
String hoursFromMinutes(int minutes) {
  final hours = minutes / minutesPerHour;
  return hours == hours.roundToDouble() ? hours.toInt().toString() : hours.toStringAsFixed(2).replaceFirst(RegExp(r'0$'), '');
}

class Task {
  const Task({
    required this.id,
    required this.title,
    required this.status,
    required this.priority,
    required this.createdAt,
    this.projectId,
    this.clientId,
    this.description = '',
    this.dueDate,
    this.estimateMinutes,
    this.assigneeUserIds = const [],
    this.contentItemId,
  });

  factory Task.fromJson(Json json) {
    final status = json.str('status');
    final priority = json.str('priority');
    return Task(
      id: json.str('id'),
      projectId: json.strOrNull('projectId'),
      clientId: json.strOrNull('clientId'),
      title: json.str('title'),
      description: json.str('description'),
      status: TaskStatuses.values.contains(status) ? status : (_legacyStatuses[status] ?? TaskStatuses.todo),
      priority: Priorities.values.contains(priority) ? priority : Priorities.medium,
      dueDate: readDateOnly(json, 'dueDate'),
      estimateMinutes: json.integerOrNull('estimateMinutes'),
      assigneeUserIds: json.strings('assigneeUserIds'),
      contentItemId: json.strOrNull('contentItemId'),
      createdAt: json.date('createdAt') ?? DateTime.now(),
    );
  }

  /// Statuses older data may still carry, mapped onto the current board columns.
  static const _legacyStatuses = {'BLOCKED': TaskStatuses.inProgress};

  final String id;
  final String? projectId;
  final String? clientId;
  final String title;
  final String description;
  final String status;
  final String priority;
  final DateTime? dueDate;
  final int? estimateMinutes;
  final List<String> assigneeUserIds;
  final String? contentItemId;
  final DateTime createdAt;

  /// First assignee for compact UI; prefer [assigneeUserIds] for filters and edits.
  String? get assigneeUserId => assigneeUserIds.firstOrNull;

  bool get isDone => status == TaskStatuses.done;

  /// Open and due before today.
  bool isOverdue(DateTime now) {
    final due = dueDate;
    return !isDone && due != null && due.isBefore(DateTime(now.year, now.month, now.day));
  }

  Task withStatus(String next) => Task(
        id: id,
        projectId: projectId,
        clientId: clientId,
        title: title,
        description: description,
        status: next,
        priority: priority,
        dueDate: dueDate,
        estimateMinutes: estimateMinutes,
        assigneeUserIds: assigneeUserIds,
        contentItemId: contentItemId,
        createdAt: createdAt,
      );
}

/// Fields of a new task (`POST tasks`).
class TaskInput {
  const TaskInput({
    required this.title,
    required this.priority,
    this.projectId,
    this.clientId,
    this.description,
    this.status,
    this.dueDate,
    this.estimateMinutes,
    this.assigneeUserIds = const [],
    this.contentItemId,
  });

  final String? projectId;
  final String? clientId;
  final String title;
  final String priority;
  final String? description;
  final String? status;
  final DateTime? dueDate;
  final int? estimateMinutes;
  final List<String> assigneeUserIds;
  final String? contentItemId;

  Json toJson() {
    final due = dueDate;
    return {
      if (projectId != null) 'projectId': projectId,
      if (clientId != null) 'clientId': clientId,
      'title': title,
      'priority': priority,
      'description': ?description,
      'status': ?status,
      'dueDate': ?(due == null ? null : dateKey(due)),
      'estimateMinutes': ?estimateMinutes,
      'assigneeUserIds': assigneeUserIds,
      'contentItemId': ?contentItemId,
    };
  }
}

/// Partial update (`PATCH tasks/:id`). Status changes go through the transition endpoint instead.
class TaskPatch {
  const TaskPatch({
    this.projectId,
    this.clearProject = false,
    this.clientId,
    this.clearClient = false,
    this.title,
    this.description,
    this.priority,
    this.dueDate,
    this.estimateMinutes,
    this.assigneeUserIds,
    this.setsAssignees = false,
  });

  /// Replaces the full assignee set (empty list unassigns everyone).
  const TaskPatch.assignAll(List<String> userIds) : this(assigneeUserIds: userIds, setsAssignees: true);

  final String? projectId;
  final bool clearProject;
  final String? clientId;
  final bool clearClient;
  final String? title;
  final String? description;
  final String? priority;
  final DateTime? dueDate;
  final int? estimateMinutes;
  final List<String>? assigneeUserIds;

  /// Sends [assigneeUserIds] even when empty, which the API treats as "unassign all".
  final bool setsAssignees;

  Json toJson() {
    final due = dueDate;
    return {
      if (clearProject) 'projectId': null else if (projectId != null) 'projectId': projectId,
      if (clearClient) 'clientId': null else if (clientId != null) 'clientId': clientId,
      'title': ?title,
      'description': ?description,
      'priority': ?priority,
      'dueDate': ?(due == null ? null : dateKey(due)),
      'estimateMinutes': ?estimateMinutes,
      if (setsAssignees) 'assigneeUserIds': assigneeUserIds ?? const <String>[],
    };
  }
}
