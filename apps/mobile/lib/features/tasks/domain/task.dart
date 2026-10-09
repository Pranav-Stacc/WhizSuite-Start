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
    required this.projectId,
    required this.title,
    required this.status,
    required this.priority,
    required this.createdAt,
    this.description = '',
    this.dueDate,
    this.estimateMinutes,
    this.assigneeUserId,
  });

  factory Task.fromJson(Json json) {
    final status = json.str('status');
    final priority = json.str('priority');
    return Task(
      id: json.str('id'),
      projectId: json.str('projectId'),
      title: json.str('title'),
      description: json.str('description'),
      status: TaskStatuses.values.contains(status) ? status : (_legacyStatuses[status] ?? TaskStatuses.todo),
      priority: Priorities.values.contains(priority) ? priority : Priorities.medium,
      dueDate: readDateOnly(json, 'dueDate'),
      estimateMinutes: json.integerOrNull('estimateMinutes'),
      assigneeUserId: json.strings('assigneeUserIds').firstOrNull,
      createdAt: json.date('createdAt') ?? DateTime.now(),
    );
  }

  /// Statuses older data may still carry, mapped onto the current board columns.
  static const _legacyStatuses = {'BLOCKED': TaskStatuses.inProgress};

  final String id;
  final String projectId;
  final String title;
  final String description;
  final String status;
  final String priority;
  final DateTime? dueDate;
  final int? estimateMinutes;
  final String? assigneeUserId;
  final DateTime createdAt;

  bool get isDone => status == TaskStatuses.done;

  /// Open and due before today.
  bool isOverdue(DateTime now) {
    final due = dueDate;
    return !isDone && due != null && due.isBefore(DateTime(now.year, now.month, now.day));
  }

  Task withStatus(String next) => Task(
        id: id,
        projectId: projectId,
        title: title,
        description: description,
        status: next,
        priority: priority,
        dueDate: dueDate,
        estimateMinutes: estimateMinutes,
        assigneeUserId: assigneeUserId,
        createdAt: createdAt,
      );
}

/// Fields of a new task (`POST tasks`).
class TaskInput {
  const TaskInput({
    required this.projectId,
    required this.title,
    required this.priority,
    this.description,
    this.status,
    this.dueDate,
    this.estimateMinutes,
    this.assigneeUserId,
  });

  final String projectId;
  final String title;
  final String priority;
  final String? description;
  final String? status;
  final DateTime? dueDate;
  final int? estimateMinutes;
  final String? assigneeUserId;

  Json toJson() {
    final due = dueDate;
    return {
      'projectId': projectId,
      'title': title,
      'priority': priority,
      'description': ?description,
      'status': ?status,
      'dueDate': ?(due == null ? null : dateKey(due)),
      'estimateMinutes': ?estimateMinutes,
      'assigneeUserId': ?assigneeUserId,
    };
  }
}

/// Partial update (`PATCH tasks/:id`). Status changes go through the transition endpoint instead.
class TaskPatch {
  const TaskPatch({
    this.projectId,
    this.title,
    this.description,
    this.priority,
    this.dueDate,
    this.estimateMinutes,
    this.assigneeUserId,
    this.setsAssignee = false,
  });

  /// Only (re)assigns; a null [userId] unassigns.
  const TaskPatch.assign(String? userId) : this(assigneeUserId: userId, setsAssignee: true);

  final String? projectId;
  final String? title;
  final String? description;
  final String? priority;
  final DateTime? dueDate;
  final int? estimateMinutes;
  final String? assigneeUserId;

  /// Sends [assigneeUserId] even when null, which the API treats as "unassign".
  final bool setsAssignee;

  Json toJson() {
    final due = dueDate;
    return {
      'projectId': ?projectId,
      'title': ?title,
      'description': ?description,
      'priority': ?priority,
      'dueDate': ?(due == null ? null : dateKey(due)),
      'estimateMinutes': ?estimateMinutes,
      if (setsAssignee) 'assigneeUserId': assigneeUserId,
    };
  }
}
