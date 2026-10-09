import '../../../core/contracts/contracts.g.dart';
import 'dashboard_models.dart';

/// Days ahead the overview treats as "soon" / "upcoming".
const int dashboardHorizonDays = 7;

/// Months shown in the revenue chart.
const int dashboardRevenueMonths = 6;

/// Rows shown in each overview list before "View all".
const int dashboardListLimit = 5;

DateTime _startOfDay(DateTime value) => DateTime(value.year, value.month, value.day);

/// Most frequent currency, so totals never add amounts in different currencies.
String? dominantCurrency(Iterable<String> currencies) {
  final counts = <String, int>{};
  for (final currency in currencies) {
    if (currency.isEmpty) continue;
    counts[currency] = (counts[currency] ?? 0) + 1;
  }
  String? best;
  var bestCount = 0;
  for (final MapEntry(key: currency, value: count) in counts.entries) {
    if (count > bestCount) {
      best = currency;
      bestCount = count;
    }
  }
  return best;
}

/// The signed-in member's open tasks: overdue first, then by due date, undated last.
class MyWorkSummary {
  const MyWorkSummary({
    required this.open,
    required this.dueToday,
    required this.overdue,
    required this.dueThisWeek,
    required this.tasks,
  });

  factory MyWorkSummary.of(List<WorkTask> tasks, {required String userId, required DateTime now}) {
    final today = _startOfDay(now);
    final horizon = today.add(const Duration(days: dashboardHorizonDays));
    final mine = tasks.where((t) => !t.isDone && t.assigneeUserIds.contains(userId)).toList()
      ..sort((a, b) {
        final ad = a.dueDate;
        final bd = b.dueDate;
        if (ad == null && bd == null) return a.title.compareTo(b.title);
        if (ad == null) return 1;
        if (bd == null) return -1;
        return ad.compareTo(bd);
      });
    var dueToday = 0;
    var overdue = 0;
    var dueThisWeek = 0;
    for (final task in mine) {
      final due = task.dueDate;
      if (due == null) continue;
      if (due.isBefore(today)) {
        overdue++;
      } else if (due == today) {
        dueToday++;
      }
      if (!due.isAfter(horizon)) dueThisWeek++;
    }
    return MyWorkSummary(
      open: mine.length,
      dueToday: dueToday,
      overdue: overdue,
      dueThisWeek: dueThisWeek,
      tasks: mine.take(dashboardListLimit).toList(),
    );
  }

  final int open;
  final int dueToday;
  final int overdue;

  /// Overdue plus due within the horizon.
  final int dueThisWeek;
  final List<WorkTask> tasks;

  int get urgent => dueToday + overdue;
}

class ContentSummary {
  const ContentSummary({required this.inReview, required this.changesRequested});

  factory ContentSummary.of(List<ContentRef> items) => ContentSummary(
        inReview: items.where((c) => c.status == ContentStatuses.inReview).length,
        changesRequested: items.where((c) => c.status == ContentStatuses.changesRequested).length,
      );

  final int inReview;
  final int changesRequested;
}

/// Pending approval requests, soonest deadline first.
class ApprovalSummary {
  const ApprovalSummary({required this.pending, required this.overdue});

  factory ApprovalSummary.of(List<ApprovalRef> approvals, {required DateTime now}) {
    final pending = approvals.where((a) => a.isPending).toList()
      ..sort((a, b) {
        final ad = a.dueAt;
        final bd = b.dueAt;
        if (ad != null && bd != null) return ad.compareTo(bd);
        if (ad != null) return -1;
        if (bd != null) return 1;
        return (a.createdAt ?? now).compareTo(b.createdAt ?? now);
      });
    return ApprovalSummary(
      pending: pending,
      overdue: pending.where((a) => a.dueAt?.isBefore(now) ?? false).length,
    );
  }

  final List<ApprovalRef> pending;
  final int overdue;
}

/// Money still owed, in the dominant currency of open invoices.
class ReceivablesSummary {
  const ReceivablesSummary({
    required this.currency,
    required this.outstandingMinor,
    required this.overdueMinor,
    required this.open,
  });

  factory ReceivablesSummary.of(List<InvoiceRef> invoices, {required DateTime now}) {
    final open = invoices.where((i) => i.isOpen(now)).toList();
    final currency = dominantCurrency(open.map((i) => i.currency));
    final counted = open.where((i) => currency == null || i.currency == currency).toList()
      ..sort((a, b) => (a.dueDate ?? now).compareTo(b.dueDate ?? now));
    var outstanding = 0;
    var overdue = 0;
    for (final invoice in counted) {
      outstanding += invoice.totalMinor;
      if (invoice.effectiveStatus(now) == InvoiceStatuses.overdue) overdue += invoice.totalMinor;
    }
    return ReceivablesSummary(currency: currency, outstandingMinor: outstanding, overdueMinor: overdue, open: counted);
  }

  final String? currency;
  final int outstandingMinor;
  final int overdueMinor;

  /// Open invoices in [currency], earliest due first.
  final List<InvoiceRef> open;
}

typedef MonthTotal = ({DateTime month, int minor});

/// Paid revenue per calendar month for the last [months] months (oldest first),
/// in the dominant currency of paid invoices.
class RevenueSeries {
  const RevenueSeries({required this.currency, required this.months});

  factory RevenueSeries.of(List<InvoiceRef> invoices, {required DateTime now, int months = dashboardRevenueMonths}) {
    final paid = invoices.where((i) => i.status == InvoiceStatuses.paid && i.paidAt != null).toList();
    final currency = dominantCurrency(paid.map((i) => i.currency));
    final buckets = [for (var i = months - 1; i >= 0; i--) DateTime(now.year, now.month - i)];
    final totals = {for (final month in buckets) month: 0};
    for (final invoice in paid) {
      if (currency != null && invoice.currency != currency) continue;
      final at = invoice.paidAt?.toLocal();
      if (at == null) continue;
      final key = DateTime(at.year, at.month);
      final current = totals[key];
      if (current != null) totals[key] = current + invoice.totalMinor;
    }
    return RevenueSeries(currency: currency, months: [for (final month in buckets) (month: month, minor: totals[month] ?? 0)]);
  }

  final String? currency;
  final List<MonthTotal> months;

  int get totalMinor => months.fold(0, (sum, m) => sum + m.minor);
}

typedef StageTotal = ({String stage, int count, int valueMinor});

/// Open pipeline value per stage, in the dominant lead currency. Lost deals are excluded.
class PipelineSummary {
  const PipelineSummary({required this.currency, required this.stages});

  factory PipelineSummary.of(List<LeadRef> leads) {
    final live = leads.where((l) => l.stage != LeadStages.lost).toList();
    final currency = dominantCurrency(live.map((l) => l.currency));
    final counts = <String, int>{};
    final values = <String, int>{};
    for (final lead in live) {
      counts[lead.stage] = (counts[lead.stage] ?? 0) + 1;
      if (currency == null || lead.currency == currency) {
        values[lead.stage] = (values[lead.stage] ?? 0) + lead.valueMinor;
      }
    }
    return PipelineSummary(
      currency: currency,
      stages: [
        for (final stage in LeadStages.values)
          if (stage != LeadStages.lost) (stage: stage, count: counts[stage] ?? 0, valueMinor: values[stage] ?? 0),
      ],
    );
  }

  final String? currency;
  final List<StageTotal> stages;

  /// Value still to be won (everything except won deals).
  int get openMinor => stages.where((s) => s.stage != LeadStages.won).fold(0, (sum, s) => sum + s.valueMinor);

  bool get isEmpty => stages.every((s) => s.count == 0);
}

class ClientSummary {
  const ClientSummary({required this.active, required this.onboarding});

  factory ClientSummary.of(List<ClientRef> clients) => ClientSummary(
        active: clients.where((c) => c.status == ClientStatuses.active).length,
        onboarding: clients.where((c) => c.status == ClientStatuses.onboarding).length,
      );

  final int active;
  final int onboarding;
}

/// Something happening soon: a calendar item or scheduled content.
class UpcomingItem {
  const UpcomingItem({
    required this.key,
    required this.title,
    required this.at,
    required this.kind,
    required this.sourceId,
    this.allDay = false,
  });

  final String key;
  final String title;
  final DateTime at;

  /// One of [CalendarSourceTypes].
  final String kind;
  final String sourceId;
  final bool allDay;
}

/// Calendar items and scheduled content in `[now, now + days)`, soonest first.
/// Content already mirrored on the calendar is listed once.
List<UpcomingItem> upcomingItems({
  required List<CalendarEntry> calendar,
  required List<ContentRef> content,
  required DateTime now,
  int days = dashboardHorizonDays,
}) {
  final start = _startOfDay(now);
  final end = start.add(Duration(days: days));
  bool inWindow(DateTime at) => !at.toLocal().isBefore(start) && at.toLocal().isBefore(end);

  final items = <UpcomingItem>[];
  final seenContent = <String>{};
  for (final entry in calendar) {
    final at = entry.startsAt;
    if (at == null || !inWindow(at)) continue;
    if (entry.sourceType == CalendarSourceTypes.content) seenContent.add(entry.sourceId);
    items.add(UpcomingItem(
      key: 'calendar-${entry.id}',
      title: entry.title,
      at: at,
      kind: entry.sourceType,
      sourceId: entry.sourceId,
      allDay: entry.allDay,
    ));
  }
  for (final post in content) {
    final at = post.scheduledAt;
    if (at == null || !inWindow(at) || post.status == ContentStatuses.published) continue;
    if (!seenContent.add(post.id)) continue;
    items.add(UpcomingItem(
      key: 'content-${post.id}',
      title: post.title,
      at: at,
      kind: CalendarSourceTypes.content,
      sourceId: post.id,
    ));
  }
  return items..sort((a, b) => a.at.compareTo(b.at));
}
