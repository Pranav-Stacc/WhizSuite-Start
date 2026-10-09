import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

DateTime? _calendarDay(DateTime? value) => value == null ? null : DateTime(value.year, value.month, value.day);

/// Client brand card for the portal greeting.
class PortalClient {
  const PortalClient({required this.id, required this.name, this.status});

  factory PortalClient.fromJson(Json json) => PortalClient(
        id: json.str('id'),
        name: json.strOrNull('displayName') ?? json.str('name'),
        status: json.strOrNull('status'),
      );

  final String id;
  final String name;
  final String? status;
}

class PortalContent {
  const PortalContent({
    required this.id,
    required this.title,
    required this.status,
    this.scheduledAt,
    this.updatedAt,
  });

  factory PortalContent.fromJson(Json json) => PortalContent(
        id: json.str('id'),
        title: json.str('title'),
        status: json.str('status', ContentStatuses.draft),
        scheduledAt: json.date('scheduledAt'),
        updatedAt: json.date('updatedAt') ?? json.date('createdAt'),
      );

  final String id;
  final String title;
  final String status;
  final DateTime? scheduledAt;
  final DateTime? updatedAt;

  bool get awaitingReview => status == ContentStatuses.inReview;
  bool get isClientVisible => status != ContentStatuses.draft;
}

class PortalInvoice {
  const PortalInvoice({
    required this.id,
    required this.number,
    required this.status,
    required this.currency,
    required this.totalMinor,
    this.dueDate,
  });

  factory PortalInvoice.fromJson(Json json) => PortalInvoice(
        id: json.str('id'),
        number: json.str('number'),
        status: json.str('status', InvoiceStatuses.draft),
        currency: json.str('currency'),
        totalMinor: json.integer('totalMinor'),
        dueDate: _calendarDay(json.date('dueDate')),
      );

  final String id;
  final String number;
  final String status;
  final String currency;
  final int totalMinor;
  final DateTime? dueDate;

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

class PortalProject {
  const PortalProject({required this.id, required this.name, required this.status});

  factory PortalProject.fromJson(Json json) => PortalProject(
        id: json.str('id'),
        name: json.str('name'),
        status: json.str('status', ProjectStatuses.planning),
      );

  final String id;
  final String name;
  final String status;

  bool get isActive => status == ProjectStatuses.active || status == ProjectStatuses.planning;
}

class PortalThread {
  const PortalThread({
    required this.id,
    required this.subjectType,
    required this.subjectId,
    required this.status,
    this.updatedAt,
  });

  factory PortalThread.fromJson(Json json) => PortalThread(
        id: json.str('id'),
        subjectType: json.str('subjectType', FeedbackSubjectTypes.client),
        subjectId: json.str('subjectId'),
        status: json.str('status', FeedbackThreadStatuses.open),
        updatedAt: json.date('updatedAt') ?? json.date('createdAt'),
      );

  final String id;
  final String subjectType;
  final String subjectId;
  final String status;
  final DateTime? updatedAt;

  bool get isOpen => status == FeedbackThreadStatuses.open;
}
