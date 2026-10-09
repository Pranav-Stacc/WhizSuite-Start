import '../../../core/contracts/contracts.g.dart';

const _prefix = '#';
final _hashtag = RegExp(hashtagPattern, unicode: true);
final _disallowed = RegExp(r'[\s#]+', unicode: true);

/// Turns free text into a single `#tag`: strips whitespace and stray `#`, then prefixes one.
/// Returns null when nothing usable remains or the tag breaks the contract limits.
String? normalizeHashtag(String raw) {
  final body = raw.replaceAll(_disallowed, '');
  if (body.isEmpty) return null;
  final tag = '$_prefix$body';
  if (tag.length > contentHashtagMaxLength || !_hashtag.hasMatch(tag)) return null;
  return tag;
}

/// Mirrors the API's `normalizeHashtags`: prefixes `#`, drops empties and invalid tags,
/// removes case-insensitive duplicates (first wins) and caps the list at [max].
List<String> normalizeHashtags(Iterable<String> tags, {int max = contentHashtagsMaxDefault}) {
  final seen = <String>{};
  final result = <String>[];
  for (final raw in tags) {
    final tag = normalizeHashtag(raw);
    if (tag == null || !seen.add(tag.toLowerCase())) continue;
    result.add(tag);
    if (result.length >= max) break;
  }
  return result;
}
