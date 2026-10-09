import 'package:flutter/material.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_message.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../application/upload_queue.dart';
import '../domain/media_asset.dart';

String mediaKindLabel(AppLocalizations l10n, String kind) => l10n.mediaKind(kind);

IconData mediaKindIcon(String kind) => switch (kind) {
      AssetKinds.image => Icons.image_outlined,
      AssetKinds.video => Icons.movie_outlined,
      _ => Icons.description_outlined,
    };

StatusTone mediaStatusTone(String status) => switch (status) {
      MediaAssetStatuses.ready => StatusTone.success,
      MediaAssetStatuses.failed => StatusTone.danger,
      _ => StatusTone.warning,
    };

/// Badge for assets that are not usable yet; ready assets show nothing.
class MediaStatusBadge extends StatelessWidget {
  const MediaStatusBadge({required this.asset, this.dense = true, this.showReady = false, super.key});

  final MediaAsset asset;
  final bool dense;
  final bool showReady;

  @override
  Widget build(BuildContext context) {
    if (asset.isReady && !showReady) return const SizedBox.shrink();
    return StatusBadge(
      label: AppLocalizations.of(context).mediaStatus(asset.status),
      tone: mediaStatusTone(asset.status),
      dense: dense,
    );
  }
}

/// Human message for a failed upload, with specific copy for the media error codes.
String describeUploadError(AppLocalizations l10n, Object? error) => switch (error) {
      UploadIssue.empty => l10n.mediaUploadErrorEmpty,
      UploadIssue.nameTooLong => l10n.mediaUploadErrorNameTooLong(mediaFilenameMaxLength),
      ApiException(code: ErrorCodes.mediaTypeNotAllowed) => l10n.mediaUploadErrorType,
      ApiException(code: ErrorCodes.mediaTooLarge) => l10n.mediaUploadErrorSize,
      ApiException(code: ErrorCodes.mediaUploadIncomplete) => l10n.mediaUploadErrorIncomplete,
      null => l10n.valueUnknown,
      final Object other => describeError(l10n, other),
    };
