import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/team_controller.dart';
import '../domain/invitation.dart';
import '../domain/member.dart';
import 'invitation_tile.dart';
import 'member_card.dart';
import 'member_sheet.dart';
import 'team_forms.dart';
import 'team_labels.dart';

class TeamScreen extends ConsumerWidget {
  const TeamScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final canInvite = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.membersInvite)));

    Future<void> invite() async {
      final sent = await showInviteForm(context, ref);
      if (sent == null || !context.mounted) return;
      await showInviteLinkSheet(context, email: sent.email, link: sent.link);
    }

    return DefaultTabController(
      key: ValueKey(canInvite),
      length: canInvite ? 2 : 1,
      child: PageScaffold(
        title: l10n.navTeam,
        floatingActionButton: PermissionGate(
          anyOf: const [Permissions.membersInvite],
          child: CreateFab(label: l10n.teamInvite, icon: Icons.person_add_alt_1_outlined, onPressed: invite),
        ),
        bottom: canInvite
            ? TabBar(
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                tabs: [Tab(text: l10n.teamTabMembers), Tab(text: l10n.teamTabInvitations)],
              )
            : null,
        body: canInvite
            ? TabBarView(children: [_MembersTab(onInvite: invite), _InvitationsTab(onInvite: invite)])
            : _MembersTab(onInvite: invite),
      ),
    );
  }
}

class _MembersTab extends ConsumerStatefulWidget {
  const _MembersTab({required this.onInvite});

  final VoidCallback onInvite;

  @override
  ConsumerState<_MembersTab> createState() => _MembersTabState();
}

class _MembersTabState extends ConsumerState<_MembersTab> {
  String? _type;
  String? _roleId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final members = ref.watch(membersProvider);
    final currentUserId = ref.watch(currentUserIdProvider);
    final items = members.value ?? const <Member>[];
    final roleNames = {for (final m in items) for (final r in m.roles) r.id: r.name};
    final roleIds = roleNames.keys.toList()..sort((a, b) => (roleNames[a] ?? '').compareTo(roleNames[b] ?? ''));
    final types = MembershipTypes.values.where((t) => items.any((m) => m.membershipType == t)).toList();

    return ResourceList<Member>(
      value: members,
      onRefresh: () => ref.refresh(membersProvider.future),
      minTileWidth: 420,
      tileHeight: 168,
      searchHint: l10n.teamSearch,
      matches: (m, query) =>
          m.name.toLowerCase().contains(query) ||
          m.email.toLowerCase().contains(query) ||
          (m.title?.toLowerCase().contains(query) ?? false) ||
          m.roles.any((r) => r.name.toLowerCase().contains(query)),
      filter: (m) => (_type == null || m.membershipType == _type) && (_roleId == null || m.roleIds.contains(_roleId)),
      header: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (items.isNotEmpty) ...[
            Row(
              children: [
                Expanded(
                  child: MetricTile(
                    label: l10n.teamStatMembers,
                    icon: Icons.groups_outlined,
                    value: '${items.length}',
                  ),
                ),
                SizedBox(width: tokens.md),
                Expanded(
                  child: MetricTile(
                    label: l10n.teamStatStaff,
                    icon: Icons.badge_outlined,
                    value: '${items.where((m) => m.membershipType != MembershipTypes.client).length}',
                  ),
                ),
                SizedBox(width: tokens.md),
                Expanded(
                  child: MetricTile(
                    label: l10n.teamStatClients,
                    icon: Icons.handshake_outlined,
                    value: '${items.where((m) => m.membershipType == MembershipTypes.client).length}',
                  ),
                ),
              ],
            ),
            SizedBox(height: tokens.md),
          ],
          FilterBar<String>(
            options: types,
            selected: _type,
            labelOf: (t) => membershipTypeLabel(l10n, t),
            countOf: (t) => t == null ? items.length : items.where((m) => m.membershipType == t).length,
            onSelected: (t) => setState(() => _type = t),
          ),
          if (roleIds.isNotEmpty) ...[
            SizedBox(height: tokens.sm),
            Semantics(
              label: l10n.teamFilterByRole,
              child: FilterBar<String>(
                options: roleIds,
                selected: _roleId,
                labelOf: (id) => roleNames[id] ?? id,
                countOf: (id) => id == null ? items.length : items.where((m) => m.roleIds.contains(id)).length,
                onSelected: (id) => setState(() => _roleId = id),
              ),
            ),
          ],
        ],
      ),
      empty: EmptyState(
        icon: Icons.groups_outlined,
        title: l10n.teamEmpty,
        body: l10n.teamEmptyBody,
        action: PermissionGate(
          anyOf: const [Permissions.membersInvite],
          child: FilledButton.icon(
            onPressed: widget.onInvite,
            icon: const Icon(Icons.person_add_alt_1_outlined),
            label: Text(l10n.teamInvite),
          ),
        ),
      ),
      itemBuilder: (context, member) => MemberCard(
        member: member,
        isYou: member.userId == currentUserId,
        onTap: () => showMemberSheet(context, member.userId),
      ),
    );
  }
}

class _InvitationsTab extends ConsumerStatefulWidget {
  const _InvitationsTab({required this.onInvite});

  final VoidCallback onInvite;

  @override
  ConsumerState<_InvitationsTab> createState() => _InvitationsTabState();
}

class _InvitationsTabState extends ConsumerState<_InvitationsTab> {
  String? _status = InvitationStatuses.pending;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final invitations = ref.watch(invitationsProvider);
    final items = invitations.value ?? const <Invitation>[];
    final now = DateTime.now();

    return ResourceList<Invitation>(
      value: invitations,
      onRefresh: () => ref.refresh(invitationsProvider.future),
      minTileWidth: 420,
      tileHeight: 96,
      searchHint: l10n.teamInvitationsSearch,
      matches: (i, query) => i.email.toLowerCase().contains(query),
      filter: (i) => _status == null || i.effectiveStatus(now) == _status,
      header: FilterBar<String>(
        options: InvitationStatuses.values,
        selected: _status,
        labelOf: (s) => invitationStatusLabel(l10n, s),
        countOf: (s) => s == null ? items.length : items.where((i) => i.effectiveStatus(now) == s).length,
        onSelected: (s) => setState(() => _status = s),
      ),
      empty: EmptyState(
        icon: Icons.mail_outline,
        title: l10n.teamInvitationsEmpty,
        body: l10n.teamInvitationsEmptyBody,
        action: PermissionGate(
          anyOf: const [Permissions.membersInvite],
          child: FilledButton.icon(
            onPressed: widget.onInvite,
            icon: const Icon(Icons.person_add_alt_1_outlined),
            label: Text(l10n.teamInvite),
          ),
        ),
      ),
      itemBuilder: (context, invitation) => InvitationTile(invitation: invitation),
    );
  }
}
