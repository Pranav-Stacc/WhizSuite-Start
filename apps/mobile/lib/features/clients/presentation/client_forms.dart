import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/theme/theme_settings.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../application/clients_controller.dart';
import '../domain/client.dart';
import 'client_status.dart';

/// Create (when [client] is null) or edit a client. Resolves to true when saved.
Future<bool> showClientForm(BuildContext context, WidgetRef ref, {Client? client}) {
  final l10n = AppLocalizations.of(context);
  final name = TextEditingController(text: client?.name);
  final industry = TextEditingController(text: client?.industry);
  final website = TextEditingController(text: client?.website);
  var status = client?.status;
  final actions = ref.read(clientsActionsProvider);

  String? optional(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();

  return showFormSheet(
    context,
    title: client == null ? l10n.clientNew : l10n.clientEdit,
    submitLabel: client == null ? l10n.create : l10n.save,
    fields: (context, setState) => [
      TextFormField(
        controller: name,
        autofocus: client == null,
        decoration: InputDecoration(labelText: l10n.clientName),
        textInputAction: TextInputAction.next,
        maxLength: resourceNameMaxLength,
        validator: Validators(l10n).minLength(resourceNameMinLength),
      ),
      TextFormField(
        controller: industry,
        decoration: InputDecoration(labelText: l10n.clientIndustry),
        textInputAction: TextInputAction.next,
      ),
      TextFormField(
        controller: website,
        decoration: InputDecoration(labelText: l10n.clientWebsite, hintText: l10n.clientWebsiteHint),
        keyboardType: TextInputType.url,
      ),
      if (client != null)
        OptionField<String>(
          label: l10n.clientStatusLabel,
          value: status,
          options: ClientStatuses.values,
          labelOf: (s) => clientStatusLabel(l10n, s),
          onChanged: (value) => setState(() => status = value),
        ),
    ],
    onSubmit: () async {
      final input = ClientInput(
        name: name.text.trim(),
        industry: optional(industry),
        website: optional(website),
        status: client == null ? null : status,
      );
      if (client == null) {
        await actions.create(input);
      } else {
        await actions.update(client.id, input);
      }
    },
  );
}

/// Edit brand colours, voice, pillars and hashtags.
Future<bool> showBrandKitForm(BuildContext context, WidgetRef ref, Client client) {
  final l10n = AppLocalizations.of(context);
  final kit = client.brandKit;
  final primary = TextEditingController(text: kit.primary);
  final secondary = TextEditingController(text: kit.secondary);
  final accent = TextEditingController(text: kit.accent);
  final voice = TextEditingController(text: kit.voice);
  var pillars = kit.pillars;
  var hashtags = kit.hashtags;

  String? hex(String? value) {
    final text = value?.trim() ?? '';
    return text.isEmpty || parseHexColor(text) != null ? null : l10n.themeHexInvalid;
  }

  String? colour(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim().toUpperCase();

  Widget colourField(TextEditingController controller, String label) => TextFormField(
        controller: controller,
        decoration: InputDecoration(labelText: label, hintText: '#RRGGBB'),
        validator: hex,
      );

  return showFormSheet(
    context,
    title: l10n.clientBrandEdit,
    submitLabel: l10n.save,
    fields: (context, setState) => [
      colourField(primary, l10n.clientBrandPrimary),
      colourField(secondary, l10n.clientBrandSecondary),
      colourField(accent, l10n.clientBrandAccent),
      TextFormField(
        controller: voice,
        decoration: InputDecoration(labelText: l10n.clientBrandVoice),
        minLines: 2,
        maxLines: 5,
        maxLength: resourceTextMaxLength,
      ),
      TagsField(
        label: l10n.clientBrandPillars,
        values: pillars,
        onChanged: (value) => setState(() => pillars = value),
      ),
      TagsField(
        label: l10n.clientBrandHashtags,
        values: hashtags,
        normalize: (raw) => raw.startsWith('#') ? raw : '#$raw',
        maxTags: contentHashtagsMaxDefault,
        onChanged: (value) => setState(() => hashtags = value),
      ),
    ],
    onSubmit: () => ref.read(clientsActionsProvider).updateBrandKit(
          client.id,
          BrandKit(
            primary: colour(primary),
            secondary: colour(secondary),
            accent: colour(accent),
            voice: voice.text.trim(),
            pillars: pillars,
            hashtags: hashtags,
          ),
        ),
  );
}
