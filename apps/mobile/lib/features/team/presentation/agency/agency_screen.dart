import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/contracts/contracts.g.dart';
import '../../../../core/theme/app_tokens.dart';
import '../../../../core/widgets/avatar.dart';
import '../../../../core/widgets/feedback.dart';
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

enum _AgencyTab { overview, members, departments, roles, knowledge, documents, invitations }

class AgencyScreen extends ConsumerStatefulWidget {
  const AgencyScreen({super.key});

  @override
  ConsumerState<AgencyScreen> createState() => _AgencyScreenState();
}

class _AgencyScreenState extends ConsumerState<AgencyScreen> with TickerProviderStateMixin {
  TabController? _tabs;
  List<_AgencyTab> _visibleTabs = const [];

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
    if (canInvite) tabs.add(_AgencyTab.invitations);
    return tabs;
  }

  void _ensureTabs(AccessPolicy policy, bool canInvite) {
    final tabs = _tabsFor(policy, canInvite);
    if (_tabs != null && _visibleTabs.length == tabs.length) return;
    _tabs?.removeListener(_onTabChanged);
    _tabs?.dispose();
    _visibleTabs = tabs;
    _tabs = TabController(length: tabs.length, vsync: this);
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
    final tabs = _visibleTabs;
    final controller = _tabs!;

    Widget? fab;
    final index = controller.index;
    if (index < tabs.length) {
      fab = switch (tabs[index]) {
        _AgencyTab.members || _AgencyTab.invitations => PermissionGate(
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
                _AgencyTab.invitations => l10n.teamTabInvitations,
              },
            ),
        ],
      ),
      body: TabBarView(
        controller: controller,
        children: [
          for (final tab in tabs)
            switch (tab) {
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
              _AgencyTab.invitations => _InvitationsTab(onInvite: _invite),
            },
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
          _HeroStats(
            members: members.length,
            departments: departments,
            roles: roles,
            articles: articles,
            onMembers: policy.can(Permissions.membersView) ? () => onSelectTab(_AgencyTab.members) : null,
            onDepartments: policy.can(Permissions.orgView) ? () => onSelectTab(_AgencyTab.departments) : null,
            onRoles: policy.can(Permissions.rolesManage) ? () => onSelectTab(_AgencyTab.roles) : null,
            onArticles: policy.can(Permissions.orgView) ? () => onSelectTab(_AgencyTab.knowledge) : null,
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
              trailing: TextButton(onPressed: () => onSelectTab(_AgencyTab.invitations), child: Text(l10n.viewAll)),
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
    required this.departments,
    required this.roles,
    required this.articles,
    this.onMembers,
    this.onDepartments,
    this.onRoles,
    this.onArticles,
  });

  final int members;
  final int departments;
  final int roles;
  final int articles;
  final VoidCallback? onMembers;
  final VoidCallback? onDepartments;
  final VoidCallback? onRoles;
  final VoidCallback? onArticles;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: tokens.borderRadius,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color.lerp(tokens.surface, tokens.primary, 0.08)!,
            Color.lerp(tokens.surface, tokens.secondary, 0.06)!,
          ],
        ),
        border: Border.all(color: tokens.border),
      ),
      child: Padding(
        padding: EdgeInsets.all(tokens.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(l10n.agencyOverviewTitle, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            SizedBox(height: tokens.md),
            Row(
              children: [
                if (onMembers != null)
                  Expanded(child: _StatTile(label: l10n.teamStatMembers, value: '$members', onTap: onMembers)),
                if (onMembers != null && onDepartments != null) SizedBox(width: tokens.sm),
                if (onDepartments != null)
                  Expanded(child: _StatTile(label: l10n.navDepartments, value: '$departments', onTap: onDepartments)),
              ],
            ),
            if (onRoles != null || onArticles != null) ...[
              SizedBox(height: tokens.sm),
              Row(
                children: [
                  if (onRoles != null)
                    Expanded(child: _StatTile(label: l10n.navRoles, value: '$roles', onTap: onRoles)),
                  if (onRoles != null && onArticles != null) SizedBox(width: tokens.sm),
                  if (onArticles != null)
                    Expanded(child: _StatTile(label: l10n.knowledgeTitle, value: '$articles', onTap: onArticles)),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.label, required this.value, this.onTap});

  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Material(
      color: tokens.surface.withValues(alpha: 0.7),
      borderRadius: tokens.borderRadius,
      child: InkWell(
        onTap: onTap,
        borderRadius: tokens.borderRadius,
        child: Padding(
          padding: EdgeInsets.all(tokens.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted)),
              Text(value, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
            ],
          ),
        ),
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

    return ResourceList<Member>(
      value: members,
      onRefresh: () => ref.refresh(membersProvider.future),
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
      header: items.isEmpty
          ? null
          : _MembersFilters(
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
      itemBuilder: (context, role) => RoleCard(role: role, onTap: () => context.push(RolesRoutes.detail(role.id))),
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
          child: FilledButton.icon(onPressed: widget.onInvite, icon: const Icon(Icons.person_add_alt_1_outlined), label: Text(l10n.teamInvite)),
        ),
      ),
      itemBuilder: (context, invitation) => InvitationTile(invitation: invitation),
    );
  }
}
