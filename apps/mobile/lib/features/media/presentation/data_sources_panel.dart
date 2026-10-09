import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/state_views.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/storage_providers.dart';
import '../data/storage_repository.dart';
import '../domain/storage_models.dart';

class DataSourcesPanel extends ConsumerWidget {
  const DataSourcesPanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sources = ref.watch(dataSourcesProvider);
    return switch (sources) {
      AsyncValue(value: final items?) => Column(
          children: [
            for (final source in items) DataSourceCard(source: source),
          ],
        ),
      AsyncValue(error: final error?, stackTrace: _) => ErrorState(
          error: error,
          onRetry: () => ref.invalidate(dataSourcesProvider),
        ),
      _ => const Center(child: CircularProgressIndicator()),
    };
  }
}

class DataSourceCard extends ConsumerStatefulWidget {
  const DataSourceCard({required this.source, super.key});

  final MediaDataSource source;

  @override
  ConsumerState<DataSourceCard> createState() => _DataSourceCardState();
}

class _DataSourceCardState extends ConsumerState<DataSourceCard> {
  var _busy = false;

  Future<void> _connect() async {
    setState(() => _busy = true);
    final l10n = AppLocalizations.of(context);
    try {
      final url = await ref.read(storageRepositoryProvider).beginGoogleDriveConnect();
      final uri = Uri.tryParse(url);
      if (uri == null || !await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        if (mounted) showToast(context, l10n.storageDriveConnectFailed);
      }
    } catch (_) {
      if (mounted) showToast(context, l10n.storageDriveConnectFailed);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _disconnect() async {
    final connectionId = widget.source.connectionId;
    if (connectionId == null) return;
    setState(() => _busy = true);
    final l10n = AppLocalizations.of(context);
    try {
      await ref.read(storageRepositoryProvider).disconnectGoogleDrive(connectionId);
      ref.invalidate(dataSourcesProvider);
      if (mounted) showToast(context, l10n.storageDriveDisconnected);
    } catch (_) {
      if (mounted) showToast(context, l10n.storageDriveDisconnectFailed);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _transferAll() async {
    final connectionId = widget.source.connectionId;
    if (connectionId == null) return;
    setState(() => _busy = true);
    final l10n = AppLocalizations.of(context);
    try {
      final job = await ref.read(storageRepositoryProvider).createDriveTransfer(connectionId: connectionId, transferAll: true);
      if (job.isFailed) {
        if (mounted) showToast(context, job.error ?? l10n.storageDriveTransferFailed);
      } else if (mounted) {
        showToast(context, l10n.storageDriveTransferStarted);
      }
      ref.invalidate(dataSourcesProvider);
      ref.invalidate(storageUsageProvider);
    } catch (_) {
      if (mounted) showToast(context, l10n.storageDriveTransferFailed);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final source = widget.source;
    final icon = source.isGoogleDrive ? Icons.cloud_outlined : Icons.storage_outlined;

    return Card(
      margin: EdgeInsets.only(bottom: tokens.md),
      child: Padding(
        padding: EdgeInsets.all(tokens.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(icon, size: 20),
                SizedBox(width: tokens.sm),
                Expanded(child: Text(source.name, style: Theme.of(context).textTheme.titleSmall)),
                _StatusChip(status: source.status),
              ],
            ),
            SizedBox(height: tokens.sm),
            Text(
              source.isPlatform ? l10n.storageSourcePlatformBody : l10n.storageSourceDriveBody,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
            ),
            if (source.isGoogleDrive) ...[
              SizedBox(height: tokens.md),
              PermissionGate(
                anyOf: const [Permissions.integrationsManage],
                child: Wrap(
                  spacing: tokens.sm,
                  runSpacing: tokens.sm,
                  children: [
                    if (!source.isConnected && source.status != 'DISABLED')
                      FilledButton(
                        onPressed: _busy ? null : _connect,
                        child: Text(l10n.storageDriveConnect),
                      ),
                    if (source.isConnected) ...[
                      PermissionGate(
                        anyOf: const [Permissions.filesUpload],
                        child: OutlinedButton(
                          onPressed: _busy ? null : _transferAll,
                          child: Text(l10n.storageDriveTransferAll),
                        ),
                      ),
                      OutlinedButton(
                        onPressed: _busy ? null : _disconnect,
                        child: Text(l10n.storageDriveDisconnect),
                      ),
                    ],
                    if (source.status == 'DISABLED')
                      Text(
                        l10n.storageDriveNotConfigured,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final label = switch (status) {
      'CONNECTED' => l10n.storageStatusConnected,
      'AVAILABLE' => l10n.storageStatusAvailable,
      'PENDING' => l10n.storageStatusPending,
      'ERROR' => l10n.storageStatusError,
      'DISABLED' => l10n.storageStatusDisabled,
      _ => status,
    };
    return Chip(label: Text(label, style: Theme.of(context).textTheme.labelSmall));
  }
}
