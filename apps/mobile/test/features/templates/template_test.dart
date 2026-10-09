import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/templates/domain/template.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('TemplateDefinition', () {
    test('round-trips known fields and keeps unknown ones', () {
      final json = {
        'description': 'Kickoff',
        'items': ['Brief', 'Moodboard'],
        'clientId': 'c1',
        'budget': 1200,
        'phases': [
          {'name': 'Plan'},
        ],
      };
      final definition = TemplateDefinition.fromJson(json);
      expect(definition.description, 'Kickoff');
      expect(definition.items, ['Brief', 'Moodboard']);
      expect(definition.clientId, 'c1');
      expect(definition.extras.keys, unorderedEquals(['budget', 'phases']));
      expect(definition.toJson(), json);
    });

    test('items that are not plain strings stay untouched in extras', () {
      final definition = TemplateDefinition.fromJson({
        'items': [
          {'title': 'Task'},
        ],
      });
      expect(definition.items, isEmpty);
      expect(definition.toJson(), {
        'items': [
          {'title': 'Task'},
        ],
      });
    });

    test('null definition is empty', () {
      expect(TemplateDefinition.fromJson(null).toJson(), isEmpty);
    });
  });

  group('TemplateInput', () {
    const definition = TemplateDefinition(description: 'D', clientId: 'c1');

    test('drops the client for organization-wide templates', () {
      const input = TemplateInput(name: 'N', type: 'PROJECT', scope: TemplateScopes.organization, definition: definition);
      expect(input.toCreateJson()['definition'], {'description': 'D'});
    });

    test('keeps the client for client templates and never sends type on update', () {
      const input = TemplateInput(name: 'N', type: 'PROJECT', scope: TemplateScopes.client, definition: definition);
      final json = input.toUpdateJson();
      expect(json['definition'], {'description': 'D', 'clientId': 'c1'});
      expect(json.containsKey('type'), isFalse);
    });
  });

  test('Template.fromJson normalizes unknown type and scope', () {
    final template = Template.fromJson({
      'id': 't',
      'type': 'NOPE',
      'name': 'N',
      'scope': 'NOPE',
      'definition': {'clientId': 'c1'},
      'createdAt': '2026-01-01T00:00:00.000Z',
    });
    expect(template.type, TemplateTypes.values.first);
    expect(template.scope, TemplateScopes.organization);
    expect(template.isClientScoped, isFalse);
  });
}
