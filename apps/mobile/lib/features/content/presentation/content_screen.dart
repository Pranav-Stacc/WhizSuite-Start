import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../application/content_controller.dart';
import '../content_routes.dart';
import '../domain/content.dart';
import '../domain/content_filter.dart';
import 'content_card.dart';
import 'content_filter_sheet.dart';
import 'content_planner.dart';
import 'content_post_options.dart';

class ContentScreen extends ConsumerStatefulWidget {
  const ContentScreen({super.key, this.initialClientId, this.initialTab});

  final String? initialClientId;
  final String? initialTab;

  @override
  ConsumerState<ContentScreen> createState() => _ContentScreenState();
}

class _ContentScreenState extends ConsumerState<ContentScreen> {
  static const _tabCount = 2;

  int get _initialIndex =>
      widget.initialTab == ContentRoutes.plannerTab ? 1 : 0;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final clientId = widget.initialClientId;
    return DefaultTabController(
      length: _tabCount,
      initialIndex: _initialIndex,
      child: PageScaffold(
        title: l10n.contentTitle,
        floatingActionButton: PermissionGate(
          anyOf: const [Permissions.contentCreate],
          child: CreateFab(
            label: l10n.contentNew,
            onPressed: () => context.push(ContentRoutes.compose(clientId: clientId)),
          ),
        ),
        bottom: TabBar(
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: [Tab(text: l10n.contentTabLibrary), Tab(text: l10n.contentTabPlanner)],
        ),
        body: TabBarView(
          children: [
            _ContentLibrary(initialClientId: clientId),
            ContentPlanner(initialClientId: clientId),
          ],
        ),
      ),
    );
  }
}

class _ContentLibrary extends ConsumerStatefulWidget {
  const _ContentLibrary({this.initialClientId});

  final String? initialClientId;

  @override
  ConsumerState<_ContentLibrary> createState() => _ContentLibraryState();
}

class _ContentLibraryState extends ConsumerState<_ContentLibrary> with AutomaticKeepAliveClientMixin {
  late ContentFilter _filter = ContentFilter(
    clientId: widget.initialClientId != null && widget.initialClientId!.isNotEmpty ? widget.initialClientId : null,
  );

  @override
  bool get wantKeepAlive => true;

  Future<void> _openFilters(List<String> clientIds, String Function(String) clientNameOf) async {
    final next = await showContentFilterSheet(
      context,
      initial: _filter,
      clientIds: clientIds,
      clientNameOf: clientNameOf,
      showClientFilter: widget.initialClientId == null,
    );
    if (next != null && mounted) setState(() => _filter = next);
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(contentListProvider);
    final clients = ref.watch(clientDirectoryProvider).value;
    final userId = ref.watch(sessionProvider).value?.userId;
    final items = value.value ?? const <Content>[];
    final clientIds = {for (final c in items) c.clientId}.toList()
      ..sort((a, b) => (clients?.nameOf(a) ?? a).compareTo(clients?.nameOf(b) ?? b));
    String clientNameOf(String id) => clients?.nameOf(id) ?? l10n.valueUnknown;

    return ResourceList<Content>(
      value: value,
      onRefresh: () => ref.refresh(contentListProvider.future),
      minTileWidth: 340,
      tileHeight: 188,
      searchHint: l10n.contentSearch,
      searchTrailing: IconButton(
        tooltip: l10n.contentFilters,
        onPressed: () => _openFilters(clientIds, clientNameOf),
        icon: Badge(
          isLabelVisible: _filter.activeCount > 0,
          label: Text('${_filter.activeCount}'),
          child: Icon(_filter.activeCount > 0 ? Icons.filter_alt : Icons.filter_alt_outlined),
        ),
      ),
      matches: (content, query) =>
          content.title.toLowerCase().contains(query) ||
          content.caption.toLowerCase().contains(query) ||
          content.hashtags.any((tag) => tag.toLowerCase().contains(query)) ||
          (clients?.nameOf(content.clientId)?.toLowerCase().contains(query) ?? false),
      filter: (content) => _filter.matches(content, userId),
      sort: (a, b) => b.updatedAt.compareTo(a.updatedAt),
      empty: EmptyState(
        icon: Icons.auto_awesome_mosaic_outlined,
        title: l10n.contentEmpty,
        body: l10n.contentEmptyBody,
        action: PermissionGate(
          anyOf: const [Permissions.contentCreate],
          child: FilledButton.icon(
            onPressed: () => context.push(ContentRoutes.compose()),
            icon: const Icon(Icons.add),
            label: Text(l10n.contentNew),
          ),
        ),
      ),
      itemBuilder: (context, content) => ContentCard(
        content: content,
        clientName: clients?.nameOf(content.clientId),
        onTap: () => context.push(ContentRoutes.detail(content.id)),
        onMore: () => showContentPostOptions(context, ref, content: content),
      ),
    );
  }
}
