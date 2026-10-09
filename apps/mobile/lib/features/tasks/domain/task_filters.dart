import '../../../core/contracts/contracts.g.dart';
import 'task.dart';

/// Quick scopes over the task list, mirroring the web filter chips.
enum TaskScope { mine, unassigned, overdue }

/// Every filter the To-do screen applies; null fields mean "any".
class TaskFilter {
  const TaskFilter({this.scope, this.status, this.priority, this.projectId, this.clientId, this.query = ''});

  final TaskScope? scope;
  final String? status;
  final String? priority;
  final String? projectId;
  final String? clientId;
  final String query;

  bool get isActive =>
      scope != null || status != null || priority != null || projectId != null || clientId != null || query.trim().isNotEmpty;

  TaskFilter copyWith({
    TaskScope? Function()? scope,
    String? Function()? status,
    String? Function()? priority,
    String? Function()? projectId,
    String? Function()? clientId,
    String? query,
  }) =>
      TaskFilter(
        scope: scope == null ? this.scope : scope(),
        status: status == null ? this.status : status(),
        priority: priority == null ? this.priority : priority(),
        projectId: projectId == null ? this.projectId : projectId(),
        clientId: clientId == null ? this.clientId : clientId(),
        query: query ?? this.query,
      );

  /// [clientOf] resolves a task's client through its project.
  bool matches(Task task, {required String? userId, required DateTime now, required String? Function(String projectId) clientOf}) {
    final q = query.trim().toLowerCase();
    if (q.isNotEmpty && !task.title.toLowerCase().contains(q) && !task.description.toLowerCase().contains(q)) return false;
    if (status != null && task.status != status) return false;
    if (priority != null && task.priority != priority) return false;
    if (projectId != null && task.projectId != projectId) return false;
    if (clientId != null && clientOf(task.projectId) != clientId) return false;
    return scope == null || matchesScope(task, scope, userId: userId, now: now);
  }
}

bool matchesScope(Task task, TaskScope? scope, {required String? userId, required DateTime now}) => switch (scope) {
      null => true,
      TaskScope.mine => userId != null && task.assigneeUserId == userId,
      TaskScope.unassigned => task.assigneeUserId == null,
      TaskScope.overdue => task.isOverdue(now),
    };

/// Earliest due first, undated last; ties broken by priority (most urgent first), then title.
int compareByDue(Task a, Task b) {
  final aDue = a.dueDate;
  final bDue = b.dueDate;
  if (aDue != null && bDue != null) {
    final byDate = aDue.compareTo(bDue);
    if (byDate != 0) return byDate;
  } else if (aDue != null) {
    return -1;
  } else if (bDue != null) {
    return 1;
  }
  final byPriority = Priorities.values.indexOf(b.priority).compareTo(Priorities.values.indexOf(a.priority));
  return byPriority != 0 ? byPriority : a.title.toLowerCase().compareTo(b.title.toLowerCase());
}

/// Board columns in workflow order, each sorted by due date; every status is present.
Map<String, List<Task>> groupByStatus(Iterable<Task> tasks) {
  final columns = {for (final status in TaskStatuses.values) status: <Task>[]};
  for (final task in tasks) {
    (columns[task.status] ??= []).add(task);
  }
  for (final column in columns.values) {
    column.sort(compareByDue);
  }
  return columns;
}

/// Optimistic status changes laid over server data until the refreshed list arrives.
List<Task> applyStatusOverrides(List<Task> tasks, Map<String, String> overrides) {
  if (overrides.isEmpty) return tasks;
  return [
    for (final task in tasks)
      switch (overrides[task.id]) {
        final status? when status != task.status => task.withStatus(status),
        _ => task,
      },
  ];
}

/// Sum of estimates in minutes; tasks without an estimate count as zero.
int totalEstimateMinutes(Iterable<Task> tasks) => tasks.fold(0, (sum, task) => sum + (task.estimateMinutes ?? 0));
