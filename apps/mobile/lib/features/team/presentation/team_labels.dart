import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/invitation.dart';
import '../domain/member.dart';

String membershipTypeLabel(AppLocalizations l10n, String type) => l10n.teamMembershipType(type);

StatusTone membershipTypeTone(String type) => switch (type) {
      MembershipTypes.owner => StatusTone.violet,
      MembershipTypes.admin => StatusTone.info,
      MembershipTypes.client => StatusTone.pink,
      _ => StatusTone.neutral,
    };

String memberStatusLabel(AppLocalizations l10n, String status) => l10n.teamMemberStatus(status);

StatusTone memberStatusTone(String status) => switch (status) {
      MemberStatuses.active => StatusTone.success,
      MemberStatuses.invited => StatusTone.warning,
      _ => StatusTone.neutral,
    };

String invitationStatusLabel(AppLocalizations l10n, String status) => l10n.teamInvitationStatus(status);

StatusTone invitationStatusTone(String status) => switch (status) {
      InvitationStatuses.pending => StatusTone.warning,
      InvitationStatuses.accepted => StatusTone.success,
      InvitationStatuses.expired => StatusTone.danger,
      _ => StatusTone.neutral,
    };
