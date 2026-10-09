import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../directory/application/directory_providers.dart';
import '../application/team_controller.dart';
import '../domain/invitation.dart';
import 'team_labels.dart';

class InvitationTile extends ConsumerWidget {
  const InvitationTile({required this.invitation, super.key});

  final Invitation invitation;

  Future<void> _revoke(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await confirmAction(
      context,
      title: l10n.teamRevokeTitle(invitation.email),
      body: l10n.teamRevokeBody,
      confirmLabel: l10n.teamRevoke,
      destructive: true,
    );
    if (!confirmed || !context.mounted) return;
    await runAction(context, () => ref.read(teamActionsProvider).revoke(invitation.id), success: l10n.teamRevoked);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final status = invitation.effectiveStatus();
    final clientName = ref.watch(clientDirectoryProvider).value?.nameOf(invitation.clientId);
    final expiresAt = invitation.expiresAt;
    final acceptedAt = invitation.acceptedAt;
    final when = switch (status) {
      InvitationStatuses.accepted when acceptedAt != null => l10n.teamInviteAccepted(formats.relative(acceptedAt)),
      InvitationStatuses.pending when expiresAt != null => l10n.teamInviteExpiresIn(formats.relative(expiresAt)),
      InvitationStatuses.expired when expiresAt != null => l10n.teamInviteExpiredAgo(formats.relative(expiresAt)),
      _ => null,
    };

    return SurfaceCard(
      semanticLabel: '${invitation.email}, ${invitationStatusLabel(l10n, status)}',
      child: Row(
        children: [
          InitialsAvatar(name: invitation.email, size: 40),
          SizedBox(width: tokens.md),
          Expanded(
            child: ExcludeSemantics(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(invitation.email, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleSmall),
                  Text(
                    [membershipTypeLabel(l10n, invitation.membershipType), ?clientName, ?when].join(' · '),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: text.bodySmall?.copyWith(color: tokens.muted),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(width: tokens.sm),
          StatusBadge(label: invitationStatusLabel(l10n, status), tone: invitationStatusTone(status), dense: true),
          if (invitation.canRevoke())
            PermissionGate(
              anyOf: const [Permissions.membersInvite],
              child: IconButton(
                tooltip: l10n.teamRevoke,
                icon: const Icon(Icons.block),
                onPressed: () => _revoke(context, ref),
              ),
            ),
        ],
      ),
    );
  }
}
