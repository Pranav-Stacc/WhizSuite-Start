import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../roles/application/roles_controller.dart';
import '../domain/scope_assignment.dart';
import 'scope_picker.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/forms/validators.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/forms.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../application/team_controller.dart';
import '../domain/invitation.dart';
import '../domain/member.dart';
import 'role_picker.dart';
import 'team_labels.dart';

/// Invitation lifetimes offered in the form, in hours; the API caps at 30 days.
const _expiryOptions = [24, 72, 168, 720];
const _hoursPerDay = 24;

/// Replace the full set of roles a member holds. Resolves to true when saved.
Future<bool> showMemberRolesForm(BuildContext context, WidgetRef ref, Member member) {
  final l10n = AppLocalizations.of(context);
  final roles = ref.read(assignableRolesProvider).value ?? const [];
  var selected = member.roleIds;
  var activeScopes = resolveActiveScopes(
    {AssignableScopeTypes.organization},
    offeredScopesForRoles(roles, selected),
  );
  final resourceIds = <String, Set<String>>{};
  final resourceTargeting = <String, ScopeResourceTargeting>{
    for (final scope in activeScopes)
      if (scopeNeedsResource(scope)) scope: ScopeResourceTargeting.specific,
  };
  return showFormSheet(
    context,
    title: l10n.teamRolesEdit(member.name),
    submitLabel: l10n.save,
    size: AppDialogSize.large,
    presentation: AppDialogPresentation.bottomSheet,
    fields: (context, setState) {
      final roles = ref.watch(assignableRolesProvider).value ?? const [];
      return [
        RolePickerField(
          selected: selected,
          onChanged: (value) => setState(() {
            selected = value;
            final currentRoles = ref.read(assignableRolesProvider).value ?? const [];
            activeScopes = resolveActiveScopes(activeScopes, offeredScopesForRoles(currentRoles, value));
          }),
        ),
        MemberDataScopeField(
          roles: roles,
          selectedRoleIds: selected,
          activeScopes: activeScopes,
          resourceIds: resourceIds,
          resourceTargeting: resourceTargeting,
          onActiveScopesChanged: (value) => setState(() => activeScopes = value),
          onResourceIdsChanged: (scope, ids) => setState(() => resourceIds[scope] = ids),
          onResourceTargetingChanged: (scope, mode) => setState(() => resourceTargeting[scope] = mode),
        ),
      ];
    },
    onSubmit: () {
      final currentRoles = ref.read(assignableRolesProvider).value ?? const [];
      final scopesToApply = resolveActiveScopes(activeScopes, offeredScopesForRoles(currentRoles, selected));
      return ref.read(teamActionsProvider).assignRoles(
            member.userId,
            selected.toList(),
            scopes: buildAssignmentScopes(scopesToApply, resourceIds, targeting: resourceTargeting),
          );
    },
  );
}

/// Switch a staff member between Manager and Creator. Resolves to true when saved.
Future<bool> showMembershipTypeForm(BuildContext context, WidgetRef ref, Member member) {
  final l10n = AppLocalizations.of(context);
  var type = member.membershipType;
  return showFormSheet(
    context,
    title: l10n.teamTypeChange,
    submitLabel: l10n.save,
    size: AppDialogSize.compact,
    fields: (context, setState) => [
      OptionField<String>(
        label: l10n.teamType,
        value: type,
        options: staffMembershipTypes,
        labelOf: (t) => membershipTypeLabel(l10n, t),
        onChanged: (value) => setState(() => type = value ?? type),
      ),
      Text(l10n.teamMembershipTypeHint(type), style: TextStyle(color: context.tokens.secondary)),
      _Notice(icon: Icons.info_outline, text: l10n.teamTypeChangeNotice),
    ],
    onSubmit: () async {
      if (type == member.membershipType) return;
      await ref.read(teamActionsProvider).changeType(member.userId, type);
    },
  );
}

/// Invite someone by email. Resolves to the invitee and shareable link once the invitation is created.
Future<({String email, InvitationLink link})?> showInviteForm(BuildContext context, WidgetRef ref) async {
  final l10n = AppLocalizations.of(context);
  final email = TextEditingController();
  final canPickRoles = ref.read(accessPolicyProvider).can(Permissions.rolesManage);
  var type = MembershipTypes.member;
  String? clientId;
  int? expiresInHours;
  var roleIds = <String>{};
  InvitationLink? link;

  final sent = await showFormSheet(
    context,
    title: l10n.teamInvite,
    subtitle: l10n.teamInviteBody,
    submitLabel: l10n.teamInviteSend,
    size: AppDialogSize.large,
    presentation: AppDialogPresentation.bottomSheet,
    fields: (context, setState) => [
      TextFormField(
        controller: email,
        autofocus: true,
        decoration: InputDecoration(labelText: l10n.teamEmail, hintText: l10n.teamEmailHint),
        keyboardType: TextInputType.emailAddress,
        autofillHints: const [AutofillHints.email],
        textInputAction: TextInputAction.next,
        validator: Validators(l10n).email,
      ),
      OptionField<String>(
        label: l10n.teamType,
        value: type,
        options: invitableMembershipTypes,
        labelOf: (t) => membershipTypeLabel(l10n, t),
        onChanged: (value) => setState(() => type = value ?? type),
      ),
      Text(l10n.teamMembershipTypeHint(type), style: TextStyle(color: context.tokens.muted)),
      if (type == MembershipTypes.client)
        _ClientField(value: clientId, onChanged: (value) => setState(() => clientId = value)),
      if (canPickRoles) ...[
        RolePickerField(
          selected: roleIds,
          required: false,
          onChanged: (value) => setState(() => roleIds = value),
        ),
        if (roleIds.isEmpty) Text(l10n.teamInviteDefaultRole, style: TextStyle(color: context.tokens.muted)),
      ],
      OptionField<int>(
        label: l10n.teamInviteExpiry,
        value: expiresInHours,
        options: _expiryOptions,
        allowNone: true,
        labelOf: (hours) => l10n.teamInviteExpiryDays(hours ~/ _hoursPerDay),
        onChanged: (value) => setState(() => expiresInHours = value),
      ),
    ],
    onSubmit: () async {
      if (type == MembershipTypes.client && clientId == null) {
        throw ApiException(kind: ApiFailureKind.validation, detail: l10n.teamClientRequired);
      }
      link = await ref.read(teamActionsProvider).invite(
            InvitationInput(
              email: email.text.trim(),
              membershipType: type,
              clientId: clientId,
              roleIds: roleIds.toList(),
              expiresInHours: expiresInHours,
            ),
          );
    },
  );
  final created = link;
  return sent && created != null ? (email: email.text.trim(), link: created) : null;
}

/// Shows the accept link after an invitation is sent, with copy actions for sharing it manually.
Future<void> showInviteLinkSheet(BuildContext context, {required String email, required InvitationLink link}) {
  final l10n = AppLocalizations.of(context);
  return showAppDialog<void>(
    context,
    size: AppDialogSize.standard,
    builder: (dialogContext) => AppDialog(
      title: l10n.teamInviteSent,
      subtitle: l10n.teamInviteSentBody(email),
      size: AppDialogSize.standard,
      actions: [
        FilledButton(onPressed: () => Navigator.of(dialogContext).pop(), child: Text(l10n.close)),
      ],
      child: _InviteLinkSheet(link: link),
    ),
  );
}

class _InviteLinkSheet extends StatelessWidget {
  const _InviteLinkSheet({required this.link});

  final InvitationLink link;

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
    final message = l10n.teamInviteShareText(link.acceptUrl);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(Icons.mark_email_read_outlined, size: 40, color: tokens.secondary),
        SizedBox(height: tokens.lg),
        SurfaceCard(
          padding: EdgeInsets.all(tokens.md),
          child: SelectableText(
            link.acceptUrl,
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
          onPressed: () => _copy(context, link.acceptUrl, l10n.teamLinkCopied),
          icon: const Icon(Icons.link),
          label: Text(l10n.teamCopyLink),
        ),
        SizedBox(height: tokens.sm),
        OutlinedButton.icon(
          onPressed: () => _copy(context, message, l10n.teamMessageCopied),
          icon: const Icon(Icons.content_copy_outlined),
          label: Text(l10n.teamCopyMessage),
        ),
      ],
    );
  }
}

/// Client picker for portal invitations; the API requires one for CLIENT memberships.
class _ClientField extends ConsumerWidget {
  const _ClientField({required this.value, required this.onChanged});

  final String? value;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final clients = ref.watch(clientDirectoryProvider);
    final entries = clients.value?.entries;
    if (entries == null) {
      return clients.hasError
          ? _Notice(icon: Icons.error_outline, text: l10n.teamClientUnavailable)
          : const LinearProgressIndicator();
    }
    if (entries.isEmpty) return _Notice(icon: Icons.business_outlined, text: l10n.teamClientNone);
    return OptionField<String>(
      label: l10n.teamClient,
      value: value,
      options: [for (final entry in entries) entry.id],
      labelOf: (id) => clients.value?.nameOf(id) ?? id,
      validator: (selected) => selected == null ? l10n.validationRequired : null,
      onChanged: onChanged,
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      padding: EdgeInsets.all(tokens.md),
      decoration: BoxDecoration(
        color: tokens.subtle,
        borderRadius: tokens.borderRadius,
        border: Border.all(color: tokens.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: tokens.secondary),
          SizedBox(width: tokens.sm),
          Expanded(child: Text(text, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.secondary))),
        ],
      ),
    );
  }
}
