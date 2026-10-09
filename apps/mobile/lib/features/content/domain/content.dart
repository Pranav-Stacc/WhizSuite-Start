import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// App content type ↔ the API's enum (the API names a single-image post `STATIC_POST`).
const Map<String, String> _apiContentTypeOf = {
  ContentTypes.post: ApiContentTypes.staticPost,
  ContentTypes.carousel: ApiContentTypes.carousel,
  ContentTypes.reel: ApiContentTypes.reel,
  ContentTypes.story: ApiContentTypes.story,
  ContentTypes.video: ApiContentTypes.video,
  ContentTypes.article: ApiContentTypes.article,
};

final Map<String, String> _contentTypeOfApi = {for (final e in _apiContentTypeOf.entries) e.value: e.key};

String apiContentType(String type) => _apiContentTypeOf[type] ?? ApiContentTypes.staticPost;

/// Tolerates both the API enum and the app enum, defaulting to a plain post.
String contentTypeFromApi(String? raw) =>
    _contentTypeOfApi[raw] ?? (ContentTypes.values.contains(raw) ? raw ?? ContentTypes.post : ContentTypes.post);

/// One ordered slide of a post. [url] is a short-lived inline URL, present once the asset is ready.
class ContentMedia {
  const ContentMedia({required this.assetId, required this.name, required this.mimeType, this.url, this.position = 0});

  factory ContentMedia.fromJson(Json json) => ContentMedia(
        assetId: json.str('assetId'),
        name: json.str('name'),
        mimeType: json.str('mimeType'),
        url: json.strOrNull('url'),
        position: json.integer('position'),
      );

  static const _imagePrefix = 'image/';
  static const _videoPrefix = 'video/';

  final String assetId;
  final String name;
  final String mimeType;
  final String? url;
  final int position;

  bool get isImage => mimeType.startsWith(_imagePrefix);
  bool get isVideo => mimeType.startsWith(_videoPrefix);
}

class Content {
  const Content({
    required this.id,
    required this.clientId,
    required this.title,
    required this.contentType,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.caption = '',
    this.pillar,
    this.platforms = const [],
    this.hashtags = const [],
    this.ctaUrl,
    this.scheduledAt,
    this.gridPosition,
    this.authorId,
    this.version = 1,
    this.media = const [],
  });

  factory Content.fromJson(Json json) {
    final created = json.date('createdAt') ?? DateTime.now();
    final media = json.objects('media').map(ContentMedia.fromJson).where((m) => m.assetId.isNotEmpty).toList()
      ..sort((a, b) => a.position.compareTo(b.position));
    final status = json.str('status');
    return Content(
      id: json.str('id'),
      clientId: json.str('clientId'),
      title: json.str('title'),
      caption: json.str('caption'),
      contentType: contentTypeFromApi(json.strOrNull('contentType')),
      status: ContentStatuses.values.contains(status) ? status : ContentStatuses.draft,
      pillar: json.strOrNull('pillar'),
      platforms: json.strings('platforms').where(Platforms.values.contains).toList(),
      hashtags: json.strings('hashtags'),
      ctaUrl: json.strOrNull('ctaUrl'),
      scheduledAt: json.date('scheduledAt'),
      gridPosition: json.integerOrNull('gridPosition'),
      authorId: json.strOrNull('createdById'),
      createdAt: created,
      updatedAt: json.date('updatedAt') ?? created,
      version: json.integer('version', 1),
      media: media,
    );
  }

  final String id;
  final String clientId;
  final String title;
  final String caption;
  final String contentType;
  final String status;
  final String? pillar;
  final List<String> platforms;
  final List<String> hashtags;
  final String? ctaUrl;
  final DateTime? scheduledAt;

  /// Manual position in the client's grid planner; null until placed by hand.
  final int? gridPosition;
  final String? authorId;
  final DateTime createdAt;
  final DateTime updatedAt;

  /// Optimistic-lock version sent back on edit.
  final int version;
  final List<ContentMedia> media;

  ContentMedia? get cover => media.isEmpty ? null : media.first;
}

/// Fields the composer edits. Create omits empty values; update clears them with explicit nulls.
class ContentInput {
  const ContentInput({
    required this.title,
    required this.contentType,
    this.clientId,
    this.caption = '',
    this.pillar,
    this.platforms = const [],
    this.hashtags = const [],
    this.ctaUrl,
    this.scheduledAt,
    this.mediaAssetIds = const [],
  });

  /// Required on create; the API does not move content between clients.
  final String? clientId;
  final String title;
  final String contentType;
  final String caption;
  final String? pillar;
  final List<String> platforms;
  final List<String> hashtags;
  final String? ctaUrl;
  final DateTime? scheduledAt;
  final List<String> mediaAssetIds;

  String? get _caption => caption.trim().isEmpty ? null : caption;
  String? get _scheduledAt => scheduledAt?.toUtc().toIso8601String();

  Json toCreateJson({required String status}) => {
        'clientId': ?clientId,
        'title': title,
        'caption': ?_caption,
        'contentType': apiContentType(contentType),
        'pillar': ?pillar,
        'platforms': platforms,
        'hashtags': hashtags,
        'ctaUrl': ?ctaUrl,
        'scheduledAt': ?_scheduledAt,
        'status': status,
        'mediaAssetIds': mediaAssetIds,
      };

  Json toUpdateJson({required int expectedVersion}) => {
        'title': title,
        'caption': _caption,
        'contentType': apiContentType(contentType),
        'pillar': pillar,
        'platforms': platforms,
        'hashtags': hashtags,
        'ctaUrl': ctaUrl,
        'scheduledAt': _scheduledAt,
        'mediaAssetIds': mediaAssetIds,
        'expectedVersion': expectedVersion,
      };
}

/// A message in a content item's feedback thread.
class ContentComment {
  const ContentComment({required this.id, required this.authorId, required this.body, required this.createdAt});

  factory ContentComment.fromJson(Json json) => ContentComment(
        id: json.str('id'),
        authorId: json.str('authorId'),
        body: json.str('body'),
        createdAt: json.date('createdAt') ?? DateTime.now(),
      );

  final String id;
  final String authorId;
  final String body;
  final DateTime createdAt;
}

/// Brand-kit suggestions the composer offers for a client.
class BrandHints {
  const BrandHints({this.voice = '', this.pillars = const [], this.hashtags = const []});

  /// Reads the client payload's `brandKit` JSON columns (`voiceTone`, `contentPillars`, `hashtagSets`).
  factory BrandHints.fromClientJson(Json json) {
    final kit = json.object('brandKit');
    if (kit == null) return empty;
    return BrandHints(
      voice: kit.object('voiceTone')?.str('voice') ?? '',
      pillars: _flatten(kit.object('contentPillars')),
      hashtags: _flatten(kit.object('hashtagSets')),
    );
  }

  static const empty = BrandHints();

  final String voice;
  final List<String> pillars;
  final List<String> hashtags;

  static List<String> _flatten(Json? sets) => [
        for (final value in sets?.values ?? const <Object?>[])
          if (value is List) ...value.whereType<String>(),
      ];
}

/// AI caption draft with optional hashtag suggestions.
class CaptionSuggestion {
  const CaptionSuggestion({required this.caption, this.hashtags = const []});

  factory CaptionSuggestion.fromJson(Json json) =>
      CaptionSuggestion(caption: json.str('caption'), hashtags: json.strings('hashtags'));

  final String caption;
  final List<String> hashtags;
}
