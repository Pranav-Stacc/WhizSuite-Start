import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// A prospect moving through the sales pipeline.
class Lead {
  const Lead({
    required this.id,
    required this.companyName,
    required this.stage,
    required this.createdAt,
    this.updatedAt,
    this.brandName,
    this.website,
    this.industry,
    this.source,
    this.valueMinor = 0,
    this.currency,
    this.ownerId,
    this.contactName,
    this.contactEmail,
    this.nextStep,
    this.nextStepAt,
    this.convertedClientId,
  });

  factory Lead.fromJson(Json json) {
    final stage = json.str('stage');
    return Lead(
      id: json.str('id'),
      companyName: json.str('companyName'),
      stage: LeadStages.values.contains(stage) ? stage : LeadStages.newValue,
      createdAt: json.date('createdAt') ?? DateTime.now(),
      updatedAt: json.date('updatedAt'),
      brandName: json.strOrNull('brandName'),
      website: json.strOrNull('website'),
      industry: json.strOrNull('industry'),
      source: json.strOrNull('source'),
      valueMinor: json.integer('valueMinor'),
      currency: json.strOrNull('currency'),
      ownerId: json.strOrNull('ownerId'),
      contactName: json.strOrNull('contactName'),
      contactEmail: json.strOrNull('contactEmail'),
      nextStep: json.strOrNull('nextStep'),
      nextStepAt: json.date('nextStepAt'),
      convertedClientId: json.strOrNull('convertedClientId'),
    );
  }

  final String id;
  final String companyName;
  final String stage;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String? brandName;
  final String? website;
  final String? industry;
  final String? source;

  /// Estimated deal value in minor units.
  final int valueMinor;
  final String? currency;
  final String? ownerId;
  final String? contactName;
  final String? contactEmail;
  final String? nextStep;
  final DateTime? nextStepAt;
  final String? convertedClientId;

  bool get isOpen => LeadPipeline.openStages.contains(stage);
  bool get isWon => stage == LeadStages.won;
  bool get isConverted => convertedClientId != null;

  /// Contact name, else industry: the secondary line on cards and rows.
  String? get subtitle => contactName ?? industry;

  /// An open lead whose next step is due now or earlier.
  bool isFollowUpDue(DateTime now) {
    final due = nextStepAt;
    return isOpen && due != null && !due.isAfter(now);
  }

  Lead withStage(String value) => Lead(
        id: id,
        companyName: companyName,
        stage: value,
        createdAt: createdAt,
        updatedAt: updatedAt,
        brandName: brandName,
        website: website,
        industry: industry,
        source: source,
        valueMinor: valueMinor,
        currency: currency,
        ownerId: ownerId,
        contactName: contactName,
        contactEmail: contactEmail,
        nextStep: nextStep,
        nextStepAt: nextStepAt,
        convertedClientId: convertedClientId,
      );
}

/// Stage order and close probabilities of the default pipeline.
abstract final class LeadPipeline {
  static const openStages = [
    LeadStages.newValue,
    LeadStages.contacted,
    LeadStages.proposal,
    LeadStages.negotiation,
  ];

  /// Probability of closing by stage; same weights as the web forecast.
  static const stageWeights = <String, double>{
    LeadStages.newValue: 0.1,
    LeadStages.contacted: 0.25,
    LeadStages.proposal: 0.5,
    LeadStages.negotiation: 0.75,
    LeadStages.won: 1,
    LeadStages.lost: 0,
  };

  static double weightOf(String stage) => stageWeights[stage] ?? 0;

  /// Next stage when advancing an open deal; the last open stage advances to won.
  static String? next(String stage) {
    final index = openStages.indexOf(stage);
    if (index < 0) return null;
    return index == openStages.length - 1 ? LeadStages.won : openStages[index + 1];
  }

  /// Previous stage; closed deals step back into the last open stage.
  static String? previous(String stage) {
    if (!openStages.contains(stage)) return openStages.last;
    final index = openStages.indexOf(stage);
    return index == 0 ? null : openStages[index - 1];
  }
}

/// Lead count and value of one board column.
class StageTotal {
  const StageTotal({required this.stage, this.count = 0, this.valueMinor = 0});

  final String stage;
  final int count;
  final int valueMinor;
}

/// Headline numbers of the pipeline, computed in one pass.
class PipelineSummary {
  const PipelineSummary._({
    required this.stages,
    required this.openMinor,
    required this.weightedMinor,
    required this.wonMinor,
    required this.winRate,
    required this.currency,
  });

  factory PipelineSummary.of(Iterable<Lead> leads) {
    final counts = <String, int>{};
    final values = <String, int>{};
    var weighted = 0.0;
    String? currency;
    for (final lead in leads) {
      counts.update(lead.stage, (n) => n + 1, ifAbsent: () => 1);
      values.update(lead.stage, (v) => v + lead.valueMinor, ifAbsent: () => lead.valueMinor);
      if (lead.isOpen) weighted += lead.valueMinor * LeadPipeline.weightOf(lead.stage);
      currency ??= lead.currency;
    }
    final won = counts[LeadStages.won] ?? 0;
    final closed = won + (counts[LeadStages.lost] ?? 0);
    return PipelineSummary._(
      stages: [
        for (final stage in LeadStages.values)
          StageTotal(stage: stage, count: counts[stage] ?? 0, valueMinor: values[stage] ?? 0),
      ],
      openMinor: LeadPipeline.openStages.fold(0, (sum, stage) => sum + (values[stage] ?? 0)),
      weightedMinor: weighted.round(),
      wonMinor: values[LeadStages.won] ?? 0,
      winRate: closed == 0 ? null : won / closed,
      currency: currency,
    );
  }

  final List<StageTotal> stages;
  final int openMinor;
  final int weightedMinor;
  final int wonMinor;

  /// Share of closed deals that were won (0..1); null until a deal closes.
  final double? winRate;
  final String? currency;

  StageTotal operator [](String stage) =>
      stages.firstWhere((total) => total.stage == stage, orElse: () => StageTotal(stage: stage));
}

/// Board and list filters; all criteria combine.
class LeadFilter {
  const LeadFilter({this.query = '', this.ownerId, this.stage, this.followUpOnly = false});

  final String query;
  final String? ownerId;
  final String? stage;
  final bool followUpOnly;

  bool get isActive => query.trim().isNotEmpty || ownerId != null || stage != null || followUpOnly;

  bool matches(Lead lead, {required DateTime now}) {
    final q = query.trim().toLowerCase();
    if (q.isNotEmpty &&
        !lead.companyName.toLowerCase().contains(q) &&
        !(lead.contactName?.toLowerCase().contains(q) ?? false)) {
      return false;
    }
    if (ownerId != null && lead.ownerId != ownerId) return false;
    if (stage != null && lead.stage != stage) return false;
    return !followUpOnly || lead.isFollowUpDue(now);
  }

  LeadFilter copyWith({String? query, String? Function()? ownerId, String? Function()? stage, bool? followUpOnly}) =>
      LeadFilter(
        query: query ?? this.query,
        ownerId: ownerId == null ? this.ownerId : ownerId(),
        stage: stage == null ? this.stage : stage(),
        followUpOnly: followUpOnly ?? this.followUpOnly,
      );
}

/// Fields the lead form edits. Empty text is sent as `''`, which the API stores as cleared.
class LeadInput {
  const LeadInput({
    required this.companyName,
    this.contactName,
    this.contactEmail,
    this.industry,
    this.website,
    this.source,
    this.valueMinor,
    this.stage,
    this.ownerId,
    this.nextStep,
    this.nextStepAt,
  });

  final String companyName;
  final String? contactName;
  final String? contactEmail;
  final String? industry;
  final String? website;
  final String? source;
  final int? valueMinor;
  final String? stage;
  final String? ownerId;
  final String? nextStep;
  final DateTime? nextStepAt;

  Json toJson() => {
        'companyName': companyName,
        'contactName': contactName ?? '',
        'contactEmail': contactEmail ?? '',
        'industry': industry ?? '',
        'website': website ?? '',
        'source': source ?? '',
        'valueMinor': valueMinor ?? 0,
        'stage': ?stage,
        'ownerId': ?ownerId,
        ...nextStepJson(nextStep, nextStepAt),
      };
}

/// Hour of day a date-only next step is due, matching the web's `dateKeyToIso`.
const int leadNextStepHour = 17;

/// Body fields for a next step; nulls clear the stored values.
Json nextStepJson(String? step, DateTime? at) => {
      'nextStep': step ?? '',
      'nextStepAt': at == null ? '' : DateTime(at.year, at.month, at.day, leadNextStepHour).toUtc().toIso8601String(),
    };
