import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/leads/domain/lead.dart';
import 'package:agency_os/features/leads/presentation/lead_forms.dart';
import 'package:flutter_test/flutter_test.dart';

Lead _lead(String id, String stage, int value, {String? ownerId, DateTime? nextStepAt, String? contact}) => Lead(
      id: id,
      companyName: 'Company $id',
      stage: stage,
      createdAt: DateTime.utc(2026),
      valueMinor: value,
      currency: 'USD',
      ownerId: ownerId,
      contactName: contact,
      nextStepAt: nextStepAt,
    );

void main() {
  group('Lead.fromJson', () {
    test('reads the API DTO including custom-field backed attributes', () {
      final lead = Lead.fromJson({
        'id': 'l1',
        'companyName': 'Acme',
        'stage': 'PROPOSAL',
        'valueMinor': 250000,
        'currency': 'EUR',
        'ownerId': 'u1',
        'contactName': 'Jane',
        'contactEmail': 'jane@acme.test',
        'nextStep': 'Send deck',
        'nextStepAt': '2026-10-10T11:30:00.000Z',
        'convertedClientId': null,
        'createdAt': '2026-10-01T09:00:00.000Z',
      });

      expect(lead.stage, LeadStages.proposal);
      expect(lead.valueMinor, 250000);
      expect(lead.currency, 'EUR');
      expect(lead.contactEmail, 'jane@acme.test');
      expect(lead.nextStepAt, DateTime.utc(2026, 10, 10, 11, 30));
      expect(lead.isConverted, isFalse);
      expect(lead.subtitle, 'Jane');
    });

    test('tolerates nulls and unknown stages', () {
      final lead = Lead.fromJson({'id': 'l2', 'companyName': 'Beta', 'stage': 'ARCHIVED', 'valueMinor': null});
      expect(lead.stage, LeadStages.newValue);
      expect(lead.valueMinor, 0);
      expect(lead.nextStepAt, isNull);
    });
  });

  group('PipelineSummary', () {
    final leads = [
      _lead('a', LeadStages.newValue, 10000),
      _lead('b', LeadStages.newValue, 20000),
      _lead('c', LeadStages.negotiation, 40000),
      _lead('d', LeadStages.won, 50000),
      _lead('e', LeadStages.won, 30000),
      _lead('f', LeadStages.lost, 90000),
    ];
    final summary = PipelineSummary.of(leads);

    test('totals count and value per stage in contract order', () {
      expect(summary.stages.map((s) => s.stage), LeadStages.values);
      expect(summary[LeadStages.newValue].count, 2);
      expect(summary[LeadStages.newValue].valueMinor, 30000);
      expect(summary[LeadStages.contacted].count, 0);
      expect(summary[LeadStages.won].valueMinor, 80000);
    });

    test('open value excludes closed deals and the forecast weights by stage', () {
      expect(summary.openMinor, 70000);
      expect(summary.weightedMinor, (30000 * 0.1 + 40000 * 0.75).round());
      expect(summary.wonMinor, 80000);
    });

    test('win rate is won over closed, null before any deal closes', () {
      expect(summary.winRate, closeTo(2 / 3, 1e-9));
      expect(PipelineSummary.of([_lead('x', LeadStages.proposal, 1)]).winRate, isNull);
      expect(summary.currency, 'USD');
    });
  });

  group('LeadPipeline', () {
    test('advances through open stages to won and steps back from closed deals', () {
      expect(LeadPipeline.next(LeadStages.newValue), LeadStages.contacted);
      expect(LeadPipeline.next(LeadStages.negotiation), LeadStages.won);
      expect(LeadPipeline.next(LeadStages.won), isNull);
      expect(LeadPipeline.previous(LeadStages.newValue), isNull);
      expect(LeadPipeline.previous(LeadStages.proposal), LeadStages.contacted);
      expect(LeadPipeline.previous(LeadStages.lost), LeadStages.negotiation);
    });
  });

  group('LeadFilter', () {
    final now = DateTime.utc(2026, 10, 9, 12);
    final leads = [
      _lead('1', LeadStages.contacted, 1, ownerId: 'u1', contact: 'Jane Roe', nextStepAt: now.subtract(const Duration(days: 1))),
      _lead('2', LeadStages.won, 1, ownerId: 'u2', nextStepAt: now.subtract(const Duration(days: 1))),
      _lead('3', LeadStages.proposal, 1, ownerId: 'u1', nextStepAt: now.add(const Duration(days: 2))),
    ];
    List<String> ids(LeadFilter filter) => [for (final l in leads) if (filter.matches(l, now: now)) l.id];

    test('searches company and contact name case-insensitively', () {
      expect(ids(const LeadFilter(query: 'jane')), ['1']);
      expect(ids(const LeadFilter(query: 'COMPANY 3')), ['3']);
    });

    test('combines owner, stage and follow-up due criteria', () {
      expect(ids(const LeadFilter(ownerId: 'u1')), ['1', '3']);
      expect(ids(const LeadFilter(stage: LeadStages.won)), ['2']);
      expect(ids(const LeadFilter(followUpOnly: true)), ['1']);
      expect(const LeadFilter().copyWith(ownerId: () => 'u1').copyWith(ownerId: () => null).ownerId, isNull);
    });
  });

  group('LeadInput', () {
    test('sends empty strings to clear optional fields and a 17:00 local next-step time', () {
      final json = LeadInput(companyName: 'Acme', nextStepAt: DateTime(2026, 10, 12)).toJson();
      expect(json['contactEmail'], '');
      expect(json['valueMinor'], 0);
      expect(json.containsKey('ownerId'), isFalse);
      expect(DateTime.parse(json['nextStepAt'] as String).toLocal(), DateTime(2026, 10, 12, leadNextStepHour));
      expect(nextStepJson(null, null), {'nextStep': '', 'nextStepAt': ''});
    });

    test('parses major-unit values into minor units', () {
      expect(parseLeadValue('1,500.50'), 150050);
      expect(parseLeadValue(' 2000 '), 200000);
      expect(parseLeadValue('-1'), isNull);
      expect(parseLeadValue('abc'), isNull);
      expect(formatLeadValue(150000), '1500');
      expect(formatLeadValue(150050), '1500.50');
    });
  });
}
