import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/contracts/contracts.g.dart';
import '../../../../core/formatting/formats.dart';
import '../../../../core/theme/app_tokens.dart';
import '../../../../core/widgets/app_dialog.dart';
import '../../../../core/widgets/avatar.dart';
import '../../../../core/widgets/feedback.dart';
import '../../../../core/widgets/page_scaffold.dart';
import '../../../../core/widgets/state_views.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../core/widgets/surfaces.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../access/application/access_controller.dart';
import '../../../access/presentation/permission_gate.dart';
import '../../../departments/application/departments_controller.dart';
import '../../../departments/domain/department.dart';
import '../../../roles/application/roles_controller.dart';
import '../../../roles/domain/permission_catalog.dart';
import '../../../roles/presentation/permission_labels.dart' show permissionGroupLabel, permissionLabel;
import '../../application/team_controller.dart';
import '../../domain/member.dart';
import '../../domain/member_access.dart';
import '../team_forms.dart';
import '../team_labels.dart';

abstract final class MemberProtection {
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

class MemberOverviewTab extends ConsumerWidget {
  const MemberOverviewTab({required this.member, super.key});

  final Member member;

  Future<void> _deactivate(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await confirmAction(
      context,
      title: l10n.teamDeactivateTitle(member.name),
      body: l10n.teamDeactivateBody,
      confirmLabel: l10n.teamDeactivate,
      destructive: true,
    );
    if (!confirmed || !context.mounted) return;
    final ok = await runAction(
      context,
      () => ref.read(teamActionsProvider).deactivate(member.userId),
      success: l10n.teamDeactivated(member.name),
    );
    if (ok && context.mounted) context.pop();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final protection = MemberProtection.of(member, ref.watch(currentUserIdProvider));
    final manageable = protection == null && member.status == MemberStatuses.active;
    final canEditProfile = ref.watch(accessPolicyProvider).can(Permissions.membersEdit);
    final canManageRoles = ref.watch(accessPolicyProvider).can(Permissions.rolesManage);
    final canEditRoles = canManageRoles &&
        member.status == MemberStatuses.active &&
        member.membershipType != MembershipTypes.owner &&
        protection != MemberProtection.owner &&
        protection != MemberProtection.self;

    return ListView(
      padding: EdgeInsets.all(tokens.lg),
      children: [
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: ReadableBody.maxWidth),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    InitialsAvatar(name: member.name, seed: member.userId, size: 56),
                    SizedBox(width: tokens.lg),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(member.name, style: text.titleLarge),
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  member.title ?? l10n.valueUnknown,
                                  style: text.bodyMedium?.copyWith(color: tokens.muted),
                                ),
                              ),
                              if (canEditProfile && member.membershipType != MembershipTypes.client)
                                IconButton(
                                  tooltip: l10n.memberEditTitle,
                                  icon: const Icon(Icons.edit_outlined, size: 18),
                                  onPressed: () => _editTitle(context, ref),
                                ),
                            ],
                          ),
                          SizedBox(height: tokens.xs),
                          Wrap(
                            spacing: tokens.xs,
                            runSpacing: tokens.xs,
                            children: [
                              if (member.roles.isNotEmpty)
                                for (final role in member.roles.take(2))
                                  StatusBadge(label: role.name, tone: StatusTone.info),
                              if (member.employmentType != null)
                                StatusBadge(label: employmentTypeLabel(l10n, member.employmentType), tone: StatusTone.info),
                              StatusBadge(label: memberStatusLabel(l10n, member.status), tone: memberStatusTone(member.status)),
                              if (member.overrideCount > 0)
                                StatusBadge(label: l10n.agencyCustomAccess, tone: StatusTone.info),
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
                        value: Text(member.joinedAt == null ? l10n.valueUnknown : formats.date(member.joinedAt!)),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: tokens.lg),
                _PositionsSection(member: member, canEdit: canEditProfile),
                SizedBox(height: tokens.lg),
                SectionCard(
                  title: l10n.teamRoles,
                  trailing: canEditRoles
                      ? TextButton.icon(
                          onPressed: () async {
                            final saved = await showMemberRolesForm(context, ref, member);
                            if (saved && context.mounted) showToast(context, l10n.savedToast);
                          },
                          icon: const Icon(Icons.edit_outlined, size: 18),
                          label: Text(l10n.teamRolesEdit(member.name)),
                        )
                      : null,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (canEditRoles)
                        Text(l10n.memberRolesScopesHint, style: text.bodySmall?.copyWith(color: tokens.muted)),
                      if (canEditRoles) SizedBox(height: tokens.sm),
                      if (member.roles.isEmpty)
                        Text(l10n.teamRolesNone, style: text.bodyMedium?.copyWith(color: tokens.muted))
                      else
                        Wrap(
                          spacing: tokens.sm,
                          runSpacing: tokens.sm,
                          children: [
                            for (final role in member.roles)
                              Chip(
                                avatar: Icon(role.isSystem ? Icons.shield_outlined : Icons.shield_outlined, size: 16),
                                label: Text(role.name),
                              ),
                          ],
                        ),
                    ],
                  ),
                ),
                if (canManageRoles) ...[
                  SizedBox(height: tokens.lg),
                  _PermissionsSection(member: member, manageable: manageable),
                ],
                if (protection != null) ...[
                  SizedBox(height: tokens.lg),
                  Text(l10n.teamProtected(protection), style: text.bodySmall?.copyWith(color: tokens.muted)),
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
                        onPressed: () => _deactivate(context, ref),
                        icon: const Icon(Icons.person_off_outlined),
                        label: Text(l10n.teamDeactivate),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _editTitle(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final controller = TextEditingController(text: member.title ?? '');
    final saved = await showInputDialog(
      context,
      title: l10n.memberEditTitle,
      controller: controller,
      hint: l10n.memberTitleHint,
      maxLength: profileJobTitleMaxLength,
    );
    if (saved != true || !context.mounted) return;
    final title = controller.text.trim();
    final ok = await runAction(
      context,
      () => ref.read(teamActionsProvider).updateTitle(member.userId, title.isEmpty ? null : title),
      success: l10n.savedToast,
    );
    if (ok) ref.invalidate(memberProvider(member.userId));
  }
}

class _PositionsSection extends ConsumerWidget {
  const _PositionsSection({required this.member, required this.canEdit});

  final Member member;
  final bool canEdit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return SectionCard(
      title: l10n.memberPositions,
      trailing: canEdit && member.membershipType != MembershipTypes.client
          ? TextButton.icon(
              onPressed: () => _addPosition(context, ref),
              icon: const Icon(Icons.add, size: 18),
              label: Text(l10n.memberAddPosition),
            )
          : null,
      child: member.positions.isEmpty
          ? Text(l10n.memberPositionsEmpty, style: text.bodyMedium?.copyWith(color: tokens.muted))
          : Column(
              children: [
                for (final position in member.positions)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.badge_outlined),
                    title: Text(position.name),
                    subtitle: Text(position.departmentName),
                    trailing: position.isPrimary ? TagChip(label: l10n.memberPrimaryPosition) : null,
                  ),
              ],
            ),
    );
  }

  Future<void> _addPosition(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final roots = await ref.read(departmentTreeProvider.future);
    final nodes = flattenTree(roots);
    if (nodes.isEmpty) {
      if (context.mounted) showToast(context, l10n.departmentsEmpty);
      return;
    }
    if (!context.mounted) return;
    final department = await showPickerDialog<DepartmentNode>(
      context,
      title: l10n.memberPickDepartment,
      options: [
        for (final node in nodes)
          PickerOption(
            value: node,
            label: '${''.padLeft(node.depth * 2)}${node.department.name}',
          ),
      ],
    );
    if (department == null || !context.mounted) return;
    final positions = department.department.positions;
    if (positions.isEmpty) {
      showToast(context, l10n.memberNoPositionsInDepartment);
      return;
    }
    final picked = await showPickerDialog<String>(
      context,
      title: l10n.memberPickPosition,
      options: [
        for (final position in positions)
          PickerOption(value: position.id, label: position.name),
      ],
    );
    if (picked == null || !context.mounted) return;
    final ids = {...member.positions.map((p) => p.id), picked}.toList();
    await runAction(
      context,
      () => ref.read(teamActionsProvider).setPositions(member.userId, ids, primaryId: picked),
      success: l10n.savedToast,
    );
  }
}

class _PermissionsSection extends ConsumerStatefulWidget {
  const _PermissionsSection({required this.member, required this.manageable});

  final Member member;
  final bool manageable;

  @override
  ConsumerState<_PermissionsSection> createState() => _PermissionsSectionState();
}

class _PermissionsSectionState extends ConsumerState<_PermissionsSection> {
  final _pending = <String, String?>{};
  bool _dirty = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final access = ref.watch(memberAccessProvider(widget.member.userId));
    final groups = ref.watch(permissionGroupsProvider);
    return access.when(
      loading: () => SectionCard(title: l10n.memberPermissions, child: const Center(child: CircularProgressIndicator())),
      error: (e, _) => SectionCard(title: l10n.memberPermissions, child: ErrorState(error: e, onRetry: () => ref.invalidate(memberAccessProvider(widget.member.userId)))),
      data: (data) {
        final roles = ref.watch(rolesProvider).value ?? const [];
        final roleKeys = {
          for (final role in data.roles)
            for (final r in roles)
              if (r.id == role.id) ...r.permissionKeys,
        };
        final overrides = <String, String>{
          for (final o in data.overrides) o.key: o.effect,
          for (final entry in _pending.entries)
            if (entry.value != null) entry.key: entry.value!,
        };
        for (final key in _pending.keys.where((k) => _pending[k] == null)) {
          overrides.remove(key);
        }
        final effective = computeEffectivePermissions(rolePermissionKeys: roleKeys, overrides: overrides);
        return SectionCard(
          title: l10n.memberPermissions,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(l10n.memberPermissionsSummary(effective.length, overrides.length), style: Theme.of(context).textTheme.bodySmall),
              SizedBox(height: context.tokens.md),
              if (!widget.manageable)
                Text(l10n.memberPermissionOverridesReadOnly, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.tokens.muted)),
              for (final group in groups.asData?.value ?? const <PermissionGroup>[])
                ExpansionTile(
                  title: Text(permissionGroupLabel(l10n, group.key)),
                  subtitle: Text('${group.permissions.where((p) => effective.contains(p.key)).length}/${group.permissions.length}'),
                  children: [
                    for (final permission in group.permissions)
                      SwitchListTile(
                        title: Text(permissionLabel(l10n, permission.key)),
                        subtitle: Text(permission.key, style: Theme.of(context).textTheme.bodySmall),
                        value: effective.contains(permission.key),
                        onChanged: widget.manageable
                            ? (granted) => setState(() {
                                _pending[permission.key] = granted ? PermissionEffects.allow : PermissionEffects.deny;
                                _dirty = true;
                              })
                            : null,
                      ),
                  ],
                ),
              if (_dirty && widget.manageable)
                Padding(
                  padding: EdgeInsets.only(top: context.tokens.md),
                  child: FilledButton(
                    onPressed: () => _save(context),
                    child: Text(l10n.memberSavePermissions),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _save(BuildContext context) async {
    final l10n = AppLocalizations.of(context);
    final current = await ref.read(memberAccessProvider(widget.member.userId).future);
    final merged = <String, String>{
      for (final o in current.overrides) o.key: o.effect,
    };
    for (final entry in _pending.entries) {
      if (entry.value == null) {
        merged.remove(entry.key);
      } else {
        merged[entry.key] = entry.value!;
      }
    }
    final overrides = merged.entries.map((e) => PermissionOverride(key: e.key, effect: e.value)).toList();
    if (!context.mounted) return;
    final ok = await runAction(
      context,
      () => ref.read(teamActionsProvider).setPermissions(widget.member.userId, overrides),
      success: l10n.savedToast,
    );
    if (ok) {
      setState(() {
        _pending.clear();
        _dirty = false;
      });
    }
  }
}
