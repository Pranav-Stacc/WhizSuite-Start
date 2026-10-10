import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/forms/validators.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/integrations_controller.dart';
import '../domain/integration_connection.dart';
import '../domain/platform_channel.dart';
import 'integration_labels.dart';

String? _optional(TextEditingController controller) {
  final text = controller.text.trim();
  return text.isEmpty ? null : text;
}

/// Demo-mode connect for a single platform channel (handle only).
Future<bool> showChannelConnectForm(
  BuildContext context,
  WidgetRef ref, {
  required PlatformChannel channel,
  required String clientName,
}) {
  final l10n = AppLocalizations.of(context);
  final handle = TextEditingController();
  return showFormSheet(
    context,
    title: l10n.integrationConnect,
    subtitle: l10n.integrationConnectChannelBody(clientName),
    submitLabel: l10n.integrationConnectSubmit,
    size: AppDialogSize.compact,
    fields: (context, _) => [
      TextFormField(
        controller: handle,
        autofocus: true,
        decoration: InputDecoration(
          labelText: l10n.integrationHandle,
          hintText: l10n.integrationHandleHint,
        ),
        autocorrect: false,
        maxLength: resourceNameMaxLength,
        validator: Validators(l10n).minLength(1),
      ),
    ],
    onSubmit: () => ref.read(integrationsActionsProvider).connect(
          ConnectionInput(
            providerId: channel.platform,
            clientId: channel.clientId,
            providerName: channel.platform,
            accountHandle: handle.text.trim().startsWith('@') ? handle.text.trim() : '@${handle.text.trim()}',
          ),
        ),
  );
}

/// Links a provider account to the organization (or one client). Resolves to true when created.
Future<bool> showConnectForm(BuildContext context, WidgetRef ref, {required Map<String, String?> providers}) {
  final l10n = AppLocalizations.of(context);
  final providerId = TextEditingController();
  final providerName = TextEditingController();
  final handle = TextEditingController();
  String? clientId;
  final clients = ref.read(clientDirectoryProvider).value ?? Directory.empty;

  String? validateProvider(String? value) {
    final text = value?.trim() ?? '';
    if (text.isEmpty) return l10n.validationRequired;
    return isProviderId(text) ? null : l10n.integrationProviderIdInvalid;
  }

  return showFormSheet(
    context,
    title: l10n.integrationConnect,
    submitLabel: l10n.integrationConnectSubmit,
    fields: (context, setState) => [
      if (providers.isNotEmpty)
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.integrationKnownProviders, style: Theme.of(context).textTheme.labelMedium),
            SizedBox(height: context.tokens.sm),
            Wrap(
              spacing: context.tokens.sm,
              runSpacing: context.tokens.sm,
              children: [
                for (final MapEntry(key: id, value: name) in providers.entries)
                  ChoiceChip(
                    label: Text(knownProviderLabel(l10n, id, name)),
                    selected: providerId.text.trim() == id,
                    onSelected: (_) => setState(() {
                      providerId.text = id;
                      if (name != null) providerName.text = name;
                    }),
                  ),
              ],
            ),
          ],
        ),
      TextFormField(
        controller: providerId,
        decoration: InputDecoration(labelText: l10n.integrationProviderId, helperText: l10n.integrationProviderIdHint),
        style: const TextStyle(fontFamily: 'monospace'),
        autocorrect: false,
        textInputAction: TextInputAction.next,
        validator: validateProvider,
        onChanged: (_) => setState(() {}),
      ),
      TextFormField(
        controller: providerName,
        decoration: InputDecoration(labelText: l10n.integrationProviderName, hintText: l10n.integrationProviderNameHint),
        textInputAction: TextInputAction.next,
        maxLength: resourceNameMaxLength,
      ),
      OptionField<String>(
        label: l10n.integrationClient,
        value: clientId,
        allowNone: true,
        options: [for (final client in clients.entries) client.id],
        labelOf: (id) => clients.nameOf(id) ?? id,
        onChanged: (value) => setState(() => clientId = value),
      ),
      TextFormField(
        controller: handle,
        decoration: InputDecoration(labelText: l10n.integrationHandle, hintText: l10n.integrationHandleHint),
        autocorrect: false,
        maxLength: resourceNameMaxLength,
      ),
    ],
    onSubmit: () => ref.read(integrationsActionsProvider).connect(
          ConnectionInput(
            providerId: providerId.text.trim(),
            clientId: clientId,
            providerName: _optional(providerName),
            accountHandle: _optional(handle),
          ),
        ),
  );
}

/// Edits a connection's status and labels. Resolves to true when saved.
Future<bool> showConnectionEditForm(BuildContext context, WidgetRef ref, IntegrationConnection connection) {
  final l10n = AppLocalizations.of(context);
  final providerName = TextEditingController(text: connection.providerName);
  final handle = TextEditingController(text: connection.accountHandle);
  var status = connection.status;

  return showFormSheet(
    context,
    title: l10n.integrationEdit,
    submitLabel: l10n.save,
    fields: (context, setState) => [
      OptionField<String>(
        label: l10n.integrationStatusField,
        value: status,
        options: IntegrationConnectionStatuses.values,
        labelOf: (value) => integrationStatusLabel(l10n, value),
        onChanged: (value) => setState(() => status = value ?? status),
      ),
      TextFormField(
        controller: providerName,
        decoration: InputDecoration(labelText: l10n.integrationProviderName),
        textInputAction: TextInputAction.next,
        maxLength: resourceNameMaxLength,
      ),
      TextFormField(
        controller: handle,
        decoration: InputDecoration(labelText: l10n.integrationHandle, hintText: l10n.integrationHandleHint),
        autocorrect: false,
        maxLength: resourceNameMaxLength,
      ),
    ],
    onSubmit: () => ref.read(integrationsActionsProvider).update(
          connection.id,
          ConnectionInput(
            status: status,
            providerName: _optional(providerName),
            accountHandle: _optional(handle),
            base: connection.metadata,
          ),
        ),
  );
}
