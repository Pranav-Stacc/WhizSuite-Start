import 'dart:math';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// Source types a person can create by hand; the others mirror content and tasks.
const creatableCalendarSourceTypes = [
  CalendarSourceTypes.manual,
  CalendarSourceTypes.meeting,
  CalendarSourceTypes.deadline,
];

/// A stored calendar item (`calendar/items`). Visibility and project live in `metadata`,
/// since the API has no columns for them.
class CalendarItem {
  const CalendarItem({
    required this.id,
    required this.sourceType,
    required this.sourceId,
    required this.title,
    required this.startsAt,
    this.endsAt,
    this.allDay = false,
    this.clientId,
    this.metadata = const {},
    this.syncToGoogle = false,
  });

  factory CalendarItem.fromJson(Json json) {
    final type = json.str('sourceType');
    return CalendarItem(
      id: json.str('id'),
      sourceType: CalendarSourceTypes.values.contains(type) ? type : CalendarSourceTypes.manual,
      sourceId: json.str('sourceId'),
      title: json.str('title'),
      startsAt: json.date('startsAt') ?? DateTime.now(),
      endsAt: json.date('endsAt'),
      allDay: json.flag('allDay'),
      clientId: json.strOrNull('clientId'),
      metadata: json.object('metadata') ?? const {},
      syncToGoogle: json.flag('syncToGoogle'),
    );
  }

  /// Feed rows may use composite ids (`content:…`); keep `sourceId` for deep links.
  factory CalendarItem.fromFeedJson(Json json) {
    final type = json.str('sourceType');
    final meta = Map<String, Object?>.from(json.object('metadata') ?? const {});
    final projectId = json.strOrNull('projectId');
    if (projectId != null) meta.putIfAbsent(projectKey, () => projectId);
    return CalendarItem(
      id: json.str('sourceId', json.str('id')),
      sourceType: CalendarSourceTypes.values.contains(type) ? type : type,
      sourceId: json.str('sourceId', json.str('id')),
      title: json.str('title'),
      startsAt: json.date('startsAt') ?? DateTime.now(),
      endsAt: json.date('endsAt'),
      allDay: json.flag('allDay'),
      clientId: json.strOrNull('clientId'),
      metadata: meta,
    );
  }

  static const visibilityKey = 'visibility';
  static const projectKey = 'projectId';

  final String id;
  final String sourceType;
  final String sourceId;
  final String title;
  final DateTime startsAt;
  final DateTime? endsAt;
  final bool allDay;
  final String? clientId;
  final Json metadata;
  final bool syncToGoogle;

  String get visibility {
    final value = metadata.str(visibilityKey);
    return Visibilities.values.contains(value) ? value : Visibilities.internal;
  }

  String? get projectId => metadata.strOrNull(projectKey);
}

/// Fields the calendar form edits. Client and source are fixed after creation.
class CalendarItemInput {
  const CalendarItemInput({
    required this.title,
    required this.sourceType,
    required this.startsAt,
    required this.allDay,
    required this.visibility,
    this.endsAt,
    this.clientId,
    this.projectId,
    this.syncToGoogle = false,
  });

  final String title;
  final String sourceType;
  final DateTime startsAt;
  final DateTime? endsAt;
  final bool allDay;
  final String visibility;
  final String? clientId;
  final String? projectId;
  final bool syncToGoogle;

  Json _metadata(Json base) => {
        ...base,
        CalendarItem.visibilityKey: visibility,
        CalendarItem.projectKey: projectId,
      };

  /// `sourceId` is required by the API; manual items point at their project or client when set.
  Json toCreateJson({String Function() newId = newUuid}) => {
        'sourceType': sourceType,
        'sourceId': projectId ?? clientId ?? newId(),
        'title': title,
        'startsAt': startsAt.toUtc().toIso8601String(),
        'endsAt': ?endsAt?.toUtc().toIso8601String(),
        'allDay': allDay,
        'clientId': ?clientId,
        'syncToGoogle': syncToGoogle,
        'metadata': _metadata(const {}),
      };

  /// Sends `endsAt: null` to clear an end, and keeps unrelated metadata of [item].
  Json toUpdateJson(CalendarItem item) => {
        'title': title,
        'startsAt': startsAt.toUtc().toIso8601String(),
        'endsAt': endsAt?.toUtc().toIso8601String(),
        'allDay': allDay,
        'syncToGoogle': syncToGoogle,
        'metadata': _metadata(item.metadata),
      };
}

const _uuidBytes = 16;
const _versionIndex = 6;
const _variantIndex = 8;
const _versionMask = 0x0f;
const _version4 = 0x40;
const _variantMask = 0x3f;
const _variantRfc4122 = 0x80;
const _byteRange = 256;
const _hexRadix = 16;
const _groupBreaks = {4, 6, 8, 10};

/// Random RFC 4122 version 4 UUID.
String newUuid() {
  final random = Random.secure();
  final bytes = List<int>.generate(_uuidBytes, (_) => random.nextInt(_byteRange));
  bytes[_versionIndex] = (bytes[_versionIndex] & _versionMask) | _version4;
  bytes[_variantIndex] = (bytes[_variantIndex] & _variantMask) | _variantRfc4122;
  final buffer = StringBuffer();
  for (var i = 0; i < bytes.length; i++) {
    if (_groupBreaks.contains(i)) buffer.write('-');
    buffer.write(bytes[i].toRadixString(_hexRadix).padLeft(2, '0'));
  }
  return buffer.toString();
}
