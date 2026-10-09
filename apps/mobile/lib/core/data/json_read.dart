import '../network/api_client.dart';

/// Tolerant readers for API payloads, so mappers never crash on a missing or mistyped field.
extension JsonRead on Json {
  String str(String key, [String fallback = '']) {
    final value = this[key];
    return value is String ? value : fallback;
  }

  /// Non-empty string, or null.
  String? strOrNull(String key) {
    final value = this[key];
    return value is String && value.isNotEmpty ? value : null;
  }

  int integer(String key, [int fallback = 0]) {
    final value = this[key];
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value) ?? num.tryParse(value)?.toInt() ?? fallback;
    return fallback;
  }

  int? integerOrNull(String key) {
    final value = this[key];
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value) ?? num.tryParse(value)?.toInt();
    return null;
  }

  double decimal(String key, [double fallback = 0]) {
    final value = this[key];
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? fallback;
    return fallback;
  }

  bool flag(String key, [bool fallback = false]) {
    final value = this[key];
    return value is bool ? value : fallback;
  }

  /// Parsed ISO-8601 timestamp, or null.
  DateTime? date(String key) {
    final value = this[key];
    return value is String ? DateTime.tryParse(value) : null;
  }

  Json? object(String key) {
    final value = this[key];
    return value is Map ? value.cast<String, dynamic>() : null;
  }

  List<Json> objects(String key) => jsonList(this[key]);

  List<String> strings(String key) {
    final value = this[key];
    return value is List ? value.whereType<String>().toList() : const [];
  }
}

/// Reads a list payload: a bare array, or a cursor page (`{ items: [...] }`).
List<Json> jsonList(Object? raw) {
  final list = raw is Map ? raw['items'] : raw;
  if (list is! List) return const [];
  return [for (final item in list) if (item is Map) item.cast<String, dynamic>()];
}

/// Reads an object payload, tolerating an unexpected shape.
Json jsonObject(Object? raw) => raw is Map ? raw.cast<String, dynamic>() : <String, dynamic>{};

/// `yyyy-MM-dd` for date-only API fields, from the local calendar day.
String dateKey(DateTime value) {
  final local = value.toLocal();
  String two(int n) => n.toString().padLeft(2, '0');
  return '${local.year}-${two(local.month)}-${two(local.day)}';
}
