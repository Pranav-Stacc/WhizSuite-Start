import 'package:flutter/material.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/skeleton.dart';
import '../domain/media_asset.dart';
import 'media_labels.dart';

/// Square-ish preview of an asset: the image itself when a preview URL exists, otherwise a typed tile.
class AssetThumbnail extends StatelessWidget {
  const AssetThumbnail({required this.asset, this.fit = BoxFit.cover, super.key});

  final MediaAsset asset;
  final BoxFit fit;

  static const _iconSize = 32.0;
  static const _playSize = 40.0;

  @override
  Widget build(BuildContext context) {
    final url = asset.previewUrl;
    if (url != null && asset.isImage) {
      return Image.network(
        url,
        fit: fit,
        excludeFromSemantics: true,
        loadingBuilder: (context, child, progress) =>
            progress == null ? child : const Shimmer(child: SkeletonBox(height: double.infinity, radius: 0)),
        errorBuilder: (context, _, _) => _Placeholder(asset: asset),
      );
    }
    return _Placeholder(asset: asset);
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder({required this.asset});

  final MediaAsset asset;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final extension = asset.extension.toUpperCase();
    return ColoredBox(
      color: tokens.subtle,
      child: Center(
        child: asset.isVideo
            ? Icon(Icons.play_circle_outline, size: AssetThumbnail._playSize, color: tokens.muted)
            : Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(mediaKindIcon(asset.kind), size: AssetThumbnail._iconSize, color: tokens.muted),
                  if (extension.isNotEmpty) ...[
                    SizedBox(height: tokens.xs),
                    Text(extension, style: text.labelSmall?.copyWith(color: tokens.muted, fontWeight: FontWeight.w700)),
                  ],
                ],
              ),
      ),
    );
  }
}
