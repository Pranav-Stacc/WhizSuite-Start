import '../../../core/contracts/contracts.g.dart';
import '../../dashboard/domain/dashboard_models.dart';
import '../../dashboard/domain/dashboard_summaries.dart';
import '../../notifications/domain/app_notification.dart';
import '../../notifications/presentation/notification_links.dart';
import '../../approvals/approvals_routes.dart';
import '../../calendar/calendar_routes.dart';
import '../../content/content_routes.dart';
import '../../invoices/invoices_routes.dart';
import '../../tasks/tasks_routes.dart';
import 'pulse_models.dart';

DateTime _startOfDay(DateTime value) => DateTime(value.year, value.month, value.day);

bool _isToday(DateTime at, DateTime now) {
  final day = _startOfDay(at.toLocal());
  final today = _startOfDay(now);
  return day == today;
}

bool _isAfterTodayBeforeHorizon(DateTime at, DateTime now, int days) {
  final start = _startOfDay(now).add(const Duration(days: 1));
  final end = _startOfDay(now).add(Duration(days: days));
  final day = _startOfDay(at.toLocal());
  return !day.isBefore(start) && day.isBefore(end);
}

PulseDigest assemblePulseDigest({
  required DateTime now,
  required bool ready,
  MyWorkSummary? work,
  ApprovalSummary? approvals,
  List<UpcomingItem>? upcoming,
  List<CalendarEntry>? calendar,
  List<ContentRef>? content,
  List<InvoiceRef>? invoices,
  List<AppNotification>? notifications,
  Map<String, String>? contentTitles,
}) {
  final today = <PulseItem>[];
  final weekAhead = <PulseItem>[];
  final inbox = <PulseItem>[];
  final counts = <PulseKind, int>{};

  void bump(PulseKind kind) => counts[kind] = (counts[kind] ?? 0) + 1;

  if (work != null) {
    for (final task in work.tasks) {
      final due = task.dueDate;
      final overdue = due != null && due.isBefore(_startOfDay(now));
      final dueToday = due != null && _isToday(due, now);
      if (!overdue && !dueToday) continue;
      final item = PulseItem(
        id: 'task-${task.id}',
        kind: PulseKind.task,
        title: task.title,
        route: TasksRoutes.detail(task.id),
        at: due,
        urgent: overdue || task.priority == Priorities.urgent || task.priority == Priorities.high,
      );
      today.add(item);
      bump(PulseKind.task);
    }
  }

  if (approvals != null) {
    for (final approval in approvals.pending.take(8)) {
      final due = approval.dueAt;
      final onToday = due != null && _isToday(due, now);
      final overdue = due != null && due.isBefore(now);
      if (!onToday && !overdue) continue;
      final title = contentTitles?[approval.subjectId] ?? approval.subjectType;
      today.add(
        PulseItem(
          id: 'approval-${approval.id}',
          kind: PulseKind.approval,
          title: title,
          subtitle: approval.stepName,
          route: ApprovalsRoutes.detail(approval.id),
          at: due,
          urgent: overdue,
        ),
      );
      bump(PulseKind.approval);
    }
  }

  if (calendar != null) {
    for (final entry in calendar) {
      final at = entry.startsAt;
      if (at == null) continue;
      final item = PulseItem(
        id: 'cal-${entry.id}',
        kind: PulseKind.calendar,
        title: entry.title,
        route: _calendarRoute(entry),
        at: at,
        allDay: entry.allDay,
        urgent: false,
      );
      if (_isToday(at, now)) {
        today.add(item);
        bump(PulseKind.calendar);
      } else if (_isAfterTodayBeforeHorizon(at, now, dashboardHorizonDays)) {
        weekAhead.add(item);
        bump(PulseKind.calendar);
      }
    }
  }

  if (upcoming != null) {
    for (final item in upcoming) {
      if (_isToday(item.at, now)) {
        if (today.any((t) => t.id == 'up-${item.key}')) continue;
        today.add(
          PulseItem(
            id: 'up-${item.key}',
            kind: item.kind == CalendarSourceTypes.content ? PulseKind.content : PulseKind.calendar,
            title: item.title,
            route: _upcomingRoute(item),
            at: item.allDay ? null : item.at,
            allDay: item.allDay,
          ),
        );
        bump(item.kind == CalendarSourceTypes.content ? PulseKind.content : PulseKind.calendar);
      } else if (_isAfterTodayBeforeHorizon(item.at, now, dashboardHorizonDays)) {
        weekAhead.add(
          PulseItem(
            id: 'up-${item.key}',
            kind: item.kind == CalendarSourceTypes.content ? PulseKind.content : PulseKind.calendar,
            title: item.title,
            route: _upcomingRoute(item),
            at: item.at,
            allDay: item.allDay,
          ),
        );
      }
    }
  }

  if (content != null) {
    for (final post in content) {
      final at = post.scheduledAt;
      if (at == null || post.status == ContentStatuses.published) continue;
      if (!_isToday(at, now)) continue;
      if (today.any((t) => t.id == 'content-${post.id}')) continue;
      today.add(
        PulseItem(
          id: 'content-${post.id}',
          kind: PulseKind.content,
          title: post.title,
          subtitle: post.status,
          route: ContentRoutes.detail(post.id),
          at: at,
        ),
      );
      bump(PulseKind.content);
    }
  }

  if (invoices != null) {
    for (final invoice in invoices) {
      final due = invoice.dueDate;
      if (due == null || !invoice.isOpen(now)) continue;
      if (!_isToday(due, now) && !due.isBefore(_startOfDay(now))) continue;
      today.add(
        PulseItem(
          id: 'invoice-${invoice.id}',
          kind: PulseKind.invoice,
          title: invoice.number,
          route: InvoicesRoutes.detail(invoice.id),
          at: due,
          urgent: invoice.effectiveStatus(now) == InvoiceStatuses.overdue,
        ),
      );
      bump(PulseKind.invoice);
    }
  }

  if (notifications != null) {
    final recent = notifications.where((n) => !n.isRead).take(6);
    for (final n in recent) {
      inbox.add(
        PulseItem(
          id: 'notif-${n.id}',
          kind: PulseKind.notification,
          title: n.title,
          subtitle: n.body,
          route: notificationLink(n),
          at: n.createdAt,
        ),
      );
      bump(PulseKind.notification);
    }
  }

  int comparePulse(PulseItem a, PulseItem b) {
    if (a.urgent != b.urgent) return a.urgent ? -1 : 1;
    final at = a.at;
    final bt = b.at;
    if (at == null && bt == null) return a.title.compareTo(b.title);
    if (at == null) return 1;
    if (bt == null) return -1;
    return at.compareTo(bt);
  }

  today.sort(comparePulse);
  weekAhead.sort(comparePulse);
  inbox.sort((a, b) => (b.at ?? now).compareTo(a.at ?? now));

  return PulseDigest(
    now: now,
    today: today,
    weekAhead: weekAhead.take(12).toList(),
    inbox: inbox,
    moduleCounts: counts,
    ready: ready,
  );
}

String _calendarRoute(CalendarEntry entry) => switch (entry.sourceType) {
      CalendarSourceTypes.content => ContentRoutes.detail(entry.sourceId),
      CalendarSourceTypes.task => TasksRoutes.detail(entry.sourceId),
      _ => CalendarRoutes.root,
    };

String _upcomingRoute(UpcomingItem item) => switch (item.kind) {
      CalendarSourceTypes.content => ContentRoutes.detail(item.sourceId),
      CalendarSourceTypes.task => TasksRoutes.detail(item.sourceId),
      _ => CalendarRoutes.root,
    };

/// Plain-text briefing fed to the AI summarizer (or shown as a fallback).
String pulseBriefingSource(PulseDigest digest) {
  final lines = <String>[];
  lines.add('Date: ${digest.now.toIso8601String().split('T').first}');
  lines.add('Today items: ${digest.todayCount}, urgent: ${digest.urgentCount}, unread: ${digest.unreadCount}');
  for (final item in digest.today.take(12)) {
    lines.add('- ${item.kind.name}: ${item.title}${item.subtitle == null ? '' : ' (${item.subtitle})'}');
  }
  for (final item in digest.weekAhead.take(8)) {
    lines.add('- upcoming: ${item.title}');
  }
  for (final item in digest.inbox.take(5)) {
    lines.add('- notification: ${item.title}');
  }
  return lines.join('\n');
}
