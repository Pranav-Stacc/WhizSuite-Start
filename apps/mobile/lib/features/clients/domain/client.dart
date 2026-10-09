import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// Brand guidelines the team writes content against.
class BrandKit {
  const BrandKit({
    this.primary,
    this.secondary,
    this.accent,
    this.voice = '',
    this.hashtags = const [],
    this.pillars = const [],
  });

  /// Reads the API's JSON columns (`colors`, `voiceTone`, `hashtagSets`, `contentPillars`).
  factory BrandKit.fromJson(Json? json) {
    if (json == null) return const BrandKit();
    final colors = json.object('colors') ?? const <String, dynamic>{};
    return BrandKit(
      primary: colors.strOrNull('primary'),
      secondary: colors.strOrNull('secondary'),
      accent: colors.strOrNull('accent'),
      voice: json.object('voiceTone')?.str('voice') ?? '',
      hashtags: _flatten(json.object('hashtagSets')),
      pillars: _flatten(json.object('contentPillars')),
    );
  }

  final String? primary;
  final String? secondary;
  final String? accent;
  final String voice;
  final List<String> hashtags;
  final List<String> pillars;

  static const _defaultSet = 'default';

  bool get isEmpty =>
      primary == null && secondary == null && accent == null && voice.isEmpty && hashtags.isEmpty && pillars.isEmpty;

  Json toJson() => {
        'colors': {'primary': ?primary, 'secondary': ?secondary, 'accent': ?accent},
        'voiceTone': {'voice': voice},
        'hashtagSets': {_defaultSet: hashtags},
        'contentPillars': {_defaultSet: pillars},
      };

  static List<String> _flatten(Json? sets) => [
        for (final value in sets?.values ?? const <Object?>[])
          if (value is List) ...value.whereType<String>(),
      ];
}

class ClientContact {
  const ClientContact({required this.id, required this.name, this.email, this.phone, this.role, this.isDecisionMaker = false});

  factory ClientContact.fromJson(Json json) => ClientContact(
        id: json.str('id'),
        name: [json.str('firstName'), json.str('lastName')].where((p) => p.isNotEmpty).join(' '),
        email: json.strOrNull('email'),
        phone: json.strOrNull('phone'),
        role: json.strOrNull('role'),
        isDecisionMaker: json.flag('isDecisionMaker'),
      );

  final String id;
  final String name;
  final String? email;
  final String? phone;
  final String? role;
  final bool isDecisionMaker;
}

class Client {
  const Client({
    required this.id,
    required this.name,
    required this.status,
    required this.createdAt,
    this.legalName,
    this.industry,
    this.website,
    this.tier,
    this.retainerMinor = 0,
    this.currency,
    this.brandKit = const BrandKit(),
    this.contacts = const [],
  });

  factory Client.fromJson(Json json) {
    final retainers = json.objects('retainers').where((r) => r.str('status', _activeRetainer) == _activeRetainer);
    return Client(
      id: json.str('id'),
      name: json.strOrNull('displayName') ?? json.str('name'),
      status: ClientStatuses.values.contains(json.str('status')) ? json.str('status') : ClientStatuses.onboarding,
      createdAt: json.date('createdAt') ?? DateTime.now(),
      legalName: json.strOrNull('legalName'),
      industry: json.strOrNull('industry'),
      website: json.strOrNull('website'),
      tier: json.strOrNull('tier'),
      retainerMinor: retainers.fold(0, (sum, r) => sum + r.integer('feeMinor')),
      currency: retainers.isEmpty ? null : retainers.first.strOrNull('currency'),
      brandKit: BrandKit.fromJson(json.object('brandKit')),
      contacts: json.objects('contacts').map(ClientContact.fromJson).toList(),
    );
  }

  static const _activeRetainer = 'ACTIVE';

  final String id;
  final String name;
  final String status;
  final DateTime createdAt;
  final String? legalName;
  final String? industry;
  final String? website;
  final String? tier;

  /// Sum of active retainer fees in minor units.
  final int retainerMinor;
  final String? currency;
  final BrandKit brandKit;
  final List<ClientContact> contacts;

  ClientContact? get primaryContact {
    for (final contact in contacts) {
      if (contact.isDecisionMaker) return contact;
    }
    return contacts.isEmpty ? null : contacts.first;
  }
}

/// Fields a client form edits.
class ClientInput {
  const ClientInput({required this.name, this.industry, this.website, this.status});

  final String name;
  final String? industry;
  final String? website;
  final String? status;

  Json toJson() => {
        'displayName': name,
        'industry': ?industry,
        'website': ?website,
        'status': ?status,
      };
}
