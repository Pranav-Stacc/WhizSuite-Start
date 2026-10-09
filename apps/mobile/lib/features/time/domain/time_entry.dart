import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// A finished block of tracked time.
class TimeEntry {
  const TimeEntry({
    required this.id,
    required this.minutes,
    required this.startedAt,
    required this.billable,
    this.userId,
    this.projectId,
    this.clientId,
    this.taskId,
    this.note,
  });

  factory TimeEntry.fromJson(Json json) => TimeEntry(
    id: json.str('id'),
    userId: json.strOrNull('userId'),
    projectId: json.strOrNull('projectId'),
    clientId: json.strOrNull('clientId'),
    taskId: json.strOrNull('taskId'),
    minutes: json.integer('minutes'),
    startedAt: (json.date('startedAt') ?? DateTime.now()).toLocal(),
    note: json.strOrNull('note'),
    billable: json.flag('billable', true),
  );

  final String id;
  final String? userId;
  final String? projectId;
  final String? clientId;
  final String? taskId;
  final int minutes;
  final DateTime startedAt;
  final String? note;
  final bool billable;

  /// Local calendar day the work happened.
  DateTime get day => DateTime(startedAt.year, startedAt.month, startedAt.day);
}

/// The caller's timer that has been started but not stopped.
class RunningTimer {
  const RunningTimer({required this.id, required this.startedAt, this.taskId, this.projectId, this.clientId});

  factory RunningTimer.fromJson(Json json) => RunningTimer(
    id: json.str('id'),
    taskId: json.strOrNull('taskId'),
    projectId: json.strOrNull('projectId'),
    clientId: json.strOrNull('clientId'),
    startedAt: (json.date('startedAt') ?? DateTime.now()).toLocal(),
  );

  final String id;
  final String? taskId;
  final String? projectId;
  final String? clientId;
  final DateTime startedAt;

  /// Time on the clock at [now]; never negative even if device clocks disagree.
  Duration elapsed(DateTime now) {
    final value = now.difference(startedAt);
    return value.isNegative ? Duration.zero : value;
  }
}

/// A task the timer can run against.
class TaskOption {
  const TaskOption({
    required this.id,
    required this.title,
    required this.status,
    this.projectId,
    this.assigneeUserIds = const [],
  });

  factory TaskOption.fromJson(Json json) => TaskOption(
    id: json.str('id'),
    title: json.str('title'),
    status: json.str('status'),
    projectId: json.strOrNull('projectId'),
    assigneeUserIds: json.strings('assigneeUserIds'),
  );

  final String id;
  final String title;
  final String status;
  final String? projectId;
  final List<String> assigneeUserIds;

  bool get isOpen => status != TaskStatuses.done;

  bool isAssignedTo(String userId) => assigneeUserIds.contains(userId);
}

/// Manually logged time.
class TimeEntryInput {
  const TimeEntryInput({
    required this.date,
    required this.minutes,
    this.projectId,
    this.taskId,
    this.note,
    this.billable = true,
  });

  /// Logged entries are stamped at local midday so the calendar day survives any timezone.
  static const _stampHour = 12;

  final DateTime date;
  final int minutes;
  final String? projectId;
  final String? taskId;
  final String? note;
  final bool billable;

  Json toJson() => {
    'date': DateTime(date.year, date.month, date.day, _stampHour).toUtc().toIso8601String(),
    'minutes': minutes,
    'projectId': ?projectId,
    'taskId': ?taskId,
    'note': ?note,
    'billable': billable,
  };
}
