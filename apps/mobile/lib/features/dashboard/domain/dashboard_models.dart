import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// Read-models for the overview screens. Each parses only the fields a summary needs
/// and tolerates missing or mistyped values.

/// Date-only API fields (`@db.Date`) arrive as UTC midnight; keep the calendar day
/// so a due date never shifts across timezones.
DateTime? calendarDay(DateTime? value) => value == null ? null : DateTime(value.year, value.month, value.day);

class WorkTask {
  const WorkTask({
    required this.id,
    required this.title,
    required this.status,
    this.dueDate,
    this.priority = Priorities.medium,
    this.assigneeUserIds = const [],
  });

  factory WorkTask.fromJson(Json json) => WorkTask(
        id: json.str('id'),
        title: json.str('title'),
        status: json.str('status', TaskStatuses.todo),
        dueDate: calendarDay(json.date('dueDate')),
        priority: json.str('priority', Priorities.medium),
        assigneeUserIds: json.strings('assigneeUserIds'),
      );

  final String id;
  final String title;
  final String status;
  final DateTime? dueDate;
  final String priority;
  final List<String> assigneeUserIds;

  bool get isDone => status == TaskStatuses.done;
}

class ContentRef {
  const ContentRef({
    required this.id,
    required this.clientId,
    required this.title,
    required this.status,
    this.scheduledAt,
    this.updatedAt,
  });

  factory ContentRef.fromJson(Json json) => ContentRef(
        id: json.str('id'),
        clientId: json.str('clientId'),
        title: json.str('title'),
        status: json.str('status', ContentStatuses.draft),
        scheduledAt: json.date('scheduledAt'),
        updatedAt: json.date('updatedAt') ?? json.date('createdAt'),
      );

  final String id;
  final String clientId;
  final String title;
  final String status;
  final DateTime? scheduledAt;
  final DateTime? updatedAt;
}

class ApprovalRef {
  const ApprovalRef({
    required this.id,
    required this.subjectType,
    required this.subjectId,
    required this.status,
    this.dueAt,
    this.createdAt,
    this.stepName,
  });

  factory ApprovalRef.fromJson(Json json) {
    final steps = json.objects('steps');
    final pendingStep = steps.where((s) => s.str('status') == ApprovalStatuses.pending).firstOrNull;
    return ApprovalRef(
      id: json.str('id'),
      subjectType: json.str('subjectType'),
      subjectId: json.str('subjectId'),
      status: json.str('status', ApprovalStatuses.pending),
      dueAt: json.date('dueAt') ?? pendingStep?.date('dueAt'),
      createdAt: json.date('createdAt'),
      stepName: pendingStep?.strOrNull('name'),
    );
  }

  final String id;
  final String subjectType;
  final String subjectId;
  final String status;
  final DateTime? dueAt;
  final DateTime? createdAt;

  /// Name of the step currently waiting for a decision.
  final String? stepName;

  bool get isPending => status == ApprovalStatuses.pending;
}

class InvoiceRef {
  const InvoiceRef({
    required this.id,
    required this.number,
    required this.clientId,
    required this.status,
    required this.currency,
    required this.totalMinor,
    this.dueDate,
    this.paidAt,
    this.issueDate,
  });

  factory InvoiceRef.fromJson(Json json) => InvoiceRef(
        id: json.str('id'),
        number: json.str('number'),
        clientId: json.str('clientId'),
        status: json.str('status', InvoiceStatuses.draft),
        currency: json.str('currency'),
        totalMinor: json.integer('totalMinor'),
        dueDate: calendarDay(json.date('dueDate')),
        paidAt: json.date('paidAt'),
        issueDate: json.date('issueDate') ?? json.date('createdAt'),
      );

  final String id;
  final String number;
  final String clientId;
  final String status;
  final String currency;
  final int totalMinor;
  final DateTime? dueDate;
  final DateTime? paidAt;
  final DateTime? issueDate;

  /// Sent invoices past their due day read as overdue, like the web.
  String effectiveStatus(DateTime now) {
    final due = dueDate;
    final today = DateTime(now.year, now.month, now.day);
    if (status == InvoiceStatuses.sent && due != null && due.isBefore(today)) return InvoiceStatuses.overdue;
    return status;
  }

  bool isOpen(DateTime now) {
    final effective = effectiveStatus(now);
    return effective == InvoiceStatuses.sent || effective == InvoiceStatuses.overdue;
  }
}

class CalendarEntry {
  const CalendarEntry({
    required this.id,
    required this.sourceType,
    required this.sourceId,
    required this.title,
    required this.startsAt,
    this.allDay = false,
  });

  factory CalendarEntry.fromJson(Json json) => CalendarEntry(
        id: json.str('id'),
        sourceType: json.str('sourceType', CalendarSourceTypes.manual),
        sourceId: json.str('sourceId'),
        title: json.str('title'),
        startsAt: json.date('startsAt'),
        allDay: json.flag('allDay'),
      );

  final String id;
  final String sourceType;
  final String sourceId;
  final String title;
  final DateTime? startsAt;
  final bool allDay;
}
