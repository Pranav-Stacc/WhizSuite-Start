import '../../../core/contracts/contracts.g.dart';

/// Caption character limits per network (same values as the web's platform metadata).
const Map<String, int> platformCaptionLimits = {
  Platforms.instagram: 2200,
  Platforms.facebook: 63206,
  Platforms.linkedin: 3000,
  Platforms.x: 280,
  Platforms.youtube: 5000,
  Platforms.tiktok: 2200,
};

/// The tightest caption limit across [platforms], or null when none are selected.
int? tightestCaptionLimit(Iterable<String> platforms) {
  int? limit;
  for (final platform in platforms) {
    final value = platformCaptionLimits[platform];
    if (value != null && (limit == null || value < limit)) limit = value;
  }
  return limit;
}

/// Caption as published: the body, a blank line, then the hashtags.
String publishedCaption(String caption, List<String> hashtags) =>
    [caption.trim(), hashtags.join(' ')].where((part) => part.isNotEmpty).join('\n\n');

/// Server defaults for limits the API reads from config (`CONTENT_MEDIA_MAX`, `CONTENT_REORDER_MAX`).
const int contentMediaMaxDefault = 20;
const int contentReorderMaxDefault = 200;
