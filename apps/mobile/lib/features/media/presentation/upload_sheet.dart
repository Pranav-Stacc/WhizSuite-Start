import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/forms/validators.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/forms.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../application/media_upload_port.dart';
import '../application/upload_queue.dart';
import '../domain/media_asset.dart';
import 'media_labels.dart';

/// Picks files, asks which client they belong to (staff), uploads them with a progress sheet,
/// and returns the assets that finished uploading.
Future<List<MediaAsset>> startMediaUpload(BuildContext context, WidgetRef ref, {String? clientId}) async {
  final l10n = AppLocalizations.of(context);
  final picked = await FilePicker.pickFiles(dialogTitle: l10n.mediaUploadPickTitle);
  if (picked.isEmpty || !context.mounted) return const [];
  final sources = await Future.wait(picked.map(_sourceOf));

  final session = ref.read(sessionProvider).value;
  var owner = clientId ?? (session?.isClientPortal ?? false ? session?.clientId : null);
  if (owner == null) {
    final clients = await ref.read(clientDirectoryProvider.future);
    if (!context.mounted) return const [];
    if (clients.entries.isNotEmpty) {
      owner = await _askClient(context, clients.entries.map((e) => (id: e.id, name: e.name)).toList(), sources.length);
      if (owner == null) return const [];
    }
  }
  if (!context.mounted) return const [];

  final ids = ref.read(mediaUploadQueueProvider.notifier).enqueue(sources, clientId: owner);
  await showUploadProgressSheet(context, focus: ids);
  final tasks = ref.read(mediaUploadQueueProvider);
  return [
    for (final task in tasks)
      if (ids.contains(task.id)) ?task.asset,
  ];
}

Future<UploadSource> _sourceOf(PlatformFile file) async =>
    UploadSource(name: file.name, sizeBytes: file.lengthSync() ?? await file.length() ?? 0, openRead: file.readAsByteStream);

Future<String?> _askClient(BuildContext context, List<({String id, String name})> clients, int fileCount) async {
  final l10n = AppLocalizations.of(context);
  String? selected;
  final ok = await showFormSheet(
    context,
    title: l10n.mediaUploadClientTitle(fileCount),
    submitLabel: l10n.mediaUploadStart,
    fields: (context, setState) => [
      Text(l10n.mediaUploadClientBody, style: Theme.of(context).textTheme.bodyMedium),
      OptionField<String>(
        label: l10n.mediaFieldClient,
        value: selected,
        options: [for (final c in clients) c.id],
        labelOf: (id) => clients.firstWhere((c) => c.id == id).name,
        onChanged: (value) => setState(() => selected = value),
        validator: (value) => Validators(l10n).required(value),
      ),
    ],
    onSubmit: () async {},
  );
  return ok ? selected : null;
}

/// Live progress for the upload queue. [focus] limits the list to one batch; null shows everything.
Future<void> showUploadProgressSheet(BuildContext context, {List<String>? focus}) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      useSafeArea: true,
      builder: (_) => _UploadProgressSheet(focus: focus),
    );

class _UploadProgressSheet extends ConsumerWidget {
  const _UploadProgressSheet({this.focus});

  final List<String>? focus;

  static const _maxWidth = 640.0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final all = ref.watch(mediaUploadQueueProvider);
    final scope = focus;
    final tasks = scope == null ? all : all.where((t) => scope.contains(t.id)).toList();
    final done = tasks.where((t) => t.phase == UploadPhase.done).length;
    final failed = tasks.where((t) => t.phase == UploadPhase.failed).length;
    final busy = tasks.any((t) => !t.isFinished);
    final queue = ref.read(mediaUploadQueueProvider.notifier);

    return Center(
      heightFactor: 1,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: _maxWidth),
        child: Padding(
          padding: EdgeInsets.fromLTRB(tokens.xl, 0, tokens.xl, tokens.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(header: true, child: Text(l10n.mediaUploadTitle, style: text.titleLarge)),
              SizedBox(height: tokens.xs),
              Semantics(
                liveRegion: true,
                child: Text(
                  busy ? l10n.mediaUploadProgress(done, tasks.length) : l10n.mediaUploadSummary(done, failed),
                  style: text.bodyMedium?.copyWith(color: tokens.muted),
                ),
              ),
              SizedBox(height: tokens.lg),
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: tasks.length,
                  separatorBuilder: (_, _) => SizedBox(height: tokens.md),
                  itemBuilder: (context, i) => _TaskRow(task: tasks[i], onRetry: () => queue.retry(tasks[i].id)),
                ),
              ),
              SizedBox(height: tokens.lg),
              Row(
                children: [
                  if (failed > 0)
                    TextButton.icon(
                      onPressed: queue.retryFailed,
                      icon: const Icon(Icons.refresh),
                      label: Text(l10n.mediaUploadRetryAll),
                    ),
                  const Spacer(),
                  FilledButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text(busy ? l10n.mediaUploadHide : l10n.close),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TaskRow extends StatelessWidget {
  const _TaskRow({required this.task, required this.onRetry});

  final UploadTask task;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final (label, tone) = switch (task.phase) {
      UploadPhase.queued => (l10n.mediaUploadQueued, StatusTone.neutral),
      UploadPhase.uploading => (l10n.mediaUploadSending, StatusTone.info),
      UploadPhase.finishing => (l10n.mediaUploadFinishing, StatusTone.info),
      UploadPhase.done => (l10n.mediaUploadDone, StatusTone.success),
      UploadPhase.failed => (l10n.mediaUploadFailed, StatusTone.danger),
    };
    final percent = (task.progress * 100).round();
    return MergeSemantics(
      child: Row(
        children: [
          Icon(mediaKindIcon(assetKindOf(task.source.mimeType)), color: tokens.muted),
          SizedBox(width: tokens.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(task.source.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.bodyMedium),
                    ),
                    SizedBox(width: tokens.sm),
                    StatusBadge(label: label, tone: tone, dense: true),
                  ],
                ),
                SizedBox(height: tokens.xs),
                if (task.phase == UploadPhase.failed)
                  Text(
                    describeUploadError(l10n, task.error),
                    style: text.bodySmall?.copyWith(color: Theme.of(context).colorScheme.error),
                  )
                else ...[
                  Semantics(
                    value: l10n.mediaUploadPercent(percent),
                    child: LinearProgressIndicator(
                      value: task.phase == UploadPhase.queued ? 0 : (task.phase == UploadPhase.finishing ? null : task.progress),
                      borderRadius: tokens.borderRadius,
                    ),
                  ),
                  SizedBox(height: tokens.xs),
                  Text(
                    l10n.mediaUploadBytes(formats.fileSize((task.progress * task.source.sizeBytes).round()), formats.fileSize(task.source.sizeBytes)),
                    style: text.labelSmall?.copyWith(color: tokens.muted),
                  ),
                ],
              ],
            ),
          ),
          if (task.phase == UploadPhase.failed)
            IconButton(tooltip: l10n.retry, icon: const Icon(Icons.refresh), onPressed: onRetry),
        ],
      ),
    );
  }
}
