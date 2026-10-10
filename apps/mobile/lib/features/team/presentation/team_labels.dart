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

String employmentTypeLabel(AppLocalizations l10n, String? type) =>
    l10n.memberEmploymentTypeLabel(type ?? '');

String memberDocumentTypeLabel(AppLocalizations l10n, String type) => l10n.memberDocumentTypeLabel(type);

const hrTemplateTypes = <String>[
  TemplateTypes.offerLetter,
  TemplateTypes.salarySlip,
  TemplateTypes.nda,
  TemplateTypes.employmentAgreement,
];

bool isHrTemplate(String type) => hrTemplateTypes.contains(type);

String? hrDocumentTypeForTemplate(String templateType) => switch (templateType) {
      TemplateTypes.offerLetter => MemberDocumentTypes.offerLetter,
      TemplateTypes.salarySlip => MemberDocumentTypes.salarySlip,
      TemplateTypes.nda => MemberDocumentTypes.nda,
      TemplateTypes.employmentAgreement => MemberDocumentTypes.employmentAgreement,
      _ => null,
    };
