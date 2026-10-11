import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/navigation/app_routes.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../dashboard/presentation/sections/dashboard_header.dart';
import '../application/pulse_providers.dart';
import '../domain/pulse_models.dart';

/// Cross-module “today” stream: reminders, events, approvals, tasks, and inbox signals.
class PulseHubScreen extends ConsumerWidget {
  const PulseHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final digest = ref.watch(pulseDigestProvider);
    final ai = ref.watch(pulseAiSummaryProvider);

    return PageScaffold(
      title: l10n.navPulse,
      actions: [
        IconButton(
          tooltip: l10n.navNotifications,
          icon: Badge(
            isLabelVisible: digest.unreadCount > 0,
            label: Text('${digest.unreadCount.clamp(0, 9)}'),
            child: const Icon(Icons.notifications_outlined),
          ),
          onPressed: () => context.push(AppRoutes.notifications),
        ),
      ],
      body: RefreshIndicator(
        onRefresh: () => refreshPulse(ref),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.xxl * 2),
          children: [
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: ReadableBody.maxWidth),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _PulseMasthead(digest: digest),
                    SizedBox(height: tokens.lg),
                    _AiBriefCard(summary: ai, digest: digest),
                    if (digest.moduleCounts.isNotEmpty) ...[
                      SizedBox(height: tokens.lg),
                      _ModuleStrip(counts: digest.moduleCounts),
                    ],
                    SizedBox(height: tokens.lg),
                    _TimelineSection(
                      title: l10n.pulseTodayTitle,
                      emptyMessage: l10n.pulseTodayEmpty,
                      items: digest.today,
                      loading: !digest.ready,
                    ),
                    if (digest.weekAhead.isNotEmpty) ...[
                      SizedBox(height: tokens.lg),
                      _TimelineSection(
                        title: l10n.pulseWeekTitle,
                        emptyMessage: l10n.pulseWeekEmpty,
                        items: digest.weekAhead,
                        loading: false,
                        compact: true,
                      ),
                    ],
                    if (digest.inbox.isNotEmpty) ...[
                      SizedBox(height: tokens.lg),
                      SectionCard(
                        title: l10n.pulseInboxTitle,
                        trailing: TextButton(
                          onPressed: () => context.push(AppRoutes.notifications),
                          child: Text(l10n.viewAll),
                        ),
                        child: Column(
                          children: [
                            for (final (i, item) in digest.inbox.indexed) ...[
                              if (i > 0) const Divider(height: 1),
                              _PulseRow(item: item),
                            ],
                          ],
                        ),
                      ),
                    ],
                    if (digest.ready && digest.isClear) ...[
                      SizedBox(height: tokens.xl),
                      EmptyState(
                        icon: Icons.wb_sunny_outlined,
                        title: l10n.pulseAllClearTitle,
                        body: l10n.pulseAllClearBody,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PulseMasthead extends StatelessWidget {
  const _PulseMasthead({required this.digest});

  final PulseDigest digest;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final dateLabel = formats.date(digest.now);

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(tokens.radius + 16),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color.lerp(tokens.primary, tokens.bg, 0.82)!,
            Color.lerp(tokens.secondary, tokens.surface, 0.75)!,
            tokens.surface,
          ],
        ),
        border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
      ),
      child: Padding(
        padding: EdgeInsets.all(tokens.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _LiveDot(color: tokens.primary),
                SizedBox(width: tokens.sm),
                Text(
                  l10n.pulseEyebrow,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: tokens.muted,
                        letterSpacing: 1.4,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const Spacer(),
                Text(
                  dateLabel,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.muted),
                ),
              ],
            ),
            SizedBox(height: tokens.md),
            Text(
              l10n.pulseHeadline,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600, letterSpacing: -0.4),
            ),
            SizedBox(height: tokens.sm),
            const DashboardGreeting(),
            if (digest.ready && digest.todayCount > 0) ...[
              SizedBox(height: tokens.md),
              Text(
                l10n.pulseTodayCount(digest.todayCount, digest.urgentCount),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _LiveDot extends StatelessWidget {
  const _LiveDot({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        boxShadow: [BoxShadow(color: color.withValues(alpha: 0.55), blurRadius: 8, spreadRadius: 1)],
      ),
    );
  }
}

class _AiBriefCard extends ConsumerWidget {
  const _AiBriefCard({required this.summary, required this.digest});

  final AsyncValue<String?> summary;
  final PulseDigest digest;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final policy = ref.watch(accessPolicyProvider);
    final canAi = policy.can(Permissions.contentView);

    final text = switch (summary) {
      AsyncData(value: final value?) => value,
      _ when !digest.ready => null,
      _ when digest.isClear => l10n.pulseBriefClear,
      _ => l10n.pulseBriefBusy(digest.todayCount, digest.urgentCount, digest.unreadCount),
    };

    if (text == null && summary.isLoading) {
      return SurfaceCard(
        child: Row(
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: tokens.primary),
            ),
            SizedBox(width: tokens.md),
            Expanded(child: Text(l10n.pulseAiLoading, style: Theme.of(context).textTheme.bodyMedium)),
          ],
        ),
      );
    }
    if (text == null) return const SizedBox.shrink();

    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.auto_awesome_outlined, size: 18, color: tokens.primary),
              SizedBox(width: tokens.sm),
              Text(
                canAi ? l10n.pulseAiTitle : l10n.pulseBriefTitle,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600),
              ),
              if (canAi) ...[
                const Spacer(),
                IconButton(
                  tooltip: l10n.pulseAiRefresh,
                  visualDensity: VisualDensity.compact,
                  onPressed: () => ref.invalidate(pulseAiSummaryProvider),
                  icon: const Icon(Icons.refresh_rounded, size: 20),
                ),
              ],
            ],
          ),
          SizedBox(height: tokens.sm),
          Text(text, style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.45)),
        ],
      ),
    );
  }
}

class _ModuleStrip extends StatelessWidget {
  const _ModuleStrip({required this.counts});

  final Map<PulseKind, int> counts;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final entries = counts.entries.where((e) => e.value > 0).toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return Wrap(
      spacing: tokens.sm,
      runSpacing: tokens.sm,
      children: [
        for (final entry in entries)
          Chip(
            avatar: Icon(pulseKindIcon(entry.key), size: 16),
            label: Text('${pulseKindLabel(l10n, entry.key)} · ${entry.value}'),
            visualDensity: VisualDensity.compact,
          ),
      ],
    );
  }
}

class _TimelineSection extends StatelessWidget {
  const _TimelineSection({
    required this.title,
    required this.emptyMessage,
    required this.items,
    required this.loading,
    this.compact = false,
  });

  final String title;
  final String emptyMessage;
  final List<PulseItem> items;
  final bool loading;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    Widget body;
    if (loading) {
      body = const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Center(child: CircularProgressIndicator.adaptive()),
      );
    } else if (items.isEmpty) {
      body = Padding(
        padding: EdgeInsets.symmetric(vertical: tokens.md),
        child: Text(emptyMessage, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted)),
      );
    } else {
      body = Column(
        children: [
          for (final (i, item) in items.indexed) ...[
            if (i > 0) SizedBox(height: compact ? tokens.sm : tokens.md),
            _PulseTimelineTile(item: item, compact: compact, showConnector: i < items.length - 1),
          ],
        ],
      );
    }

    return SectionCard(title: title, child: body);
  }
}

class _PulseTimelineTile extends StatelessWidget {
  const _PulseTimelineTile({required this.item, required this.compact, required this.showConnector});

  final PulseItem item;
  final bool compact;
  final bool showConnector;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final timeLabel = _timeLabel(l10n, formats, item);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 52,
            child: Column(
              children: [
                DecoratedBox(
                  decoration: BoxDecoration(
                    color: item.urgent ? StatusTone.warning.color(tokens).withValues(alpha: 0.15) : tokens.subtle,
                    borderRadius: BorderRadius.circular(tokens.radius),
                    border: Border.all(color: tokens.border),
                  ),
                  child: Padding(
                    padding: EdgeInsets.all(compact ? tokens.xs + 2 : tokens.sm),
                    child: Icon(
                      pulseKindIcon(item.kind),
                      size: compact ? 16 : 18,
                      color: item.urgent ? StatusTone.warning.color(tokens) : tokens.primary,
                    ),
                  ),
                ),
                if (showConnector)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: EdgeInsets.symmetric(vertical: tokens.xs),
                      color: tokens.border.withValues(alpha: 0.7),
                    ),
                  ),
              ],
            ),
          ),
          SizedBox(width: tokens.md),
          Expanded(
            child: Material(
              color: tokens.subtle.withValues(alpha: 0.35),
              borderRadius: BorderRadius.circular(tokens.radius + 2),
              clipBehavior: Clip.antiAlias,
              child: InkWell(
                onTap: () => context.push(item.route),
                child: Padding(
                  padding: EdgeInsets.all(compact ? tokens.sm + 2 : tokens.md),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            if (item.subtitle != null) ...[
                              SizedBox(height: 2),
                              Text(
                                item.subtitle!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
                              ),
                            ],
                          ],
                        ),
                      ),
                      SizedBox(width: tokens.sm),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          if (timeLabel != null)
                            Text(
                              timeLabel,
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted),
                            ),
                          if (item.urgent)
                            Padding(
                              padding: EdgeInsets.only(top: tokens.xs),
                              child: StatusBadge(label: l10n.pulseUrgent, tone: StatusTone.warning, dense: true),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String? _timeLabel(AppLocalizations l10n, AppFormats formats, PulseItem item) {
    if (item.allDay) return l10n.dashboardAllDay;
    final at = item.at;
    if (at == null) return l10n.pulseAnytime;
    return formats.time(at);
  }
}

class _PulseRow extends StatelessWidget {
  const _PulseRow({required this.item});

  final PulseItem item;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final formats = context.formats;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(pulseKindIcon(item.kind), color: tokens.secondary),
      title: Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis),
      subtitle: item.subtitle == null
          ? null
          : Text(item.subtitle!, maxLines: 2, overflow: TextOverflow.ellipsis),
      trailing: Text(
        formats.relative(item.at ?? DateTime.now()),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted),
      ),
      onTap: () => context.push(item.route),
    );
  }
}

String pulseKindLabel(AppLocalizations l10n, PulseKind kind) => switch (kind) {
      PulseKind.task => l10n.navTasks,
      PulseKind.approval => l10n.navApprovals,
      PulseKind.content => l10n.navContent,
      PulseKind.invoice => l10n.navInvoices,
      PulseKind.calendar => l10n.navCalendar,
      PulseKind.notification => l10n.navNotifications,
    };
