final _boundary = RegExp(r'[._\-\s]+|(?<=[a-z0-9])(?=[A-Z])');
final _nonWord = RegExp(r'[^A-Za-z0-9]');

/// Readable fallback for an unknown machine key: `roles_assign` / `whiteLabel` → "Roles assign" / "White label".
String humanizeKey(String key) {
  final words = key.trim().split(_boundary).where((w) => w.isNotEmpty).map((w) => w.toLowerCase()).toList();
  if (words.isEmpty) return key;
  final sentence = words.join(' ');
  return sentence[0].toUpperCase() + sentence.substring(1);
}

/// ICU select case for a machine key. The `k_` prefix keeps keys such as `time` or `date`
/// from colliding with ICU keywords, and dots become underscores (`settings.manage` → `k_settings_manage`).
String selectKey(String key) => 'k_${key.replaceAll(_nonWord, '_')}';
