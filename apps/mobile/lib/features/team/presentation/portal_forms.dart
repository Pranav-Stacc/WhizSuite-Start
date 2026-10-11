import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/forms.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../application/team_controller.dart';
import '../domain/invitation.dart';
import '../domain/portal_access.dart';
import 'team_forms.dart';

const _defaultMembershipTtlHours = 168;
const _defaultLinkTtlHours = 720;

/// Email invite for a single client's portal (CLIENT membership).
Future<bool> showPortalInviteForm(
  BuildContext context,
  WidgetRef ref, {
  required String clientId,
  required String clientName,
}) async {
  final l10n = AppLocalizations.of(context);
  final email = TextEditingController(text: '');
  InvitationLink? link;

  final sent = await showFormSheet(
    context,
    title: l10n.portalInviteHeading(clientName),
    subtitle: l10n.portalInviteBody,
    submitLabel: l10n.teamInviteSend,
    fields: (context, setState) => [
      TextFormField(
        controller: email,
        autofocus: true,
        decoration: InputDecoration(labelText: l10n.teamEmail, hintText: l10n.teamEmailHint),
        keyboardType: TextInputType.emailAddress,
        autofillHints: const [AutofillHints.email],
        validator: Validators(l10n).email,
      ),
    ],
    onSubmit: () async {
      link = await ref.read(teamActionsProvider).invite(
            InvitationInput(
              email: email.text.trim(),
              membershipType: MembershipTypes.client,
              clientId: clientId,
            ),
          );
    },
  );
  if (sent && link != null && context.mounted) {
    await showInviteLinkSheet(context, email: email.text.trim(), link: link!);
  }
  return sent;
}

/// Multi-use shareable portal link for web or app deep link.
Future<bool> showPortalAccessLinkForm(
  BuildContext context,
  WidgetRef ref, {
  required String clientId,
  required String clientName,
}) async {
  final l10n = AppLocalizations.of(context);
  var accessMode = PortalAccessModes.temporary;
  int? membershipTtlHours = _defaultMembershipTtlHours;
  int? maxUses;
  PortalAccessLink? created;

  final saved = await showFormSheet(
    context,
    title: l10n.portalLinkHeading(clientName),
    subtitle: l10n.portalLinkBody,
    submitLabel: l10n.portalLinkCreate,
    size: AppDialogSize.large,
    fields: (context, setState) => [
      OptionField<String>(
        label: l10n.portalLinkAccessMode,
        value: accessMode,
        options: PortalAccessModes.values,
        labelOf: (mode) => l10n.portalLinkMode(mode),
        onChanged: (value) => setState(() {
          accessMode = value ?? accessMode;
          if (accessMode == PortalAccessModes.permanent) membershipTtlHours = null;
        }),
      ),
      Text(l10n.portalLinkAccessModeHint, style: TextStyle(color: context.tokens.muted)),
      if (accessMode == PortalAccessModes.temporary)
        TextFormField(
          initialValue: membershipTtlHours?.toString(),
          decoration: InputDecoration(
            labelText: l10n.portalLinkMembershipTtl,
            hintText: l10n.portalLinkMembershipTtlHint,
          ),
          keyboardType: TextInputType.number,
          onChanged: (value) => membershipTtlHours = int.tryParse(value.trim()),
        ),
      TextFormField(
        decoration: InputDecoration(
          labelText: l10n.portalLinkMaxUses,
          hintText: l10n.portalLinkMaxUsesHint,
        ),
        keyboardType: TextInputType.number,
        onChanged: (value) {
          final parsed = int.tryParse(value.trim());
          maxUses = parsed == null || parsed <= 0 ? null : parsed;
        },
      ),
    ],
    onSubmit: () async {
      created = await ref.read(teamActionsProvider).createPortalAccessLink(
            clientId: clientId,
            accessMode: accessMode,
            linkExpiresInHours: _defaultLinkTtlHours,
            membershipTtlHours: membershipTtlHours,
            maxUses: maxUses,
          );
    },
  );

  if (saved && created != null && context.mounted) {
    await showPortalLinkSheet(context, link: created!);
  }
  return saved;
}

Future<void> showPortalLinkSheet(BuildContext context, {required PortalAccessLink link}) {
  final l10n = AppLocalizations.of(context);
  return showAppDialog<void>(
    context,
    size: AppDialogSize.standard,
    builder: (dialogContext) => AppDialog(
      title: l10n.portalLinkCreated,
      size: AppDialogSize.standard,
      actions: [
        FilledButton(onPressed: () => Navigator.of(dialogContext).pop(), child: Text(l10n.close)),
      ],
      child: _PortalLinkSheet(link: link),
    ),
  );
}

class _PortalLinkSheet extends StatelessWidget {
  const _PortalLinkSheet({required this.link});

  final PortalAccessLink link;

  Future<void> _copy(BuildContext context, String value, String toast) async {
    await Clipboard.setData(ClipboardData(text: value));
    if (context.mounted) showToast(context, toast);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final expiresAt = link.expiresAt;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(Icons.link, size: 40, color: tokens.secondary),
        SizedBox(height: tokens.lg),
        SurfaceCard(
          padding: EdgeInsets.all(tokens.md),
          child: SelectableText(
            link.shareUrl,
            style: text.bodySmall?.copyWith(fontFamily: 'monospace', color: tokens.fg),
          ),
        ),
        if (expiresAt != null) ...[
          SizedBox(height: tokens.sm),
          Text(
            l10n.teamInviteExpires(context.formats.dateTime(expiresAt)),
            style: text.bodySmall?.copyWith(color: tokens.muted),
          ),
        ],
        SizedBox(height: tokens.lg),
        FilledButton.icon(
          onPressed: () => _copy(context, link.shareUrl, l10n.teamLinkCopied),
          icon: const Icon(Icons.link),
          label: Text(l10n.teamCopyLink),
        ),
      ],
    );
  }
}
