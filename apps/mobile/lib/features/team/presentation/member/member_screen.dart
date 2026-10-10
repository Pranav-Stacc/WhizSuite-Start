import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/contracts/contracts.g.dart';
import '../../../../core/widgets/avatar.dart';
import '../../../../core/widgets/page_scaffold.dart';
import '../../../../core/widgets/state_views.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../access/application/access_controller.dart';
import '../../../access/domain/access_policy.dart';
import '../../application/team_controller.dart';
import '../../domain/member.dart';
import 'member_content_tab.dart';
import 'member_documents_tab.dart';
import 'member_overview_tab.dart';
import 'member_pay_tab.dart';
import 'member_time_tab.dart';
import 'member_work_tab.dart';

enum _MemberTab { overview, work, content, time, pay, documents }

class MemberScreen extends ConsumerStatefulWidget {
  const MemberScreen({required this.userId, super.key});

  final String userId;

  @override
  ConsumerState<MemberScreen> createState() => _MemberScreenState();
}

class _MemberScreenState extends ConsumerState<MemberScreen> with TickerProviderStateMixin {
  TabController? _tabs;
  List<_MemberTab> _visibleTabs = const [];

  @override
  void dispose() {
    _tabs?.dispose();
    super.dispose();
  }

  List<_MemberTab> _tabsFor(AccessPolicy policy) {
    final tabs = <_MemberTab>[_MemberTab.overview];
    if (policy.can(Permissions.tasksView)) tabs.add(_MemberTab.work);
    if (policy.can(Permissions.contentView)) tabs.add(_MemberTab.content);
    if (policy.can(Permissions.membersView)) tabs.add(_MemberTab.time);
    if (policy.can(Permissions.membersView)) tabs.add(_MemberTab.pay);
    if (policy.can(Permissions.membersView)) tabs.add(_MemberTab.documents);
    return tabs;
  }

  void _ensureTabs(AccessPolicy policy) {
    final tabs = _tabsFor(policy);
    if (_tabs != null && _visibleTabs.length == tabs.length) return;
    _tabs?.dispose();
    _visibleTabs = tabs;
    _tabs = TabController(length: tabs.length, vsync: this);
  }

  String _tabLabel(AppLocalizations l10n, _MemberTab tab) => switch (tab) {
        _MemberTab.overview => l10n.memberTabOverview,
        _MemberTab.work => l10n.memberTabWork,
        _MemberTab.content => l10n.memberTabContent,
        _MemberTab.time => l10n.memberTabTime,
        _MemberTab.pay => l10n.memberTabPay,
        _MemberTab.documents => l10n.memberTabDocuments,
      };

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final policy = ref.watch(accessPolicyProvider);
    final member = ref.watch(memberProvider(widget.userId));
    _ensureTabs(policy);
    final controller = _tabs!;
    final tabs = _visibleTabs;

    return member.when(
      loading: () => PageScaffold(title: l10n.teamTabMembers, body: const Center(child: CircularProgressIndicator())),
      error: (e, _) => PageScaffold(
        title: l10n.teamTabMembers,
        body: ErrorState(error: e, onRetry: () => ref.invalidate(memberProvider(widget.userId))),
      ),
      data: (data) {
        if (data == null) {
          return PageScaffold(
            title: l10n.teamTabMembers,
            body: EmptyState(icon: Icons.person_off_outlined, title: l10n.errorNotFound),
          );
        }
        return PageScaffold(
          title: data.name,
          bottom: TabBar(
            controller: controller,
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [for (final tab in tabs) Tab(text: _tabLabel(l10n, tab))],
          ),
          body: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: Row(
                  children: [
                    InitialsAvatar(name: data.name, seed: data.userId, size: 40),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        data.title ?? data.email,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: TabBarView(
                  controller: controller,
                  children: [
                    for (final tab in tabs)
                      switch (tab) {
                        _MemberTab.overview => MemberOverviewTab(member: data),
                        _MemberTab.work => MemberWorkTab(member: data),
                        _MemberTab.content => MemberContentTab(member: data),
                        _MemberTab.time => MemberTimeTab(member: data),
                        _MemberTab.pay => MemberPayTab(member: data),
                        _MemberTab.documents => MemberDocumentsTab(member: data),
                      },
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
