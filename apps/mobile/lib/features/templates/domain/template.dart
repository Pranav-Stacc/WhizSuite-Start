import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// Keys of a template's free-form `definition` that the structured editor understands.
abstract final class TemplateDefinitionKeys {
  static const description = 'description';
  static const body = 'body';
  static const items = 'items';

  /// The API has no client column, so client-scoped templates record their client here.
  static const clientId = 'clientId';
}

/// Structured view of a template definition. Keys this editor does not understand are kept in [extras]
/// and written back untouched, so editing on mobile never loses data authored elsewhere.
class TemplateDefinition {
  const TemplateDefinition({
    this.description = '',
    this.body = '',
    this.items = const [],
    this.clientId,
    this.extras = const {},
  });

  factory TemplateDefinition.fromJson(Json? json) {
    if (json == null) return const TemplateDefinition();
    final rawItems = json[TemplateDefinitionKeys.items];
    final editableItems = rawItems is List && rawItems.every((item) => item is String);
    return TemplateDefinition(
      description: json.str(TemplateDefinitionKeys.description),
      body: json.str(TemplateDefinitionKeys.body),
      items: editableItems ? json.strings(TemplateDefinitionKeys.items) : const [],
      clientId: json.strOrNull(TemplateDefinitionKeys.clientId),
      extras: {
        for (final entry in json.entries)
          if (!_isEditable(entry.key, entry.value, editableItems: editableItems)) entry.key: entry.value,
      },
    );
  }

  /// Whether the structured editor owns [key]: known keys whose value has the shape the editor writes.
  static bool _isEditable(String key, Object? value, {required bool editableItems}) => switch (key) {
        TemplateDefinitionKeys.items => editableItems,
        TemplateDefinitionKeys.description || TemplateDefinitionKeys.body || TemplateDefinitionKeys.clientId =>
          value is String,
        _ => false,
      };

  final String description;
  final String body;
  final List<String> items;
  final String? clientId;
  final Json extras;

  Json toJson() => {
        ...extras,
        if (description.isNotEmpty) TemplateDefinitionKeys.description: description,
        if (body.isNotEmpty) TemplateDefinitionKeys.body: body,
        if (items.isNotEmpty) TemplateDefinitionKeys.items: items,
        TemplateDefinitionKeys.clientId: ?clientId,
      };

  TemplateDefinition copyWith({String? description, String? body, List<String>? items, String? clientId, bool clearClient = false}) =>
      TemplateDefinition(
        description: description ?? this.description,
        body: body ?? this.body,
        items: items ?? this.items,
        clientId: clearClient ? null : (clientId ?? this.clientId),
        extras: extras,
      );
}

/// A reusable starting point for projects, tasks, content, reports or messages.
class Template {
  const Template({
    required this.id,
    required this.type,
    required this.name,
    required this.scope,
    required this.definition,
    required this.createdAt,
    this.version = 1,
  });

  factory Template.fromJson(Json json) {
    final type = json.str('type');
    final scope = json.str('scope');
    return Template(
      id: json.str('id'),
      type: TemplateTypes.values.contains(type) ? type : TemplateTypes.values.first,
      name: json.str('name'),
      scope: TemplateScopes.values.contains(scope) ? scope : TemplateScopes.organization,
      definition: TemplateDefinition.fromJson(json.object('definition')),
      version: json.integer('version', 1),
      createdAt: json.date('createdAt') ?? DateTime.now(),
    );
  }

  final String id;
  final String type;
  final String name;
  final String scope;
  final TemplateDefinition definition;
  final int version;
  final DateTime createdAt;

  bool get isClientScoped => scope == TemplateScopes.client;
}

/// Fields the template form edits. The type is fixed after creation.
class TemplateInput {
  const TemplateInput({required this.name, required this.type, required this.scope, required this.definition});

  final String name;
  final String type;
  final String scope;
  final TemplateDefinition definition;

  /// Only client-scoped templates keep a client.
  Json get _definition =>
      (scope == TemplateScopes.client ? definition : definition.copyWith(clearClient: true)).toJson();

  Json toCreateJson() => {'name': name, 'type': type, 'scope': scope, 'definition': _definition};

  Json toUpdateJson() => {'name': name, 'scope': scope, 'definition': _definition};
}
