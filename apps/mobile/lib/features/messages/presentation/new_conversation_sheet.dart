import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../application/messages_providers.dart';

/// Starts a client conversation. The API has no thread title: a conversation is the
/// client subject, and the first message opens its thread. Staff pick the client;
/// portal members always write to their agency. Resolves to the conversation's route
/// key, or null when cancelled.
Future<String?> showNewConversationSheet(BuildContext context, WidgetRef ref) async {
  final l10n = AppLocalizations.of(context);
  final portalClientId = await ref.read(messagesPortalClientProvider.future);
  if (!context.mounted) return null;
  final clients = portalClientId == null ? await ref.read(clientDirectoryProvider.future) : null;
  if (!context.mounted) return null;
  final options = [...?clients?.entries]..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

  final body = TextEditingController();
  String? clientId = portalClientId;
  String? createdId;
  try {
    final saved = await showFormSheet(
      context,
      title: portalClientId == null ? l10n.messagesNewTitle : l10n.messagesNewPortalTitle,
      submitLabel: l10n.messagesSend,
      fields: (context, setState) => [
        if (portalClientId == null)
          OptionField<String>(
            label: l10n.messagesClientLabel,
            value: clientId,
            options: [for (final entry in options) entry.id],
            labelOf: (id) => clients?.nameOf(id) ?? l10n.valueUnknown,
            validator: (value) => value == null ? l10n.validationRequired : null,
            onChanged: (value) => setState(() => clientId = value),
          ),
        TextFormField(
          controller: body,
          autofocus: portalClientId != null,
          minLines: 3,
          maxLines: 8,
          maxLength: feedbackCommentMaxLengthDefault,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(labelText: l10n.messagesFirstMessageLabel, alignLabelWithHint: true),
          validator: (value) => (value?.trim().isEmpty ?? true) ? l10n.validationRequired : null,
        ),
      ],
      onSubmit: () async {
        final id = clientId;
        if (id == null) return;
        createdId = await ref
            .read(messagesActionsProvider)
            .start((type: FeedbackSubjectTypes.client, id: id), body.text);
      },
    );
    return saved ? createdId : null;
  } finally {
    body.dispose();
  }
}
