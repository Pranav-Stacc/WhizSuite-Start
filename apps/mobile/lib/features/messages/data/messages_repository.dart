import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/feedback_models.dart';

/// Feedback threads and per-subject comments. Permissions follow the API's
/// `@RequirePermissions`: reads need feedback.view, every write needs feedback.create.
class MessagesRepository {
  MessagesRepository(this._api);

  final ApiClient _api;

  String _comments(FeedbackSubject subject) => _api.org('feedback/subjects/${subject.type}/${subject.id}/comments');

  /// feedback.view — newest first, capped by the server's list limit.
  Future<List<FeedbackThread>> threads() async =>
      jsonList(await _api.get<Object?>(_api.org('feedback/threads'))).map(FeedbackThread.fromJson).toList();

  /// feedback.view
  Future<FeedbackThread> thread(String id) async =>
      FeedbackThread.fromJson(jsonObject(await _api.get<Object?>(_api.org('feedback/threads/$id'))));

  /// feedback.view — oldest first, across every thread of the subject.
  Future<List<FeedbackComment>> comments(FeedbackSubject subject) async =>
      jsonList(await _api.get<Object?>(_comments(subject))).map(FeedbackComment.fromJson).toList();

  /// feedback.create — appends to the subject's open thread, opening one when none is.
  Future<FeedbackComment> addComment(FeedbackSubject subject, String body) async =>
      FeedbackComment.fromJson(jsonObject(await _api.post<Object?>(_comments(subject), body: {'body': body})));

  /// content.view — ids of the content the member can read (client-scoped by the API).
  Future<Set<String>> contentIds() async =>
      {for (final item in jsonList(await _api.get<Object?>(_api.org('content')))) item.str('id')};

  /// feedback.create (the API gates status changes with the create permission).
  Future<void> setStatus(String threadId, String status) =>
      _api.patch<Object?>(_api.org('feedback/threads/$threadId'), body: {'status': status});
}

final messagesRepositoryProvider = Provider<MessagesRepository>(
  (ref) => MessagesRepository(ref.watch(apiClientProvider)),
);
