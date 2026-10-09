import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/custom_fields/domain/custom_field.dart';
import 'package:flutter_test/flutter_test.dart';

CustomField _field(String entityType, String label) => CustomField.fromJson({
      'id': label,
      'entityType': entityType,
      'key': label.toLowerCase(),
      'label': label,
      'type': 'TEXT',
      'createdAt': '2026-01-01T00:00:00.000Z',
    });

void main() {
  group('customFieldKeyFromLabel', () {
    test('slugs labels to snake_case', () {
      expect(customFieldKeyFromLabel('Contract end date'), 'contract_end_date');
      expect(customFieldKeyFromLabel('  Budget (USD) / month! '), 'budget_usd_month');
      expect(customFieldKeyFromLabel('Café №1'), 'caf_1');
    });

    test('keys always start with a letter', () {
      expect(customFieldKeyFromLabel('2nd contact'), 'field_2nd_contact');
    });

    test('empty or symbol-only labels give an empty key', () {
      expect(customFieldKeyFromLabel(' -- '), '');
    });

    test('truncates to the key limit without a trailing underscore', () {
      final key = customFieldKeyFromLabel('${'a' * (resourceKeyMaxLength - 1)} b');
      expect(key.length, lessThanOrEqualTo(resourceKeyMaxLength));
      expect(key, isNot(endsWith('_')));
      expect(isValidCustomFieldKey(key), isTrue);
    });
  });

  test('isValidCustomFieldKey matches the API rule', () {
    expect(isValidCustomFieldKey('po_number'), isTrue);
    expect(isValidCustomFieldKey('PoNumber'), isFalse);
    expect(isValidCustomFieldKey('1st'), isFalse);
    expect(isValidCustomFieldKey('a-b'), isFalse);
    expect(isValidCustomFieldKey('a' * (resourceKeyMaxLength + 1)), isFalse);
  });

  group('CustomFieldInput', () {
    test('only select types send options', () {
      const text = CustomFieldInput(entityType: 'client', key: 'k', label: 'L', type: 'TEXT', options: ['x']);
      const select = CustomFieldInput(entityType: 'client', key: 'k', label: 'L', type: 'SELECT', options: ['x']);
      expect(text.toCreateJson().containsKey('options'), isFalse);
      expect(select.toCreateJson()['options'], ['x']);
      expect(select.toUpdateJson()['options'], ['x']);
    });

    test('update never sends immutable fields', () {
      const input = CustomFieldInput(entityType: 'client', key: 'k', label: 'L', type: 'TEXT', isRequired: true);
      final json = input.toUpdateJson();
      expect(json.keys, isNot(contains('key')));
      expect(json.keys, isNot(contains('entityType')));
      expect(json.keys, isNot(contains('type')));
      expect(json['isRequired'], isTrue);
    });
  });

  test('groupCustomFields orders groups by entity type and labels alphabetically', () {
    final groups = groupCustomFields([
      _field('task', 'Zeta'),
      _field('client', 'beta'),
      _field('client', 'Alpha'),
    ]);
    expect(groups.keys, ['client', 'task']);
    expect(groups['client']?.map((f) => f.label), ['Alpha', 'beta']);
  });
}
