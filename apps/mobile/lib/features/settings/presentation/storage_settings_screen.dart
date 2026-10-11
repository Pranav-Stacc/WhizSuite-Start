import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/state_views.dart';
import '../../../l10n/app_localizations.dart';
import '../../media/application/storage_providers.dart';
import '../../calendar/presentation/google_calendar_settings_panel.dart';
import '../../media/presentation/data_sources_panel.dart';
import '../../media/presentation/storage_usage_card.dart';

class StorageSettingsScreen extends ConsumerWidget {
  const StorageSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final usage = ref.watch(storageUsageProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.storageSettingsTitle)),
      body: ListView(
        padding: EdgeInsets.all(tokens.lg),
        children: [
          FadeSlideIn(
            child: switch (usage) {
              AsyncValue(value: final value?) => StorageUsageCard(usage: value),
              AsyncValue(error: final error?, stackTrace: _) => ErrorState(
                  error: error,
                  onRetry: () => ref.invalidate(storageUsageProvider),
                ),
              _ => const Card(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                ),
            },
          ),
          SizedBox(height: tokens.xl),
          FadeSlideIn(
            index: 1,
            child: const GoogleCalendarSettingsPanel(),
          ),
          SizedBox(height: tokens.lg),
          FadeSlideIn(
            index: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(l10n.storageSourcesTitle, style: Theme.of(context).textTheme.titleSmall),
                SizedBox(height: tokens.xs),
                Text(
                  l10n.storageSourcesBody,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
                ),
                SizedBox(height: tokens.sm),
                Text(
                  l10n.storageDriveSharingNote,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
                ),
                SizedBox(height: tokens.md),
                const DataSourcesPanel(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
