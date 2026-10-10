import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/presentation/permission_gate.dart';
import '../../approvals/application/approvals_controller.dart';
import '../../approvals/approvals_routes.dart';
import '../../auth/application/session_controller.dart';
import '../../clients/clients_routes.dart';
import '../../directory/application/directory_providers.dart';
import '../application/content_controller.dart';
import '../content_routes.dart';
import '../domain/content.dart';
import '../domain/content_workflow.dart';
import 'content_actions_ui.dart';
import 'content_comments.dart';
import 'content_labels.dart';
import 'content_preview.dart';
import 'content_workflow_panel.dart';

enum _MenuAction { copyLink, share, delete }

class ContentDetailScreen extends ConsumerWidget {
  const ContentDetailScreen({required this.contentId, super.key});

  final String contentId;

  /// Width at which the preview sits beside the workflow and details.
  static const _wideBreakpoint = 760.0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final item = ref.watch(contentItemProvider(contentId));
    final loaded = item.value;
    final policy = ref.watch(accessPolicyProvider);
    final canEdit = loaded != null && isContentEditable(loaded.status) && policy.can(Permissions.contentEdit);
    final canDelete = loaded != null && policy.can(Permissions.contentDelete);

    return PageScaffold(
      title: loaded == null ? l10n.contentTitle : _titleOf(l10n, loaded),
      actions: [
        if (canEdit)
          PermissionGate(
            anyOf: const [Permissions.contentEdit],
            child: IconButton(
              tooltip: l10n.edit,
              icon: const Icon(Icons.edit_outlined),
              onPressed: () => context.push(ContentRoutes.edit(contentId)),
            ),
          ),
        if (loaded != null)
          PopupMenuButton<_MenuAction>(
            tooltip: l10n.moreActions,
            onSelected: (action) => _onMenu(context, ref, loaded, action),
            itemBuilder: (context) => [
              PopupMenuItem(
                value: _MenuAction.copyLink,
                child: ListTile(leading: const Icon(Icons.link), title: Text(l10n.contentCopyLink)),
              ),
              PopupMenuItem(
                value: _MenuAction.share,
                child: ListTile(leading: const Icon(Icons.ios_share_outlined), title: Text(l10n.contentShare)),
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
      ],
      body: AsyncValueView<Content>(
        value: item,
        onRetry: () => ref.invalidate(contentItemProvider(contentId)),
        data: (content) => LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= _wideBreakpoint;
            final preview = _PreviewSection(content: content);
            final side = [
              FadeSlideIn(index: 3, child: ContentWorkflowPanel(content: content)),
              FadeSlideIn(index: 4, child: _ApprovalLink(contentId: content.id)),
              FadeSlideIn(index: 5, child: _DetailsSection(content: content)),
            ];
            final comments = PermissionGate(
              anyOf: const [Permissions.feedbackView],
              child: FadeSlideIn(index: 6, child: ContentComments(contentId: content.id)),
            );
            final gap = SizedBox(height: context.tokens.lg, width: context.tokens.lg);
            return ReadableBody(
              onRefresh: () {
                ref.invalidate(contentCommentsProvider(contentId));
                return ref.refresh(contentItemProvider(contentId).future);
              },
              children: [
                FadeSlideIn(child: _Header(content: content)),
                gap,
                FadeSlideIn(index: 1, child: _ContentMetrics(content: content)),
                gap,
                if (wide)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: FadeSlideIn(index: 2, child: preview)),
                      gap,
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [for (final (i, w) in side.indexed) ...[if (i > 0) gap, w]],
                        ),
                      ),
                    ],
                  )
                else ...[
                  FadeSlideIn(index: 2, child: preview),
                  for (final w in side) ...[gap, w],
                ],
                gap,
                comments,
              ],
            );
          },
        ),
      ),
    );
  }

  static String _titleOf(AppLocalizations l10n, Content content) =>
      content.title.isEmpty ? l10n.contentUntitled : content.title;

  Future<void> _onMenu(BuildContext context, WidgetRef ref, Content? content, _MenuAction action) async {
    if (content == null) return;
    final l10n = AppLocalizations.of(context);
    switch (action) {
      case _MenuAction.copyLink:
        await Clipboard.setData(ClipboardData(text: ContentRoutes.shareUrl(content.id)));
        if (context.mounted) showToast(context, l10n.contentLinkCopied);
      case _MenuAction.share:
        final clientName = ref.read(clientDirectoryProvider).value?.nameOf(content.clientId) ?? l10n.valueUnknown;
        final summary = l10n.contentShareText(
          _titleOf(l10n, content),
          clientName,
          ContentRoutes.shareUrl(content.id),
        );
        await Clipboard.setData(ClipboardData(text: summary));
        if (context.mounted) showToast(context, l10n.contentShareCopied);
      case _MenuAction.delete:
        final confirmed = await confirmAction(
          context,
          title: l10n.deleteConfirmTitle(_titleOf(l10n, content)),
          body: l10n.deleteConfirmBody,
          confirmLabel: l10n.delete,
          destructive: true,
        );
        if (!confirmed || !context.mounted) return;
        final deleted = await runAction(
          context,
          () => ref.read(contentActionsProvider).delete(content.id),
          success: l10n.deletedToast,
        );
        if (deleted && context.mounted) context.go(ContentRoutes.root);
    }
  }
}

/// Link to a pending formal approval request when one exists for this post.
class _ApprovalLink extends ConsumerWidget {
  const _ApprovalLink({required this.contentId});

  final String contentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final approval = ref.watch(pendingContentApprovalProvider(contentId));
    if (approval == null) return const SizedBox.shrink();

    return PermissionGate(
      anyOf: const [Permissions.approvalsView],
      child: SectionCard(
        title: l10n.contentOpenApproval,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(l10n.contentOpenApprovalBody, style: text.bodyMedium?.copyWith(color: tokens.secondary)),
            SizedBox(height: tokens.md),
            FilledButton.tonalIcon(
              onPressed: () => context.push(ApprovalsRoutes.detail(approval.id)),
              icon: const Icon(Icons.verified_outlined),
              label: Text(l10n.contentOpenApproval),
            ),
          ],
        ),
      ),
    );
  }
}

class _ContentMetrics extends StatelessWidget {
  const _ContentMetrics({required this.content});

  static const _minTileWidth = 160.0;

  final Content content;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final scheduled = content.scheduledAt;
    final tiles = [
      MetricTile(
        label: l10n.contentFieldScheduledAt,
        icon: Icons.event_outlined,
        value: scheduled == null ? l10n.contentUnscheduled : formats.date(scheduled),
        caption: scheduled == null ? null : formats.time(scheduled),
      ),
      MetricTile(
        label: l10n.contentFieldPlatforms,
        icon: Icons.public,
        value: formats.number(content.platforms.length),
        caption: content.platforms.isEmpty
            ? null
            : content.platforms.take(2).map((p) => contentPlatformLabel(l10n, p)).join(' · '),
      ),
      MetricTile(
        label: l10n.contentStatMedia,
        icon: Icons.collections_outlined,
        value: formats.number(content.media.length),
        caption: content.hashtags.isEmpty ? null : '#${content.hashtags.length}',
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

class _Header extends ConsumerWidget {
  const _Header({required this.content});

  final Content content;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(
          header: true,
          child: Text(ContentDetailScreen._titleOf(l10n, content), style: text.headlineSmall),
        ),
        SizedBox(height: tokens.sm),
        Wrap(
          spacing: tokens.sm,
          runSpacing: tokens.sm,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            ContentStatusBadge(status: content.status),
            TagChip(label: contentTypeLabel(l10n, content.contentType), icon: contentTypeIcon(content.contentType)),
            Text(
              l10n.contentUpdatedAgo(context.formats.relative(content.updatedAt)),
              style: text.labelMedium?.copyWith(color: tokens.muted),
            ),
          ],
        ),
        if (content.status == ContentStatuses.published) ...[
          SizedBox(height: tokens.md),
          Row(
            children: [
              Icon(Icons.lock_outline, size: 18, color: tokens.muted),
              SizedBox(width: tokens.sm),
              Expanded(child: Text(l10n.contentPublishedReadOnly, style: text.bodySmall?.copyWith(color: tokens.muted))),
            ],
          ),
        ],
      ],
    );
  }
}

class _PreviewSection extends ConsumerWidget {
  const _PreviewSection({required this.content});

  final Content content;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final clientName = ref.watch(clientDirectoryProvider).value?.nameOf(content.clientId) ?? l10n.valueUnknown;
    return SectionCard(
      title: l10n.contentPreviewTitle,
      child: ContentPreview(
        clientId: content.clientId,
        clientName: clientName,
        contentType: content.contentType,
        platforms: content.platforms,
        caption: content.caption,
        hashtags: content.hashtags,
        media: content.media,
      ),
    );
  }
}

class _DetailsSection extends ConsumerWidget {
  const _DetailsSection({required this.content});

  final Content content;

  Future<void> _openCta(BuildContext context, String url) async {
    final l10n = AppLocalizations.of(context);
    final uri = Uri.tryParse(url);
    final opened = uri != null && await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && context.mounted) showToast(context, l10n.contentLinkFailed);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final me = ref.watch(sessionProvider).value?.userId;
    final clientName = ref.watch(clientDirectoryProvider).value?.nameOf(content.clientId) ?? l10n.valueUnknown;
    final authorId = content.authorId;
    final author = authorId == null
        ? l10n.valueUnknown
        : authorId == me
            ? l10n.contentCommentYou
            : ref.watch(memberDirectoryProvider).value?.nameOf(authorId) ?? l10n.contentCommentTeammate;
    final canOpenClient = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.clientsView)));
    final scheduledAt = content.scheduledAt;
    final ctaUrl = content.ctaUrl;
    final pillar = content.pillar;
    final canReschedule = content.status != ContentStatuses.published;

    return SectionCard(
      title: l10n.details,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InfoRow(
            label: l10n.contentFieldClient,
            icon: Icons.business_outlined,
            alignEnd: false,
            value: canOpenClient
                ? TextButton(
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      alignment: AlignmentDirectional.centerStart,
                    ),
                    onPressed: () => context.push(ClientsRoutes.detail(content.clientId)),
                    child: Text(clientName, textAlign: TextAlign.start),
                  )
                : Text(clientName),
          ),
          InfoRow(label: l10n.contentFieldAuthor, icon: Icons.person_outline, value: Text(author)),
          InfoRow(
            label: l10n.contentFieldScheduledAt,
            icon: Icons.event_outlined,
            alignEnd: false,
            value: Row(
              children: [
                Expanded(
                  child: Text(
                    scheduledAt == null ? l10n.contentUnscheduled : formats.dateTime(scheduledAt.toLocal()),
                    textAlign: TextAlign.start,
                  ),
                ),
                if (canReschedule)
                  AllPermissionsGate(
                    allOf: const [Permissions.contentEdit, Permissions.socialSchedule],
                    child: IconButton(
                      tooltip: l10n.contentRescheduleTitle,
                      icon: const Icon(Icons.edit_calendar_outlined),
                      onPressed: () => showScheduleSheet(context, ref, content, markScheduled: false),
                    ),
                  ),
              ],
            ),
          ),
          if (pillar != null && pillar.isNotEmpty)
            InfoRow(label: l10n.contentFieldPillar, icon: Icons.view_column_outlined, value: Text(pillar)),
          if (ctaUrl != null && ctaUrl.isNotEmpty)
            InfoRow(
              label: l10n.contentFieldCta,
              icon: Icons.link,
              alignEnd: false,
              value: TextButton(
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  alignment: AlignmentDirectional.centerStart,
                ),
                onPressed: () => _openCta(context, ctaUrl),
                child: Text(ctaUrl, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.start),
              ),
            ),
          InfoRow(
            label: l10n.contentFieldUpdated,
            icon: Icons.history,
            value: Text(formats.relative(content.updatedAt)),
          ),
          if (content.platforms.isNotEmpty) ...[
            SizedBox(height: tokens.md),
            Text(l10n.contentFieldPlatforms, style: text.labelLarge),
            SizedBox(height: tokens.sm),
            Wrap(
              spacing: tokens.sm,
              runSpacing: tokens.sm,
              children: [for (final p in content.platforms) PlatformChip(platform: p)],
            ),
          ],
          if (content.hashtags.isNotEmpty) ...[
            SizedBox(height: tokens.md),
            Text(l10n.contentFieldHashtags, style: text.labelLarge),
            SizedBox(height: tokens.sm),
            Wrap(
              spacing: tokens.sm,
              runSpacing: tokens.sm,
              children: [for (final tag in content.hashtags) TagChip(label: tag)],
            ),
          ],
        ],
      ),
    );
  }
}
