import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/media_controller.dart';
import '../application/upload_queue.dart';
import '../domain/media_asset.dart';
import '../media_routes.dart';
import 'media_labels.dart';
import 'media_tile.dart';
import 'upload_sheet.dart';

class MediaScreen extends ConsumerStatefulWidget {
  const MediaScreen({super.key});

  static const minTileWidth = 168.0;
  static const tileHeight = 224.0;

  @override
  ConsumerState<MediaScreen> createState() => _MediaScreenState();
}

class _MediaScreenState extends ConsumerState<MediaScreen> {
  String? _kind;
  String? _clientId;

  bool _passes(MediaAsset asset, {bool ignoreKind = false}) =>
      (ignoreKind || _kind == null || asset.kind == _kind) && (_clientId == null || asset.clientId == _clientId);

  Future<void> _upload() async {
    final l10n = AppLocalizations.of(context);
    final uploaded = await startMediaUpload(context, ref, clientId: _clientId);
    if (uploaded.isNotEmpty && mounted) showToast(context, l10n.mediaUploadedToast(uploaded.length));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final assets = ref.watch(mediaAssetsProvider);
    final isPortal = ref.watch(sessionProvider.select((s) => s.value?.isClientPortal ?? false));
    final clients = isPortal ? Directory.empty : ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final uploading = ref.watch(mediaUploadQueueProvider.select((tasks) => tasks.where((t) => !t.isFinished).length));
    final all = assets.value ?? const <MediaAsset>[];
    int kindCount(String? kind) => all.where((a) => _passes(a, ignoreKind: true) && (kind == null || a.kind == kind)).length;

    return PageScaffold(
      title: l10n.mediaTitle,
      actions: [
        if (uploading > 0)
          IconButton(
            tooltip: l10n.mediaUploadInProgress(uploading),
            onPressed: () => showUploadProgressSheet(context),
            icon: Badge.count(count: uploading, child: const Icon(Icons.cloud_upload_outlined)),
          ),
      ],
      floatingActionButton: PermissionGate(
        anyOf: const [Permissions.filesUpload],
        child: FloatingActionButton.extended(
          onPressed: _upload,
          icon: const Icon(Icons.upload_outlined),
          label: Text(l10n.mediaUpload),
        ),
      ),
      body: ResourceList<MediaAsset>(
        value: assets,
        minTileWidth: MediaScreen.minTileWidth,
        tileHeight: MediaScreen.tileHeight,
        onRefresh: () => ref.refresh(mediaAssetsProvider.future),
        searchHint: l10n.mediaSearch,
        matches: (asset, query) => asset.matches(query),
        filter: _passes,
        header: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (all.isNotEmpty) ...[
              LayoutBuilder(
                builder: (context, constraints) {
                  final tiles = [
                    MetricTile(
                      label: l10n.mediaStatAll,
                      icon: Icons.folder_outlined,
                      value: '${all.length}',
                      onTap: () => setState(() => _kind = null),
                    ),
                    MetricTile(
                      label: l10n.mediaStatImages,
                      icon: Icons.image_outlined,
                      value: '${all.where((a) => a.kind == AssetKinds.image).length}',
                      onTap: () => setState(() => _kind = AssetKinds.image),
                    ),
                    MetricTile(
                      label: l10n.mediaStatVideos,
                      icon: Icons.videocam_outlined,
                      value: '${all.where((a) => a.kind == AssetKinds.video).length}',
                      onTap: () => setState(() => _kind = AssetKinds.video),
                    ),
                    MetricTile(
                      label: l10n.mediaStatDocs,
                      icon: Icons.description_outlined,
                      value: '${all.where((a) => a.kind == AssetKinds.document).length}',
                      onTap: () => setState(() => _kind = AssetKinds.document),
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
              options: AssetKinds.values,
              selected: _kind,
              labelOf: (kind) => mediaKindLabel(l10n, kind),
              countOf: kindCount,
              onSelected: (kind) => setState(() => _kind = kind),
            ),
            if (clients.entries.isNotEmpty) ...[
              SizedBox(height: tokens.sm),
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: _ClientFilter(
                  clients: clients,
                  selected: _clientId,
                  onSelected: (id) => setState(() => _clientId = id),
                ),
              ),
            ],
          ],
        ),
        empty: EmptyState(
          icon: Icons.photo_library_outlined,
          title: l10n.mediaEmpty,
          body: l10n.mediaEmptyBody,
          action: PermissionGate(
            anyOf: const [Permissions.filesUpload],
            child: FilledButton.icon(onPressed: _upload, icon: const Icon(Icons.upload_outlined), label: Text(l10n.mediaUpload)),
          ),
        ),
        itemBuilder: (context, asset) => FadeSlideIn(
          child: MediaTile(
            asset: asset,
            clientName: clients.nameOf(asset.clientId),
            onTap: () => context.go(MediaRoutes.detail(asset.id)),
          ),
        ),
      ),
    );
  }
}

class _ClientFilter extends StatelessWidget {
  const _ClientFilter({required this.clients, required this.selected, required this.onSelected});

  final Directory clients;
  final String? selected;
  final ValueChanged<String?> onSelected;

  static const _all = '';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final name = clients.nameOf(selected);
    return PopupMenuButton<String>(
      tooltip: l10n.mediaFilterClient,
      onSelected: (id) => onSelected(id == _all ? null : id),
      itemBuilder: (_) => [
        CheckedPopupMenuItem(value: _all, checked: selected == null, child: Text(l10n.filterAll)),
        for (final client in clients.entries)
          CheckedPopupMenuItem(value: client.id, checked: client.id == selected, child: Text(client.name)),
      ],
      child: IgnorePointer(
        child: FilterChip(
          avatar: const Icon(Icons.business_outlined, size: 18),
          label: Text(name ?? l10n.mediaFilterClient),
          selected: name != null,
          onSelected: (_) {},
        ),
      ),
    );
  }
}
