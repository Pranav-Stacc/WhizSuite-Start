import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/forms/validators.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/forms.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/presentation/permission_gate.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../application/media_controller.dart';
import '../domain/media_asset.dart';
import '../media_routes.dart';
import 'asset_thumbnail.dart';
import 'media_labels.dart';

enum _MenuAction { edit, delete }

class MediaDetailScreen extends ConsumerWidget {
  const MediaDetailScreen({required this.assetId, super.key});

  final String assetId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final asset = ref.watch(mediaAssetProvider(assetId));
    final loaded = asset.value;
    final policy = ref.watch(accessPolicyProvider);
    final canEdit = policy.can(Permissions.filesUpload);
    final canDelete = policy.can(Permissions.filesDelete);

    return PageScaffold(
      title: loaded?.name ?? l10n.mediaTitle,
      actions: [
        if (loaded != null && (canEdit || canDelete))
          PermissionGate(
            anyOf: const [Permissions.filesUpload, Permissions.filesDelete],
            child: PopupMenuButton<_MenuAction>(
              tooltip: l10n.moreActions,
              onSelected: (action) => _onMenu(context, ref, loaded, action),
              itemBuilder: (context) => [
                if (canEdit)
                  PopupMenuItem(
                    value: _MenuAction.edit,
                    child: ListTile(leading: const Icon(Icons.edit_outlined), title: Text(l10n.edit)),
                  ),
                if (canDelete)
                  PopupMenuItem(
                    value: _MenuAction.delete,
                    child: ListTile(
                      leading: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error),
                      title: Text(l10n.delete, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ),
                  ),
              ],
            ),
          ),
      ],
      body: AsyncValueView<MediaAsset>(
        value: asset,
        onRetry: () => ref.invalidate(mediaAssetProvider(assetId)),
        data: (asset) => ReadableBody(
          onRefresh: () {
            ref.invalidate(mediaPreviewUrlProvider(assetId));
            return ref.refresh(mediaAssetProvider(assetId).future);
          },
          children: [
            FadeSlideIn(child: _Preview(asset: asset)),
            SizedBox(height: context.tokens.lg),
            FadeSlideIn(index: 1, child: _AssetMetrics(asset: asset)),
            SizedBox(height: context.tokens.lg),
            FadeSlideIn(index: 2, child: _LinkActions(asset: asset)),
            SizedBox(height: context.tokens.lg),
            FadeSlideIn(index: 3, child: _Facts(asset: asset)),
          ],
        ),
      ),
    );
  }

  Future<void> _onMenu(BuildContext context, WidgetRef ref, MediaAsset asset, _MenuAction action) async {
    final l10n = AppLocalizations.of(context);
    switch (action) {
      case _MenuAction.edit:
        await showEditAssetSheet(context, ref, asset);
      case _MenuAction.delete:
        final confirmed = await confirmAction(
          context,
          title: l10n.deleteConfirmTitle(asset.name),
          body: l10n.mediaDeleteBody,
          confirmLabel: l10n.delete,
          destructive: true,
        );
        if (!confirmed || !context.mounted) return;
        final deleted = await runAction(
          context,
          () => ref.read(mediaActionsProvider).delete(asset.id),
          success: l10n.deletedToast,
        );
        if (deleted && context.mounted) context.go(MediaRoutes.root);
    }
  }
}

/// Renames the asset or moves it to another client (or none).
Future<bool> showEditAssetSheet(BuildContext context, WidgetRef ref, MediaAsset asset) async {
  final l10n = AppLocalizations.of(context);
  final validators = Validators(l10n);
  final name = TextEditingController(text: asset.name);
  final isPortal = ref.read(sessionProvider).value?.isClientPortal ?? false;
  final clients = isPortal ? null : await ref.read(clientDirectoryProvider.future);
  if (!context.mounted) return false;
  var clientId = asset.clientId;
  return showFormSheet(
    context,
    title: l10n.mediaEditTitle,
    submitLabel: l10n.save,
    fields: (context, setState) => [
      TextFormField(
        controller: name,
        autofocus: true,
        maxLength: mediaFilenameMaxLength,
        decoration: InputDecoration(labelText: l10n.mediaFieldName),
        validator: validators.required,
      ),
      if (clients != null && clients.entries.isNotEmpty)
        OptionField<String>(
          label: l10n.mediaFieldClient,
          value: clientId,
          allowNone: true,
          options: [for (final c in clients.entries) c.id],
          labelOf: (id) => clients.nameOf(id) ?? l10n.valueUnknown,
          onChanged: (value) => setState(() => clientId = value),
        ),
    ],
    onSubmit: () => ref.read(mediaActionsProvider).update(
          asset.id,
          MediaAssetUpdate(name: name.text, clientId: isPortal ? asset.clientId : clientId),
        ),
  );
}

class _Preview extends ConsumerWidget {
  const _Preview({required this.asset});

  final MediaAsset asset;

  static const _maxHeight = 520.0;
  static const _placeholderHeight = 240.0;
  static const _maxZoom = 5.0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final preview = ref.watch(mediaPreviewUrlProvider(asset.id));
    final url = preview.value;
    final Widget child;
    if (asset.isImage && url != null) {
      child = ConstrainedBox(
        constraints: const BoxConstraints(maxHeight: _maxHeight),
        child: InteractiveViewer(
          maxScale: _maxZoom,
          child: Semantics(
            image: true,
            label: l10n.mediaPreviewSemantics(asset.name),
            child: Image.network(
              url,
              fit: BoxFit.contain,
              width: double.infinity,
              excludeFromSemantics: true,
              loadingBuilder: (context, image, progress) => progress == null
                  ? image
                  : const Shimmer(child: SkeletonBox(height: _placeholderHeight)),
              errorBuilder: (context, _, _) =>
                  SizedBox(height: _placeholderHeight, child: AssetThumbnail(asset: asset)),
            ),
          ),
        ),
      );
    } else if (preview.isLoading && asset.isImage) {
      child = const Shimmer(child: SkeletonBox(height: _placeholderHeight));
    } else {
      child = SizedBox(
        height: _placeholderHeight,
        child: Semantics(
          label: l10n.mediaPreviewSemantics(asset.name),
          child: AssetThumbnail(asset: asset),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(borderRadius: tokens.borderRadius, child: ColoredBox(color: tokens.subtle, child: child)),
        if (asset.isImage && url != null) ...[
          SizedBox(height: tokens.xs),
          Text(
            l10n.mediaZoomHint,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted),
          ),
        ],
      ],
    );
  }
}

class _AssetMetrics extends StatelessWidget {
  const _AssetMetrics({required this.asset});

  static const _minTileWidth = 160.0;

  final MediaAsset asset;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final tiles = [
      MetricTile(
        label: l10n.mediaFieldKind,
        icon: mediaKindIcon(asset.kind),
        value: mediaKindLabel(l10n, asset.kind),
      ),
      MetricTile(
        label: l10n.mediaFieldSize,
        icon: Icons.straighten,
        value: formats.fileSize(asset.sizeBytes),
      ),
      MetricTile(
        label: l10n.mediaFieldVersion,
        icon: Icons.layers_outlined,
        value: l10n.mediaVersion(asset.version),
        caption: l10n.mediaStatus(asset.status),
      ),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = gridColumns(constraints.maxWidth, minTileWidth: _minTileWidth, max: 3);
        final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
        return Wrap(
          spacing: tokens.md,
          runSpacing: tokens.md,
          children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
        );
      },
    );
  }
}

class _LinkActions extends ConsumerWidget {
  const _LinkActions({required this.asset});

  final MediaAsset asset;

  Future<void> _launch(BuildContext context, WidgetRef ref, MediaDisposition disposition) async {
    final l10n = AppLocalizations.of(context);
    Uri? link;
    final ok = await runAction(context, () async {
      link = await ref.read(mediaActionsProvider).link(asset.id, disposition);
    });
    final target = link;
    if (!ok || target == null) return;
    final opened = await launchUrl(target, mode: LaunchMode.externalApplication);
    if (!opened && context.mounted) showToast(context, l10n.mediaOpenFailed);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    if (!asset.isReady) {
      return SurfaceCard(
        child: Row(
          children: [
            MediaStatusBadge(asset: asset, dense: false),
            SizedBox(width: tokens.md),
            Expanded(child: Text(l10n.mediaNotReadyBody(asset.status))),
          ],
        ),
      );
    }
    return Wrap(
      spacing: tokens.sm,
      runSpacing: tokens.sm,
      children: [
        FilledButton.icon(
          onPressed: () => _launch(context, ref, MediaDisposition.inline),
          icon: const Icon(Icons.open_in_new),
          label: Text(l10n.mediaOpen),
        ),
        OutlinedButton.icon(
          onPressed: () => _launch(context, ref, MediaDisposition.attachment),
          icon: const Icon(Icons.download_outlined),
          label: Text(l10n.mediaDownload),
        ),
      ],
    );
  }
}

class _Facts extends ConsumerWidget {
  const _Facts({required this.asset});

  final MediaAsset asset;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final me = ref.watch(sessionProvider).value?.userId;
    final clientName = ref.watch(clientDirectoryProvider).value?.nameOf(asset.clientId);
    final uploaderId = asset.createdById;
    final uploader = uploaderId == null
        ? l10n.valueUnknown
        : uploaderId == me
            ? l10n.mediaYou
            : ref.watch(memberDirectoryProvider).value?.nameOf(uploaderId) ?? l10n.valueUnknown;
    return SectionCard(
      title: l10n.details,
      trailing: MediaStatusBadge(asset: asset, showReady: true),
      child: Column(
        children: [
          InfoRow(label: l10n.mediaFieldKind, icon: mediaKindIcon(asset.kind), value: Text(mediaKindLabel(l10n, asset.kind))),
          InfoRow(label: l10n.mediaFieldType, icon: Icons.code, value: Text(asset.mimeType)),
          InfoRow(label: l10n.mediaFieldSize, icon: Icons.straighten, value: Text(formats.fileSize(asset.sizeBytes))),
          InfoRow(
            label: l10n.mediaFieldClient,
            icon: Icons.business_outlined,
            value: Text(asset.clientId == null ? l10n.mediaNoClient : clientName ?? l10n.valueUnknown),
          ),
          InfoRow(label: l10n.mediaFieldUploadedBy, icon: Icons.person_outline, value: Text(uploader)),
          InfoRow(label: l10n.mediaFieldUploaded, icon: Icons.event_outlined, value: Text(formats.dateTime(asset.createdAt.toLocal()))),
          InfoRow(label: l10n.mediaFieldUpdated, icon: Icons.history, value: Text(formats.relative(asset.updatedAt))),
          InfoRow(label: l10n.mediaFieldVersion, icon: Icons.layers_outlined, value: Text(l10n.mediaVersion(asset.version))),
        ],
      ),
    );
  }
}
