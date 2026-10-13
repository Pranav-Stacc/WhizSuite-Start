import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/contracts/contracts.g.dart';
import '../../../../core/theme/app_tokens.dart';
import '../../../../core/widgets/avatar.dart';
import '../../../../core/widgets/feedback.dart';
import '../../../../core/widgets/keep_alive_tab.dart';
import '../../../../core/widgets/page_scaffold.dart';
import '../../../../core/widgets/resource_list.dart';
import '../../../../core/widgets/state_views.dart';
import '../../../../core/widgets/surfaces.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../access/application/access_controller.dart';
import '../../../access/domain/access_policy.dart';
import '../../domain/invitation.dart';
import '../../../access/presentation/permission_gate.dart';
import '../../../departments/application/departments_controller.dart';
import '../../../departments/departments_routes.dart';
import '../../../departments/presentation/department_forms.dart';
import '../../../departments/presentation/department_tree_view.dart';
import '../../../knowledge/application/knowledge_controller.dart';
import '../../../knowledge/knowledge_routes.dart';
import '../../../knowledge/presentation/article_forms.dart';
import '../../../templates/presentation/template_forms.dart';
import '../../../knowledge/presentation/article_labels.dart';
import '../../../roles/application/roles_controller.dart';
import '../../../roles/presentation/role_card.dart';
import '../../../roles/roles_routes.dart';
import '../../application/team_controller.dart';
import '../../domain/member.dart';
import '../../team_routes.dart';
import '../invitation_tile.dart';
import '../member_card.dart';
import '../team_forms.dart';
import '../member/member_filters_sheet.dart';
import '../team_labels.dart';
import 'agency_hr_documents_tab.dart';

enum _AgencyTab { overview, members, departments, roles, knowledge, documents }

class AgencyScreen extends ConsumerStatefulWidget {
  const AgencyScreen({super.key});

  @override
  ConsumerState<AgencyScreen> createState() => _AgencyScreenState();
}

class _AgencyScreenState extends ConsumerState<AgencyScreen> with TickerProviderStateMixin {
  TabController? _tabs;
  List<_AgencyTab> _visibleTabs = const [];
  bool _warmed = false;

  static bool _tabsEqual(List<_AgencyTab> a, List<_AgencyTab> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  void _warmCaches(AccessPolicy policy) {
    if (_warmed) return;
    _warmed = true;
    if (policy.can(Permissions.membersView)) ref.read(membersProvider.future);
    if (policy.can(Permissions.orgView)) {
      ref.read(departmentsProvider.future);
      ref.read(articlesProvider.future);
    }
    if (policy.can(Permissions.rolesManage)) ref.read(rolesProvider.future);
    if (policy.can(Permissions.membersInvite)) ref.read(invitationsProvider.future);
  }

  @override
  void dispose() {
    _tabs?.removeListener(_onTabChanged);
    _tabs?.dispose();
    super.dispose();
  }

  List<_AgencyTab> _tabsFor(AccessPolicy policy, bool canInvite) {
    final tabs = <_AgencyTab>[_AgencyTab.overview];
    if (policy.can(Permissions.membersView)) tabs.add(_AgencyTab.members);
    if (policy.can(Permissions.orgView)) tabs.add(_AgencyTab.departments);
    if (policy.can(Permissions.rolesManage)) tabs.add(_AgencyTab.roles);
    if (policy.can(Permissions.orgView)) tabs.add(_AgencyTab.knowledge);
    if (policy.can(Permissions.orgSettingsManage)) tabs.add(_AgencyTab.documents);
    return tabs;
  }

  void _ensureTabs(AccessPolicy policy, bool canInvite) {
    final tabs = _tabsFor(policy, canInvite);
    if (_tabs != null && _tabsEqual(_visibleTabs, tabs)) return;
    final previousIndex = _tabs?.index ?? 0;
    _tabs?.removeListener(_onTabChanged);
    _tabs?.dispose();
    _visibleTabs = tabs;
    _tabs = TabController(
      length: tabs.length,
      vsync: this,
      initialIndex: previousIndex.clamp(0, tabs.length - 1),
    );
    _tabs!.addListener(_onTabChanged);
  }

  void _onTabChanged() {
    if (_tabs?.indexIsChanging ?? false) return;
    setState(() {});
  }

  Future<void> _invite() async {
    final sent = await showInviteForm(context, ref);
    if (sent == null || !mounted) return;
    await showInviteLinkSheet(context, email: sent.email, link: sent.link);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final policy = ref.watch(accessPolicyProvider);
    final canInvite = policy.can(Permissions.membersInvite);
    _ensureTabs(policy, canInvite);
    _warmCaches(policy);
    final tabs = _visibleTabs;
    final controller = _tabs!;

    Widget? fab;
    final index = controller.index;
    if (index < tabs.length) {
      fab = switch (tabs[index]) {
        _AgencyTab.members => PermissionGate(
            anyOf: const [Permissions.membersInvite],
            child: CreateFab(label: l10n.teamInvite, icon: Icons.person_add_alt_1_outlined, onPressed: _invite),
          ),
        _AgencyTab.departments => PermissionGate(
            anyOf: const [Permissions.orgSettingsManage],
            child: CreateFab(
              label: l10n.departmentNew,
              onPressed: () async {
                final created = await showDepartmentForm(context, ref);
                if (created && mounted) showToast(context, l10n.createdToast);
              },
            ),
          ),
        _AgencyTab.roles => PermissionGate(
            anyOf: const [Permissions.rolesManage],
            child: CreateFab(label: l10n.roleNew, onPressed: () => context.push(RolesRoutes.create)),
          ),
        _AgencyTab.knowledge => PermissionGate(
            anyOf: const [Permissions.orgSettingsManage],
            child: CreateFab(
              label: l10n.knowledgeNew,
              onPressed: () async {
                final created = await showArticleForm(context, ref);
                if (created && mounted) showToast(context, l10n.knowledgePublishedToast);
              },
            ),
          ),
        _AgencyTab.documents => PermissionGate(
            anyOf: const [Permissions.orgSettingsManage],
            child: CreateFab(
              label: l10n.templateNew,
              onPressed: () async {
                final created = await showTemplateForm(context, ref);
                if (created && mounted) showToast(context, l10n.createdToast);
              },
            ),
          ),
        _ => null,
      };
    }

    return PageScaffold(
      title: l10n.navTeam,
      floatingActionButton: fab,
      bottom: TabBar(
        controller: controller,
        isScrollable: true,
        tabAlignment: TabAlignment.start,
        tabs: [
          for (final tab in tabs)
            Tab(
              text: switch (tab) {
                _AgencyTab.overview => l10n.agencyTabOverview,
                _AgencyTab.members => l10n.teamTabMembers,
                _AgencyTab.departments => l10n.navDepartments,
                _AgencyTab.roles => l10n.navRoles,
                _AgencyTab.knowledge => l10n.knowledgeTitle,
                _AgencyTab.documents => l10n.agencyTabHrDocuments,
              },
            ),
        ],
      ),
      body: TabBarView(
        controller: controller,
        children: [
          for (final tab in tabs)
            KeepAliveTab(
              child: switch (tab) {
                _AgencyTab.overview => _OverviewTab(
                    onSelectTab: (tab) => controller.animateTo(tabs.indexOf(tab)),
                    onInvite: _invite,
                  ),
                _AgencyTab.members => _MembersTab(onInvite: _invite),
                _AgencyTab.departments => DepartmentTreeView(
                    onTap: (node) => context.push(DepartmentsRoutes.detail(node.department.id)),
                  ),
                _AgencyTab.roles => const _RolesTab(),
                _AgencyTab.knowledge => const _KnowledgeTab(),
                _AgencyTab.documents => const AgencyHrDocumentsTab(),
              },
            ),
        ],
      ),
    );
  }
}

class _OverviewTab extends ConsumerWidget {
  const _OverviewTab({required this.onSelectTab, required this.onInvite});

  final ValueChanged<_AgencyTab> onSelectTab;
  final VoidCallback onInvite;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final policy = ref.watch(accessPolicyProvider);
    final members = ref.watch(membersProvider).value ?? const <Member>[];
    final departments = policy.can(Permissions.orgView) ? ref.watch(departmentsProvider).value?.length ?? 0 : 0;
    final roles = policy.can(Permissions.rolesManage) ? ref.watch(rolesProvider).value?.length ?? 0 : 0;
    final articles = policy.can(Permissions.orgView) ? ref.watch(articlesProvider).value?.length ?? 0 : 0;
    final invitations = policy.can(Permissions.membersInvite)
        ? ref.watch(invitationsProvider).value ?? const <Invitation>[]
        : const <Invitation>[];
    final pendingInvites =
        invitations.where((i) => i.effectiveStatus(DateTime.now()) == InvitationStatuses.pending).length;
    final unassigned = members.where((m) => m.positions.isEmpty && m.membershipType != MembershipTypes.client).toList();

    final staff = members.where((m) => m.membershipType != MembershipTypes.client).length;
    final clients = members.where((m) => m.membershipType == MembershipTypes.client).length;

    return RefreshIndicator(
      onRefresh: () async {
        final futures = <Future<void>>[];
        if (policy.can(Permissions.membersView)) futures.add(ref.refresh(membersProvider.future));
        if (policy.can(Permissions.orgView)) futures.add(ref.refresh(departmentsProvider.future));
        if (policy.can(Permissions.rolesManage)) futures.add(ref.refresh(rolesProvider.future));
        if (policy.can(Permissions.orgView)) futures.add(ref.refresh(articlesProvider.future));
        if (policy.can(Permissions.membersInvite)) futures.add(ref.refresh(invitationsProvider.future));
        await Future.wait(futures);
      },
      child: ListView(
        padding: EdgeInsets.all(tokens.lg),
        children: [
          Text(l10n.agencyBoardEyebrow, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted, letterSpacing: 1.2)),
          SizedBox(height: tokens.xs),
          Text(l10n.agencyBoardTitle, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          SizedBox(height: tokens.xs),
          Text(l10n.agencyBoardSubtitle, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted)),
          SizedBox(height: tokens.lg),
          _HeroStats(
            members: members.length,
            staff: staff,
            clients: clients,
            departments: departments,
            roles: roles,
            articles: articles,
            pendingInvites: pendingInvites,
          ),
          SizedBox(height: tokens.lg),
          _AgencyNavGrid(
            policy: policy,
            canInvite: policy.can(Permissions.membersInvite),
            onSelectTab: onSelectTab,
            onInvite: onInvite,
          ),
          SizedBox(height: tokens.lg),
          if (unassigned.isNotEmpty) ...[
            SectionCard(
              title: l10n.agencyUnassignedMembers,
              child: Column(
                children: [
                  for (final member in unassigned.take(5))
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: InitialsAvatar(name: member.name, seed: member.userId, size: 36),
                      title: Text(member.name),
                      subtitle: Text(member.email, maxLines: 1, overflow: TextOverflow.ellipsis),
                      trailing: PermissionGate(
                        anyOf: const [Permissions.membersEdit],
                        child: TextButton(
                          onPressed: () => context.push(TeamRoutes.member(member.userId)),
                          child: Text(l10n.agencyAssignMember),
                        ),
                      ),
                      onTap: () => context.push(TeamRoutes.member(member.userId)),
                    ),
                ],
              ),
            ),
            SizedBox(height: tokens.lg),
          ],
          if (pendingInvites > 0 && policy.can(Permissions.membersInvite)) ...[
            SectionCard(
              title: l10n.teamTabInvitations,
              trailing: TextButton(onPressed: () => onSelectTab(_AgencyTab.members), child: Text(l10n.viewAll)),
              child: Text(l10n.agencyPendingInvites(pendingInvites)),
            ),
            SizedBox(height: tokens.lg),
          ],
          SectionCard(
            title: l10n.agencyQuickActions,
            child: Wrap(
              spacing: tokens.sm,
              runSpacing: tokens.sm,
              children: [
                if (policy.can(Permissions.membersInvite))
                  ActionChip(
                    avatar: const Icon(Icons.person_add_alt_1_outlined, size: 18),
                    label: Text(l10n.teamInvite),
                    onPressed: onInvite,
                  ),
                if (policy.can(Permissions.orgSettingsManage))
                  ActionChip(
                    avatar: const Icon(Icons.account_tree_outlined, size: 18),
                    label: Text(l10n.departmentNew),
                    onPressed: () async {
                      final created = await showDepartmentForm(context, ref);
                      if (created && context.mounted) showToast(context, l10n.createdToast);
                    },
                  ),
                if (policy.can(Permissions.rolesManage))
                  ActionChip(
                    avatar: const Icon(Icons.admin_panel_settings_outlined, size: 18),
                    label: Text(l10n.roleNew),
                    onPressed: () => context.push(RolesRoutes.create),
                  ),
                if (policy.can(Permissions.orgSettingsManage))
                  ActionChip(
                    avatar: const Icon(Icons.menu_book_outlined, size: 18),
                    label: Text(l10n.knowledgeNew),
                    onPressed: () async {
                      final created = await showArticleForm(context, ref);
                      if (created && context.mounted) showToast(context, l10n.knowledgePublishedToast);
                    },
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroStats extends StatelessWidget {
  const _HeroStats({
    required this.members,
    required this.staff,
    required this.clients,
    required this.departments,
    required this.roles,
    required this.articles,
    required this.pendingInvites,
  });

  final int members;
  final int staff;
  final int clients;
  final int departments;
  final int roles;
  final int articles;
  final int pendingInvites;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.agencyBoardOnTheFloor, style: text.labelMedium?.copyWith(color: tokens.secondary)),
          SizedBox(height: tokens.sm),
          Wrap(
            spacing: tokens.md,
            runSpacing: tokens.sm,
            children: [
              _CompactStat(label: l10n.teamStatMembers, value: '$members'),
              _CompactStat(label: l10n.teamStatStaff, value: '$staff'),
              _CompactStat(label: l10n.teamStatClients, value: '$clients'),
              _CompactStat(label: l10n.navDepartments, value: '$departments'),
              _CompactStat(label: l10n.navRoles, value: '$roles'),
              _CompactStat(label: l10n.knowledgeTitle, value: '$articles'),
              if (pendingInvites > 0) _CompactStat(label: l10n.teamTabInvitations, value: '$pendingInvites'),
            ],
          ),
          SizedBox(height: tokens.sm),
          Text(l10n.agencyBoardStaffLine(staff, clients), style: text.bodySmall?.copyWith(color: tokens.muted)),
        ],
      ),
    );
  }
}

class _CompactStat extends StatelessWidget {
  const _CompactStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(value, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        SizedBox(width: tokens.xs),
        Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted)),
      ],
    );
  }
}

class _AgencyNavGrid extends StatelessWidget {
  const _AgencyNavGrid({
    required this.policy,
    required this.canInvite,
    required this.onSelectTab,
    required this.onInvite,
  });

  final AccessPolicy policy;
  final bool canInvite;
  final ValueChanged<_AgencyTab> onSelectTab;
  final VoidCallback onInvite;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;

    Widget tile({required IconData icon, required String label, required VoidCallback onTap}) {
      return Material(
        color: tokens.subtle,
        borderRadius: tokens.borderRadius,
        child: InkWell(
          onTap: onTap,
          borderRadius: tokens.borderRadius,
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: tokens.md, vertical: tokens.lg),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: tokens.primary),
                SizedBox(height: tokens.sm),
                Text(label, textAlign: TextAlign.center, style: Theme.of(context).textTheme.labelLarge),
              ],
            ),
          ),
        ),
      );
    }

    final cells = <Widget>[];
    if (policy.can(Permissions.membersView)) {
      cells.add(tile(icon: Icons.groups_outlined, label: l10n.agencyBoardPeople, onTap: () => onSelectTab(_AgencyTab.members)));
    }
    if (policy.can(Permissions.orgView)) {
      cells.add(tile(icon: Icons.account_tree_outlined, label: l10n.agencyBoardStructure, onTap: () => onSelectTab(_AgencyTab.departments)));
    }
    if (policy.can(Permissions.rolesManage)) {
      cells.add(tile(icon: Icons.admin_panel_settings_outlined, label: l10n.agencyBoardAccess, onTap: () => onSelectTab(_AgencyTab.roles)));
    }
    if (policy.can(Permissions.orgView)) {
      cells.add(tile(icon: Icons.menu_book_outlined, label: l10n.agencyBoardPlaybook, onTap: () => onSelectTab(_AgencyTab.knowledge)));
    }
    if (policy.can(Permissions.orgSettingsManage)) {
      cells.add(tile(icon: Icons.folder_shared_outlined, label: l10n.agencyTabHrDocuments, onTap: () => onSelectTab(_AgencyTab.documents)));
    }
    if (canInvite) {
      cells.add(tile(icon: Icons.person_add_alt_1_outlined, label: l10n.teamInvite, onTap: onInvite));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.agencyBoardLaunchPad, style: Theme.of(context).textTheme.titleSmall),
        SizedBox(height: tokens.sm),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: tokens.sm,
          crossAxisSpacing: tokens.sm,
          childAspectRatio: 1.45,
          children: cells,
        ),
      ],
    );
  }
}

class _MembersTab extends ConsumerStatefulWidget {
  const _MembersTab({required this.onInvite});

  final VoidCallback onInvite;

  @override
  ConsumerState<_MembersTab> createState() => _MembersTabState();
}

class _MembersFilters extends StatelessWidget {
  const _MembersFilters({
    required this.items,
    required this.filters,
    required this.roleNames,
    required this.departmentNames,
    required this.onFilterPressed,
  });

  final List<Member> items;
  final MemberListFilters filters;
  final Map<String, String> roleNames;
  final Map<String, String> departmentNames;
  final VoidCallback onFilterPressed;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final staff = items.where((m) => m.membershipType != MembershipTypes.client).length;
    final clients = items.where((m) => m.membershipType == MembershipTypes.client).length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: MetricTile(label: l10n.teamStatMembers, icon: Icons.groups_outlined, value: '${items.length}')),
            SizedBox(width: tokens.md),
            Expanded(child: MetricTile(label: l10n.teamStatStaff, icon: Icons.badge_outlined, value: '$staff')),
            SizedBox(width: tokens.md),
            Expanded(child: MetricTile(label: l10n.teamStatClients, icon: Icons.handshake_outlined, value: '$clients')),
          ],
        ),
        SizedBox(height: tokens.md),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Wrap(
                spacing: tokens.sm,
                runSpacing: tokens.sm,
                children: [
                  if (filters.isEmpty)
                    Text(l10n.filterAll, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted))
                  else ...[
                    if (filters.membershipType != null)
                      Chip(label: Text(membershipTypeLabel(l10n, filters.membershipType!))),
                    if (filters.roleId != null)
                      Chip(label: Text(roleNames[filters.roleId] ?? filters.roleId!)),
                    if (filters.departmentId != null)
                      Chip(label: Text(departmentNames[filters.departmentId] ?? filters.departmentId!)),
                  ],
                ],
              ),
            ),
            IconButton(
              tooltip: l10n.memberFilterTitle,
              onPressed: onFilterPressed,
              icon: Badge(
                isLabelVisible: filters.activeCount > 0,
                label: Text('${filters.activeCount}'),
                child: const Icon(Icons.filter_list),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _MembersTabState extends ConsumerState<_MembersTab> {
  MemberListFilters _filters = const MemberListFilters();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final policy = ref.watch(accessPolicyProvider);
    final canInvite = policy.can(Permissions.membersInvite);
    final invitations = canInvite ? ref.watch(invitationsProvider) : null;
    final pendingInvites = invitations?.value
            ?.where((i) => i.effectiveStatus(DateTime.now()) == InvitationStatuses.pending)
            .toList() ??
        const <Invitation>[];
    final members = ref.watch(membersProvider);
    final currentUserId = ref.watch(currentUserIdProvider);
    final items = members.value ?? const <Member>[];
    final roleNames = {for (final m in items) for (final r in m.roles) r.id: r.name};
    final roleIds = roleNames.keys.toList()..sort((a, b) => (roleNames[a] ?? '').compareTo(roleNames[b] ?? ''));
    final types = MembershipTypes.values.where((t) => items.any((m) => m.membershipType == t)).toList();
    final departmentNames = <String, String>{};
    for (final member in items) {
      for (final position in member.positions) {
        departmentNames[position.departmentId] = position.departmentName;
      }
    }
    final departmentIds = departmentNames.keys.toList()..sort((a, b) => departmentNames[a]!.compareTo(departmentNames[b]!));

    Widget? invitationsHeader;
    if (canInvite && pendingInvites.isNotEmpty) {
      invitationsHeader = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.teamTabInvitations, style: Theme.of(context).textTheme.titleSmall),
          SizedBox(height: context.tokens.sm),
          for (final invitation in pendingInvites.take(6))
            InvitationTile(invitation: invitation),
          if (pendingInvites.length > 6)
            Padding(
              padding: EdgeInsets.only(top: context.tokens.sm),
              child: Text(
                l10n.agencyPendingInvites(pendingInvites.length),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: context.tokens.muted),
              ),
            ),
          SizedBox(height: context.tokens.lg),
        ],
      );
    }

    return ResourceList<Member>(
      value: members,
      onRefresh: () => Future.wait([
        ref.refresh(membersProvider.future),
        if (canInvite) ref.refresh(invitationsProvider.future),
      ]),
      minTileWidth: 520,
      tileHeight: 148,
      searchHint: l10n.teamSearch,
      matches: (m, query) =>
          m.name.toLowerCase().contains(query) ||
          m.email.toLowerCase().contains(query) ||
          (m.title?.toLowerCase().contains(query) ?? false) ||
          m.roles.any((r) => r.name.toLowerCase().contains(query)) ||
          m.positions.any((p) => p.name.toLowerCase().contains(query) || p.departmentName.toLowerCase().contains(query)),
      filter: (m) =>
          (_filters.membershipType == null || m.membershipType == _filters.membershipType) &&
          (_filters.roleId == null || m.roleIds.contains(_filters.roleId)) &&
          (_filters.departmentId == null || m.departmentIds.contains(_filters.departmentId)),
      header: items.isEmpty && invitationsHeader == null
          ? invitationsHeader
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (invitationsHeader != null) invitationsHeader,
                if (items.isNotEmpty)
                  _MembersFilters(
                    items: items,
                    filters: _filters,
                    roleNames: roleNames,
                    departmentNames: departmentNames,
                    onFilterPressed: () async {
                      final next = await showMemberFiltersSheet(
                        context,
                        initial: _filters,
                        membershipTypes: types,
                        roleIds: roleIds,
                        roleNames: roleNames,
                        departmentIds: departmentIds,
                        departmentNames: departmentNames,
                      );
                      if (next != null) setState(() => _filters = next);
                    },
                  ),
              ],
            ),
      empty: EmptyState(
        icon: Icons.groups_outlined,
        title: l10n.teamEmpty,
        body: l10n.teamEmptyBody,
        action: PermissionGate(
          anyOf: const [Permissions.membersInvite],
          child: FilledButton.icon(onPressed: widget.onInvite, icon: const Icon(Icons.person_add_alt_1_outlined), label: Text(l10n.teamInvite)),
        ),
      ),
      itemBuilder: (context, member) => MemberCard(
        member: member,
        isYou: member.userId == currentUserId,
        compact: true,
        onTap: () => context.push(TeamRoutes.member(member.userId)),
      ),
    );
  }
}

class _RolesTab extends ConsumerWidget {
  const _RolesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final roles = ref.watch(rolesProvider);
    return ResourceList(
      value: roles,
      onRefresh: () => ref.refresh(rolesProvider.future),
      minTileWidth: 320,
      tileHeight: 212,
      searchHint: l10n.rolesSearch,
      matches: (role, query) => role.name.toLowerCase().contains(query) || role.description.toLowerCase().contains(query),
      filter: (_) => true,
      empty: EmptyState(
        icon: Icons.admin_panel_settings_outlined,
        title: l10n.rolesEmpty,
        body: l10n.rolesEmptyBody,
        action: PermissionGate(
          anyOf: const [Permissions.rolesManage],
          child: FilledButton.icon(
            onPressed: () => context.push(RolesRoutes.create),
            icon: const Icon(Icons.add),
            label: Text(l10n.roleNew),
          ),
        ),
      ),
      itemBuilder: (context, role) => RoleCard(
        role: role,
        onTap: () => context.push(role.isEditable ? RolesRoutes.edit(role.id) : RolesRoutes.detail(role.id)),
      ),
    );
  }
}

class _KnowledgeTab extends ConsumerWidget {
  const _KnowledgeTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final articles = ref.watch(articlesProvider);
    return ResourceList(
      value: articles,
      onRefresh: () => ref.refresh(articlesProvider.future),
      minTileWidth: 320,
      tileHeight: 120,
      searchHint: l10n.knowledgeSearch,
      matches: (article, query) => article.title.toLowerCase().contains(query),
      filter: (_) => true,
      empty: EmptyState(icon: Icons.menu_book_outlined, title: l10n.knowledgeEmpty, body: l10n.knowledgeEmptyBody),
      itemBuilder: (context, article) => ListTile(
        title: Text(article.title),
        subtitle: Text(articleCategoryLabel(l10n, article.category)),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push(KnowledgeRoutes.detail(article.id)),
      ),
    );
  }
}

