import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/network/api_client.dart';
import '../../tasks/domain/task.dart';

class Project {
  const Project({
    required this.id,
    required this.clientId,
    required this.name,
    required this.status,
    required this.createdAt,
    this.type,
    this.startDate,
    this.endDate,
    this.budgetMinor,
    this.currency,
    this.ownerUserId,
  });

  factory Project.fromJson(Json json) {
    final status = json.str('status');
    return Project(
      id: json.str('id'),
      clientId: json.str('clientId'),
      name: json.str('name'),
      status: ProjectStatuses.values.contains(status) ? status : (_legacyStatuses[status] ?? ProjectStatuses.active),
      type: json.strOrNull('type'),
      startDate: readDateOnly(json, 'startDate'),
      endDate: readDateOnly(json, 'endDate'),
      budgetMinor: json.integerOrNull('budgetMinor'),
      currency: json.strOrNull('currency'),
      ownerUserId: json.strOrNull('ownerUserId'),
      createdAt: json.date('createdAt') ?? DateTime.now(),
    );
  }

  /// Statuses older data may still carry, mapped onto the current set (same as the web).
  static const _legacyStatuses = {'CANCELLED': ProjectStatuses.onHold};

  final String id;
  final String clientId;
  final String name;
  final String status;
  final String? type;
  final DateTime? startDate;
  final DateTime? endDate;

  /// Integer minor units in [currency].
  final int? budgetMinor;
  final String? currency;
  final String? ownerUserId;
  final DateTime createdAt;

  bool get isCompleted => status == ProjectStatuses.completed;
}

/// Fields a project form edits. [clientId] is only sent on create; the API cannot move a project.
class ProjectInput {
  const ProjectInput({
    required this.name,
    this.clientId,
    this.workspaceId,
    this.type,
    this.status,
    this.startDate,
    this.endDate,
    this.budgetMinor,
    this.ownerUserId,
  });

  final String name;
  final String? clientId;
  final String? workspaceId;
  final String? type;
  final String? status;
  final DateTime? startDate;
  final DateTime? endDate;
  final int? budgetMinor;
  final String? ownerUserId;

  Json toJson() {
    final start = startDate;
    final end = endDate;
    return {
      'clientId': ?clientId,
      if (workspaceId != null) 'workspaceId': workspaceId,
      'name': name,
      'type': ?type,
      'status': ?status,
      'startDate': ?(start == null ? null : dateKey(start)),
      'endDate': ?(end == null ? null : dateKey(end)),
      'budgetMinor': ?budgetMinor,
      'ownerUserId': ?ownerUserId,
    };
  }
}

/// Minor units for an amount typed in major units (`50000`, `1,250.50`); null when empty or invalid.
int? minorFromMajor(String raw) {
  final value = double.tryParse(raw.trim().replaceAll(',', ''));
  if (value == null || value < 0 || value.isNaN || value.isInfinite) return null;
  return (value * AppFormats.minorUnitsPerMajor).round();
}

/// Major-unit text for a form field, without trailing zero decimals.
String majorFromMinor(int minor) {
  final major = minor / AppFormats.minorUnitsPerMajor;
  return major == major.roundToDouble() ? major.toInt().toString() : major.toStringAsFixed(2);
}

/// Done/total task counts for one project.
class ProjectProgress {
  const ProjectProgress({required this.done, required this.total});

  static const empty = ProjectProgress(done: 0, total: 0);

  factory ProjectProgress.of(Iterable<Task> tasks) {
    var done = 0;
    var total = 0;
    for (final task in tasks) {
      total++;
      if (task.isDone) done++;
    }
    return ProjectProgress(done: done, total: total);
  }

  final int done;
  final int total;

  /// 0..1; zero when the project has no tasks.
  double get ratio => total == 0 ? 0 : done / total;

  /// Progress per project id in one pass over the tasks.
  static Map<String, ProjectProgress> byProject(Iterable<Task> tasks) {
    final done = <String, int>{};
    final total = <String, int>{};
    for (final task in tasks) {
      final projectId = task.projectId;
      if (projectId == null) continue;
      total.update(projectId, (n) => n + 1, ifAbsent: () => 1);
      if (task.isDone) done.update(projectId, (n) => n + 1, ifAbsent: () => 1);
    }
    return {
      for (final entry in total.entries) entry.key: ProjectProgress(done: done[entry.key] ?? 0, total: entry.value),
    };
  }
}

/// A piece of the client's content, shown on the project page (`GET content`).
class ProjectContentItem {
  const ProjectContentItem({required this.id, required this.title, required this.status, this.clientId, this.scheduledAt});

  factory ProjectContentItem.fromJson(Json json) => ProjectContentItem(
        id: json.str('id'),
        title: json.str('title'),
        status: json.str('status', ContentStatuses.draft),
        clientId: json.strOrNull('clientId'),
        scheduledAt: json.date('scheduledAt'),
      );

  final String id;
  final String title;
  final String status;
  final String? clientId;
  final DateTime? scheduledAt;
}
