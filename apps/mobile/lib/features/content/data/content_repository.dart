import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/content.dart';

class ContentRepository {
  ContentRepository(this._api);

  static const _aiBase = 'v1/ai';

  final ApiClient _api;

  String get _base => _api.org('content');

  String _comments(String contentId) =>
      _api.org('feedback/subjects/${FeedbackSubjectTypes.content}/$contentId/comments');

  Future<List<Content>> list() async => jsonList(await _api.get<Object?>(_base)).map(Content.fromJson).toList();

  Future<Content> get(String id) async => Content.fromJson(jsonObject(await _api.get<Object?>('$_base/$id')));

  Future<Content> create(ContentInput input, {required String status}) async =>
      Content.fromJson(jsonObject(await _api.post<Object?>(_base, body: input.toCreateJson(status: status))));

  Future<Content> update(String id, ContentInput input, {required int expectedVersion}) async => Content.fromJson(
        jsonObject(await _api.patch<Object?>('$_base/$id', body: input.toUpdateJson(expectedVersion: expectedVersion))),
      );

  /// Sets or clears only the publish date.
  Future<void> setSchedule(String id, DateTime? scheduledAt) =>
      _api.patch<Object?>('$_base/$id', body: {'scheduledAt': scheduledAt?.toUtc().toIso8601String()});

  Future<void> delete(String id) => _api.delete<Object?>('$_base/$id');

  Future<void> transition(String id, String toStatus) =>
      _api.post<Object?>('$_base/$id/transition', body: {'toStatus': toStatus});

  /// Reviewer decision on content awaiting review ([ContentReviewOutcomes]).
  Future<void> review(String id, String outcome) => _api.post<Object?>('$_base/$id/review', body: {'toStatus': outcome});

  /// Saves the client's grid order; the first id becomes the top-left tile.
  Future<void> reorder(String clientId, List<String> orderedIds) =>
      _api.post<Object?>('$_base/reorder', body: {'clientId': clientId, 'orderedIds': orderedIds});

  Future<List<ContentComment>> comments(String contentId) async =>
      jsonList(await _api.get<Object?>(_comments(contentId))).map(ContentComment.fromJson).toList();

  Future<void> addComment(String contentId, String body) => _api.post<Object?>(_comments(contentId), body: {'body': body});

  Future<BrandHints> brandHints(String clientId) async =>
      BrandHints.fromClientJson(jsonObject(await _api.get<Object?>(_api.org('clients/$clientId'))));

  /// Platforms the client has a connected social account for.
  Future<Set<String>> connectedPlatforms(String clientId) async {
    final raw = await _api.get<Object?>(_api.org('social-accounts'), query: {'clientId': clientId});
    return {for (final account in jsonList(raw)) account.str('platform').toLowerCase()};
  }

  Future<CaptionSuggestion> writeCaption({required String topic, String? tone, String? platform, int? maxLength}) async =>
      CaptionSuggestion.fromJson(
        jsonObject(
          await _api.post<Object?>(
            '$_aiBase/caption',
            body: {'topic': topic, 'tone': ?tone, 'platform': ?platform, 'maxLength': ?maxLength},
          ),
        ),
      );

  Future<List<String>> suggestHashtags({required String topic, required int count}) async =>
      jsonObject(await _api.post<Object?>('$_aiBase/hashtags', body: {'topic': topic, 'count': count})).strings('hashtags');
}

final contentRepositoryProvider = Provider<ContentRepository>((ref) => ContentRepository(ref.watch(apiClientProvider)));
