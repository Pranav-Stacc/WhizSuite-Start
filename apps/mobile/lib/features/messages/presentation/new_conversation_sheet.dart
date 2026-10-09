import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../application/messages_providers.dart';
import '../domain/chat_models.dart';

enum _NewConversationKind { client, dm, group }

/// Starts a client room or DM. Portal members always message their agency via the client room.
/// Returns the room id for routing, or null when cancelled.
Future<String?> showNewConversationSheet(BuildContext context, WidgetRef ref) async {
  final l10n = AppLocalizations.of(context);
  final portalClientId = await ref.read(messagesPortalClientProvider.future);
  if (!context.mounted) return null;
  final clients = portalClientId == null ? await ref.read(clientDirectoryProvider.future) : null;
  final staff = portalClientId == null ? await ref.read(staffDirectoryProvider.future) : null;
  if (!context.mounted) return null;
  final clientOptions = [...?clients?.entries]..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
  final staffOptions = [...?staff?.entries]..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

  final body = TextEditingController();
  _NewConversationKind kind = _NewConversationKind.client;
  String? clientId = portalClientId;
  String? memberId;
  final groupMembers = <String>{};
  final groupName = TextEditingController();
  String? createdId;
  try {
    final saved = await showFormSheet(
      context,
      title: portalClientId == null ? l10n.messagesNewTitle : l10n.messagesNewPortalTitle,
      submitLabel: l10n.messagesSend,
      fields: (context, setState) => [
        if (portalClientId == null && staffOptions.isNotEmpty)
          OptionField<_NewConversationKind>(
            label: l10n.messagesNew,
            value: kind,
            options: _NewConversationKind.values,
            labelOf: (value) => switch (value) {
              _NewConversationKind.client => l10n.messagesClientConversation,
              _NewConversationKind.dm => l10n.navMessages,
              _NewConversationKind.group => l10n.messagesGroupConversation,
            },
            onChanged: (value) => setState(() {
              kind = value ?? _NewConversationKind.client;
              memberId = null;
              clientId = null;
              groupMembers.clear();
            }),
          ),
        if (portalClientId == null && kind == _NewConversationKind.client)
          OptionField<String>(
            label: l10n.messagesClientLabel,
            value: clientId,
            options: [for (final entry in clientOptions) entry.id],
            labelOf: (id) => clients?.nameOf(id) ?? l10n.valueUnknown,
            validator: (value) => value == null ? l10n.validationRequired : null,
            onChanged: (value) => setState(() => clientId = value),
          ),
        if (portalClientId == null && kind == _NewConversationKind.dm)
          OptionField<String>(
            label: l10n.navMessages,
            value: memberId,
            options: [for (final entry in staffOptions) entry.id],
            labelOf: (id) => staff?.nameOf(id) ?? l10n.valueUnknown,
            validator: (value) => value == null ? l10n.validationRequired : null,
            onChanged: (value) => setState(() => memberId = value),
          ),
        if (portalClientId == null && kind == _NewConversationKind.group) ...[
          TextFormField(
            controller: groupName,
            decoration: InputDecoration(labelText: l10n.messagesGroupNameLabel),
            validator: (value) => (value?.trim().isEmpty ?? true) ? l10n.validationRequired : null,
          ),
          for (final entry in staffOptions)
            CheckboxListTile(
              value: groupMembers.contains(entry.id),
              onChanged: (checked) => setState(() {
                if (checked ?? false) {
                  groupMembers.add(entry.id);
                } else {
                  groupMembers.remove(entry.id);
                }
              }),
              title: Text(entry.name),
              controlAffinity: ListTileControlAffinity.leading,
              dense: true,
            ),
        ],
        TextFormField(
          controller: body,
          autofocus: portalClientId != null,
          minLines: 3,
          maxLines: 8,
          maxLength: chatMessageMaxLength,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(labelText: l10n.messagesFirstMessageLabel, alignLabelWithHint: true),
          validator: (value) => (value?.trim().isEmpty ?? true) ? l10n.validationRequired : null,
        ),
      ],
      onSubmit: () async {
        final actions = ref.read(messagesActionsProvider);
        final ChatRoom room;
        if (portalClientId != null) {
          room = await actions.openClientRoom(portalClientId);
        } else if (kind == _NewConversationKind.dm) {
          final userId = memberId;
          if (userId == null) return;
          room = await actions.openDm(userId);
        } else if (kind == _NewConversationKind.group) {
          if (groupMembers.isEmpty) return;
          room = await actions.createGroup(name: groupName.text.trim(), memberUserIds: groupMembers.toList());
        } else {
          final id = clientId;
          if (id == null) return;
          room = await actions.openClientRoom(id);
        }
        createdId = await actions.startRoom(room, body: body.text);
      },
    );
    return saved ? createdId : null;
  } finally {
    body.dispose();
    groupName.dispose();
  }
}
