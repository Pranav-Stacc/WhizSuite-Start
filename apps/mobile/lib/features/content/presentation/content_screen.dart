import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/menu_filter_chip.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../application/content_controller.dart';
import '../content_routes.dart';
import '../domain/content.dart';
import 'content_card.dart';
import 'content_labels.dart';
import 'content_planner.dart';

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
  String? _status;
  late String? _clientId = widget.initialClientId != null && widget.initialClientId!.isNotEmpty
      ? widget.initialClientId
      : null;
  String? _type;
  String? _platform;
  bool _mine = false;

  @override
  bool get wantKeepAlive => true;

  bool _matchesFacets(Content content, String? userId) =>
      (_clientId == null || content.clientId == _clientId) &&
      (_type == null || content.contentType == _type) &&
      (_platform == null || content.platforms.contains(_platform)) &&
      (!_mine || content.authorId == userId);

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final value = ref.watch(contentListProvider);
    final clients = ref.watch(clientDirectoryProvider).value;
    final userId = ref.watch(sessionProvider).value?.userId;
    final items = value.value ?? const <Content>[];
    final faceted = items.where((c) => _matchesFacets(c, userId)).toList();
    final clientIds = {for (final c in items) c.clientId}.toList()
      ..sort((a, b) => (clients?.nameOf(a) ?? a).compareTo(clients?.nameOf(b) ?? b));

    return ResourceList<Content>(
      value: value,
      onRefresh: () => ref.refresh(contentListProvider.future),
      minTileWidth: 360,
      tileHeight: 196,
      searchHint: l10n.contentSearch,
      matches: (content, query) =>
          content.title.toLowerCase().contains(query) ||
          content.caption.toLowerCase().contains(query) ||
          content.hashtags.any((tag) => tag.toLowerCase().contains(query)) ||
          (clients?.nameOf(content.clientId)?.toLowerCase().contains(query) ?? false),
      filter: (content) => _matchesFacets(content, userId) && (_status == null || content.status == _status),
      sort: (a, b) => b.updatedAt.compareTo(a.updatedAt),
      header: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (faceted.isNotEmpty) ...[
            LayoutBuilder(
              builder: (context, constraints) {
                final tiles = [
                  MetricTile(
                    label: l10n.contentStatAll,
                    icon: Icons.auto_awesome_mosaic_outlined,
                    value: '${faceted.length}',
                    onTap: () => setState(() => _status = null),
                  ),
                  MetricTile(
                    label: l10n.contentStatDraft,
                    icon: Icons.edit_note_outlined,
                    value: '${faceted.where((c) => c.status == ContentStatuses.draft).length}',
                    onTap: () => setState(() => _status = ContentStatuses.draft),
                  ),
                  MetricTile(
                    label: l10n.contentStatReview,
                    icon: Icons.rate_review_outlined,
                    value: '${faceted.where((c) => c.status == ContentStatuses.inReview).length}',
                    onTap: () => setState(() => _status = ContentStatuses.inReview),
                  ),
                  MetricTile(
                    label: l10n.contentStatScheduled,
                    icon: Icons.schedule_outlined,
                    value: '${faceted.where((c) => c.status == ContentStatuses.scheduled).length}',
                    onTap: () => setState(() => _status = ContentStatuses.scheduled),
                  ),
                ];
                final columns = gridColumns(constraints.maxWidth, minTileWidth: 140, max: tiles.length);
                final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
                return Wrap(
                  spacing: tokens.md,
                  runSpacing: tokens.md,
                  children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
                );
              },
            ),
            SizedBox(height: tokens.md),
          ],
          FilterBar<String>(
            options: ContentStatuses.values,
            selected: _status,
            labelOf: (status) => contentStatusLabel(l10n, status),
            countOf: (status) => status == null ? faceted.length : faceted.where((c) => c.status == status).length,
            onSelected: (status) => setState(() => _status = status),
          ),
          SizedBox(height: tokens.sm),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                FilterChip(
                  avatar: const Icon(Icons.person_outline, size: 16),
                  label: Text(l10n.contentFilterMine),
                  selected: _mine,
                  showCheckmark: false,
                  onSelected: (value) => setState(() => _mine = value),
                ),
                SizedBox(width: tokens.sm),
                if (clientIds.length > 1) ...[
                  MenuFilterChip<String>(
                    label: l10n.contentFilterClient,
                    icon: Icons.business_outlined,
                    options: clientIds,
                    selected: _clientId,
                    labelOf: (id) => clients?.nameOf(id) ?? l10n.valueUnknown,
                    onSelected: (id) => setState(() => _clientId = id),
                  ),
                  SizedBox(width: tokens.sm),
                ],
                MenuFilterChip<String>(
                  label: l10n.contentFilterType,
                  icon: Icons.category_outlined,
                  options: ContentTypes.values,
                  selected: _type,
                  labelOf: (type) => contentTypeLabel(l10n, type),
                  onSelected: (type) => setState(() => _type = type),
                ),
                SizedBox(width: tokens.sm),
                MenuFilterChip<String>(
                  label: l10n.contentFilterPlatform,
                  icon: Icons.public,
                  options: Platforms.values,
                  selected: _platform,
                  labelOf: (platform) => contentPlatformLabel(l10n, platform),
                  onSelected: (platform) => setState(() => _platform = platform),
                ),
              ],
            ),
          ),
        ],
      ),
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
        onTap: () => context.go(ContentRoutes.detail(content.id)),
      ),
    );
  }
}
