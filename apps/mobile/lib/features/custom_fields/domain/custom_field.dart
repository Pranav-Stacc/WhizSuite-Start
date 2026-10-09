import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// Keys are snake_case and start with a letter (`CreateCustomFieldDto.key`).
final customFieldKeyPattern = RegExp(r'^[a-z][a-z0-9_]*$');

/// Prefix for keys whose label starts with a digit, so they still begin with a letter.
const _keyPrefix = 'field_';

/// Field types whose values come from a fixed list of options.
bool customFieldTypeHasOptions(String type) =>
    type == CustomFieldTypes.select || type == CustomFieldTypes.multiSelect;

bool isValidCustomFieldKey(String key) => key.length <= resourceKeyMaxLength && customFieldKeyPattern.hasMatch(key);

/// Suggests a key from a label: "Contract end date" → `contract_end_date`.
String customFieldKeyFromLabel(String label) {
  var key = label
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
      .replaceAll(RegExp(r'^_+|_+$'), '');
  if (key.isEmpty) return '';
  if (!RegExp('^[a-z]').hasMatch(key)) key = '$_keyPrefix$key';
  if (key.length > resourceKeyMaxLength) {
    key = key.substring(0, resourceKeyMaxLength).replaceAll(RegExp(r'_+$'), '');
  }
  return key;
}

/// An extra field the organization adds to one kind of record.
class CustomField {
  const CustomField({
    required this.id,
    required this.entityType,
    required this.key,
    required this.label,
    required this.type,
    required this.createdAt,
    this.options = const [],
    this.isRequired = false,
    this.isFilterable = false,
    this.clientVisible = false,
  });

  factory CustomField.fromJson(Json json) {
    final type = json.str('type');
    return CustomField(
      id: json.str('id'),
      entityType: json.str('entityType'),
      key: json.str('key'),
      label: json.str('label'),
      type: CustomFieldTypes.values.contains(type) ? type : CustomFieldTypes.text,
      options: json.strings('options'),
      isRequired: json.flag('isRequired'),
      isFilterable: json.flag('isFilterable'),
      clientVisible: json.flag('clientVisible'),
      createdAt: json.date('createdAt') ?? DateTime.now(),
    );
  }

  final String id;
  final String entityType;
  final String key;
  final String label;
  final String type;
  final List<String> options;
  final bool isRequired;
  final bool isFilterable;
  final bool clientVisible;
  final DateTime createdAt;

  bool get hasOptions => customFieldTypeHasOptions(type);
}

/// Fields the custom-field form edits. Entity type, key and type are fixed after creation.
class CustomFieldInput {
  const CustomFieldInput({
    required this.entityType,
    required this.key,
    required this.label,
    required this.type,
    this.options = const [],
    this.isRequired = false,
    this.isFilterable = false,
    this.clientVisible = false,
  });

  final String entityType;
  final String key;
  final String label;
  final String type;
  final List<String> options;
  final bool isRequired;
  final bool isFilterable;
  final bool clientVisible;

  List<String> get _options => customFieldTypeHasOptions(type) ? options : const [];

  Json _flags() => {'isRequired': isRequired, 'isFilterable': isFilterable, 'clientVisible': clientVisible};

  Json toCreateJson() => {
        'entityType': entityType,
        'key': key,
        'label': label,
        'type': type,
        if (_options.isNotEmpty) 'options': _options,
        ..._flags(),
      };

  Json toUpdateJson() => {'label': label, if (customFieldTypeHasOptions(type)) 'options': _options, ..._flags()};
}

/// Groups fields by entity type in contract order, labels alphabetical within a group.
Map<String, List<CustomField>> groupCustomFields(Iterable<CustomField> fields) {
  final groups = {for (final type in CustomFieldEntityTypes.values) type: <CustomField>[]};
  for (final field in fields) {
    groups.putIfAbsent(field.entityType, () => []).add(field);
  }
  for (final list in groups.values) {
    list.sort((a, b) => a.label.toLowerCase().compareTo(b.label.toLowerCase()));
  }
  groups.removeWhere((_, list) => list.isEmpty);
  return groups;
}
