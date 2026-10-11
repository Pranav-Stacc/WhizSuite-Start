import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

class GoogleCalendarSyncTypes {
  const GoogleCalendarSyncTypes({
    this.meetings = true,
    this.shoots = true,
    this.tasks = false,
    this.posts = false,
  });

  factory GoogleCalendarSyncTypes.fromJson(Json? json) {
    if (json == null) return const GoogleCalendarSyncTypes();
    return GoogleCalendarSyncTypes(
      meetings: json.flag('meetings', true),
      shoots: json.flag('shoots', true),
      tasks: json.flag('tasks'),
      posts: json.flag('posts'),
    );
  }

  final bool meetings;
  final bool shoots;
  final bool tasks;
  final bool posts;

  GoogleCalendarSyncTypes copyWith({
    bool? meetings,
    bool? shoots,
    bool? tasks,
    bool? posts,
  }) =>
      GoogleCalendarSyncTypes(
        meetings: meetings ?? this.meetings,
        shoots: shoots ?? this.shoots,
        tasks: tasks ?? this.tasks,
        posts: posts ?? this.posts,
      );

  Json toJson() => {
        'meetings': meetings,
        'shoots': shoots,
        'tasks': tasks,
        'posts': posts,
      };

  bool allowsSourceType(String sourceType) {
    final t = sourceType.toUpperCase();
    if (t == 'SHOOT') return shoots;
    if (t == 'TASK') return tasks;
    if (t == 'CONTENT') return posts;
    if (t == 'MEETING' || t == 'MANUAL' || t == 'DEADLINE') return meetings;
    return false;
  }
}
