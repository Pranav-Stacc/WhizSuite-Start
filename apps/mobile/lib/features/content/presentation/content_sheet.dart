import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/content.dart';
import 'content_labels.dart';
import 'content_media.dart';

class ContentSheetColumn {
  const ContentSheetColumn({required this.key, this.day, this.post});

  final String key;
  final DateTime? day;
  final Content? post;
}

/// One column per scheduled post (or empty day), rows for each content field.
class ContentSheet extends StatelessWidget {
  const ContentSheet({
    required this.columns,
    required this.onNewPost,
    this.onPostTap,
    super.key,
  });

  static const _labelWidth = 120.0;
  static const _columnWidth = 220.0;
  static const _defaultHour = 10;

  final List<ContentSheetColumn> columns;
  final ValueChanged<DateTime> onNewPost;
  final ValueChanged<Content>? onPostTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    if (columns.isEmpty) {
      return Padding(
        padding: EdgeInsets.all(tokens.xl),
        child: Text(l10n.contentSheetEmpty, textAlign: TextAlign.center, style: TextStyle(color: tokens.muted)),
      );
    }

    final rows = <_SheetRow>[
      _SheetRow(l10n.contentSheetRowType, (post) => Text(contentTypeLabel(l10n, post.contentType), style: Theme.of(context).textTheme.labelSmall)),
      _SheetRow(
        l10n.contentSheetRowName,
        (post) => InkWell(
          onTap: onPostTap == null ? null : () => onPostTap!(post),
          child: Text(post.title.isEmpty ? l10n.contentUntitled : post.title, style: Theme.of(context).textTheme.titleSmall),
        ),
      ),
      _SheetRow(
        l10n.contentSheetRowVisual,
        (post) => AspectRatio(
          aspectRatio: 4 / 5,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(tokens.radius),
            child: ContentMediaThumb(media: post.cover, fallbackIcon: contentTypeIcon(post.contentType)),
          ),
        ),
      ),
      _SheetRow(l10n.contentSheetRowCaption, (post) => Text(post.caption.isEmpty ? '—' : post.caption, maxLines: 8, overflow: TextOverflow.ellipsis)),
      _SheetRow(l10n.contentSheetRowHashtags, (post) => Text(post.hashtags.isEmpty ? '—' : post.hashtags.join(' '), maxLines: 4, overflow: TextOverflow.ellipsis, style: TextStyle(color: tokens.muted))),
      _SheetRow(l10n.contentSheetRowCta, (post) => Text(post.ctaUrl ?? '—', maxLines: 2, overflow: TextOverflow.ellipsis)),
      _SheetRow(l10n.contentSheetRowPillar, (post) => Text(post.pillar ?? '—')),
      _SheetRow(l10n.contentSheetRowStatus, (post) => ContentStatusBadge(status: post.status, dense: true)),
    ];

    return DecoratedBox(
      decoration: BoxDecoration(border: Border.all(color: tokens.border), borderRadius: BorderRadius.circular(tokens.radius + 4)),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(tokens.radius + 4),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _LabelColumn(rows: rows),
                for (final column in columns) _DataColumn(column: column, rows: rows, onNewPost: onNewPost),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Builds day columns for a month from scheduled posts.
  static List<ContentSheetColumn> columnsForMonth({
    required DateTime month,
    required Iterable<Content> posts,
    bool hideEmptyDays = false,
  }) {
    final start = DateTime(month.year, month.month);
    final end = DateTime(month.year, month.month + 1);
    final scheduled = posts.where((post) {
      final at = post.scheduledAt;
      if (at == null) return false;
      final local = at.toLocal();
      return !local.isBefore(start) && local.isBefore(end);
    }).toList()
      ..sort((a, b) => a.scheduledAt!.compareTo(b.scheduledAt!));

    final byDay = <DateTime, List<Content>>{};
    for (final post in scheduled) {
      final local = post.scheduledAt!.toLocal();
      final day = DateTime(local.year, local.month, local.day);
      byDay.putIfAbsent(day, () => []).add(post);
    }

    final columns = <ContentSheetColumn>[];
    var cursor = start;
    while (cursor.isBefore(end)) {
      final day = DateTime(cursor.year, cursor.month, cursor.day);
      final dayPosts = byDay[day];
      if (dayPosts != null && dayPosts.isNotEmpty) {
        for (final post in dayPosts) {
          columns.add(ContentSheetColumn(key: '${day.toIso8601String()}-${post.id}', day: day, post: post));
        }
      } else if (!hideEmptyDays) {
        columns.add(ContentSheetColumn(key: day.toIso8601String(), day: day));
      }
      cursor = cursor.add(const Duration(days: 1));
    }
    return columns;
  }

  static DateTime defaultScheduleForDay(DateTime day) =>
      DateTime(day.year, day.month, day.day, _defaultHour);
}

class _SheetRow {
  const _SheetRow(this.label, this.builder);

  final String label;
  final Widget Function(Content post) builder;
}

class _LabelColumn extends StatelessWidget {
  const _LabelColumn({required this.rows});

  final List<_SheetRow> rows;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return SizedBox(
      width: ContentSheet._labelWidth,
      child: ColoredBox(
        color: tokens.surface,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _HeaderCell(child: const SizedBox.shrink()),
            for (final row in rows)
              _BodyCell(
                child: Text(row.label, style: text.labelSmall?.copyWith(color: tokens.muted, letterSpacing: 0.4)),
              ),
          ],
        ),
      ),
    );
  }
}

class _DataColumn extends StatelessWidget {
  const _DataColumn({required this.column, required this.rows, required this.onNewPost});

  final ContentSheetColumn column;
  final List<_SheetRow> rows;
  final ValueChanged<DateTime> onNewPost;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final day = column.day;
    final post = column.post;
    final today = DateTime.now();
    final isToday = day != null && day.year == today.year && day.month == today.month && day.day == today.day;
    final locale = Localizations.localeOf(context).toLanguageTag();

    return SizedBox(
      width: ContentSheet._columnWidth,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _HeaderCell(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (day != null) ...[
                  Text(
                    DateFormat.E(locale).format(day).toUpperCase(),
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: isToday ? tokens.fg : tokens.muted,
                          letterSpacing: 0.5,
                        ),
                  ),
                  Row(
                    children: [
                      Expanded(child: Text(DateFormat.MMMd(locale).format(day), style: Theme.of(context).textTheme.titleSmall)),
                      if (post?.scheduledAt != null)
                        Text(
                          formats.time(post!.scheduledAt!.toLocal()),
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted),
                        ),
                    ],
                  ),
                ] else
                  Text(l10n.contentUnscheduled, style: Theme.of(context).textTheme.labelSmall),
              ],
            ),
          ),
          for (final row in rows)
            _BodyCell(
              child: post == null
                  ? row.label == l10n.contentSheetRowVisual && day != null
                      ? _EmptySlot(day: day, onTap: () => onNewPost(ContentSheet.defaultScheduleForDay(day)))
                      : const SizedBox.shrink()
                  : row.builder(post),
            ),
        ],
      ),
    );
  }
}

class _HeaderCell extends StatelessWidget {
  const _HeaderCell({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      padding: EdgeInsets.all(tokens.md),
      decoration: BoxDecoration(
        color: tokens.surface,
        border: Border(bottom: BorderSide(color: tokens.border), right: BorderSide(color: tokens.border)),
      ),
      child: child,
    );
  }
}

class _BodyCell extends StatelessWidget {
  const _BodyCell({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      alignment: Alignment.topLeft,
      padding: EdgeInsets.all(tokens.md),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: tokens.border.withValues(alpha: 0.6)), right: BorderSide(color: tokens.border)),
      ),
      child: child,
    );
  }
}

class _EmptySlot extends StatelessWidget {
  const _EmptySlot({required this.day, required this.onTap});

  final DateTime day;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    return AspectRatio(
      aspectRatio: 4 / 5,
      child: Material(
        color: tokens.subtle,
        child: InkWell(
          onTap: onTap,
          child: Container(
            decoration: BoxDecoration(border: Border.all(color: tokens.border, style: BorderStyle.solid)),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.add, color: tokens.muted),
                SizedBox(height: tokens.xs),
                Text(l10n.contentSheetNewSlot, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
