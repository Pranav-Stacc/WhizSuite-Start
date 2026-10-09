import 'package:flutter/material.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/storage_models.dart';

class StorageUsageCard extends StatelessWidget {
  const StorageUsageCard({required this.usage, super.key});

  final StorageUsage usage;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final used = formats.fileSize(usage.usedBytes);
    final limit = usage.limitBytes == null ? null : formats.fileSize(usage.limitBytes!);
    final subtitle = limit == null
        ? l10n.storageUsedUnlimited(used)
        : l10n.storageUsedOf(used, limit);
    final ratio = usage.isUnlimited ? 0.0 : usage.ratio.clamp(0.0, 1.0);

    return Card(
      child: Padding(
        padding: EdgeInsets.all(tokens.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(Icons.cloud_outlined, color: tokens.primary, size: 20),
                SizedBox(width: tokens.sm),
                Expanded(
                  child: Text(l10n.storageTitle, style: Theme.of(context).textTheme.titleSmall),
                ),
                Text(
                  l10n.storageFileCount(usage.assetCount),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted),
                ),
              ],
            ),
            SizedBox(height: tokens.sm),
            Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
            if (!usage.isUnlimited) ...[
              SizedBox(height: tokens.md),
              ClipRRect(
                borderRadius: BorderRadius.circular(tokens.radius),
                child: LinearProgressIndicator(
                  value: ratio,
                  minHeight: 8,
                  backgroundColor: tokens.subtle,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
