import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
import '../application/team_controller.dart';
import '../domain/member.dart';
import 'team_forms.dart';
import 'team_labels.dart';

/// Why a member cannot be changed from the team screen, matching the API's rules.
abstract final class _Protection {
  static const self = 'self';
  static const owner = 'owner';
  static const client = 'client';

  static String? of(Member member, String? currentUserId) {
    if (member.userId == currentUserId) return self;
    if (member.membershipType == MembershipTypes.owner) return owner;
    if (!member.isStaff) return client;
    return null;
  }
}

/// Opens a member's details with role, access-level and deactivation controls.
Future<void> showMemberSheet(BuildContext context, String userId) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => MemberSheet(userId: userId),
    );

class MemberSheet extends ConsumerWidget {
  const MemberSheet({required this.userId, super.key});

  static const _maxWidth = 640.0;

  final String userId;

  Future<void> _deactivate(BuildContext context, WidgetRef ref, Member member) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await confirmAction(
      context,
      title: l10n.teamDeactivateTitle(member.name),
      body: l10n.teamDeactivateBody,
      confirmLabel: l10n.teamDeactivate,
      destructive: true,
    );
    if (!confirmed || !context.mounted) return;
    final navigator = Navigator.of(context);
    final ok = await runAction(
      context,
      () => ref.read(teamActionsProvider).deactivate(member.userId),
      success: l10n.teamDeactivated(member.name),
    );
    if (ok) navigator.pop();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final members = ref.watch(membersProvider).value;
    final member = members?.where((m) => m.userId == userId).firstOrNull;
    if (member == null) {
      return SizedBox(
        height: 160,
        child: Center(child: members == null ? const CircularProgressIndicator() : Text(l10n.errorNotFound)),
      );
    }
    final protection = _Protection.of(member, ref.watch(currentUserIdProvider));
    final manageable = protection == null && member.status == MemberStatuses.active;
    final joinedAt = member.joinedAt;

    return Center(
      heightFactor: 1,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: _maxWidth),
        child: ListView(
          shrinkWrap: true,
          padding: EdgeInsets.fromLTRB(tokens.xl, 0, tokens.xl, tokens.xl),
          children: [
            Row(
              children: [
                InitialsAvatar(name: member.name, seed: member.userId, size: 56),
                SizedBox(width: tokens.lg),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Semantics(header: true, child: Text(member.name, style: text.titleLarge)),
                      if (member.title case final title?)
                        Text(title, style: text.bodyMedium?.copyWith(color: tokens.muted)),
                      SizedBox(height: tokens.xs),
                      Wrap(
                        spacing: tokens.xs,
                        runSpacing: tokens.xs,
                        children: [
                          StatusBadge(
                            label: membershipTypeLabel(l10n, member.membershipType),
                            tone: membershipTypeTone(member.membershipType),
                          ),
                          StatusBadge(label: memberStatusLabel(l10n, member.status), tone: memberStatusTone(member.status)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            SizedBox(height: tokens.lg),
            SectionCard(
              title: l10n.details,
              child: Column(
                children: [
                  InfoRow(
                    label: l10n.teamEmail,
                    icon: Icons.mail_outline,
                    value: InkWell(
                      onTap: () async {
                        await Clipboard.setData(ClipboardData(text: member.email));
                        if (context.mounted) showToast(context, l10n.teamEmailCopied);
                      },
                      child: Text(member.email, overflow: TextOverflow.ellipsis),
                    ),
                  ),
                  InfoRow(
                    label: l10n.teamJoined,
                    icon: Icons.event_outlined,
                    value: Text(joinedAt == null ? l10n.valueUnknown : formats.date(joinedAt)),
                  ),
                ],
              ),
            ),
            SizedBox(height: tokens.lg),
            SectionCard(
              title: l10n.teamRoles,
              trailing: manageable
                  ? PermissionGate(
                      anyOf: const [Permissions.rolesManage],
                      child: TextButton.icon(
                        onPressed: () async {
                          final saved = await showMemberRolesForm(context, ref, member);
                          if (saved && context.mounted) showToast(context, l10n.savedToast);
                        },
                        icon: const Icon(Icons.edit_outlined, size: 18),
                        label: Text(l10n.edit),
                      ),
                    )
                  : null,
              child: member.roles.isEmpty
                  ? Text(l10n.teamRolesNone, style: text.bodyMedium?.copyWith(color: tokens.muted))
                  : Wrap(
                      spacing: tokens.sm,
                      runSpacing: tokens.sm,
                      children: [
                        for (final role in member.roles)
                          Chip(
                            avatar: Icon(role.isSystem ? Icons.lock_outline : Icons.shield_outlined, size: 16),
                            label: Text(role.name),
                          ),
                      ],
                    ),
            ),
            SizedBox(height: tokens.lg),
            SectionCard(
              title: l10n.teamType,
              trailing: manageable
                  ? PermissionGate(
                      anyOf: const [Permissions.rolesManage],
                      child: TextButton.icon(
                        onPressed: () async {
                          final saved = await showMembershipTypeForm(context, ref, member);
                          if (saved && context.mounted) showToast(context, l10n.savedToast);
                        },
                        icon: const Icon(Icons.swap_horiz, size: 18),
                        label: Text(l10n.teamTypeChange),
                      ),
                    )
                  : null,
              child: Text(
                l10n.teamMembershipTypeHint(member.membershipType),
                style: text.bodyMedium?.copyWith(color: tokens.secondary),
              ),
            ),
            if (protection != null) ...[
              SizedBox(height: tokens.lg),
              Row(
                children: [
                  Icon(Icons.lock_outline, size: 18, color: tokens.muted),
                  SizedBox(width: tokens.sm),
                  Expanded(
                    child: Text(l10n.teamProtected(protection), style: text.bodySmall?.copyWith(color: tokens.muted)),
                  ),
                ],
              ),
            ],
            if (manageable)
              PermissionGate(
                anyOf: const [Permissions.membersDeactivate],
                child: Padding(
                  padding: EdgeInsets.only(top: tokens.xl),
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Theme.of(context).colorScheme.error,
                      side: BorderSide(color: Theme.of(context).colorScheme.error.withValues(alpha: 0.5)),
                    ),
                    onPressed: () => _deactivate(context, ref, member),
                    icon: const Icon(Icons.person_off_outlined),
                    label: Text(l10n.teamDeactivate),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
