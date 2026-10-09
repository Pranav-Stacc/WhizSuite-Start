import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/theme/theme_settings.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/audit_entry.dart';
import 'audit_labels.dart';

Future<void> showAuditDetailSheet(BuildContext context, {required AuditEntry entry, required String actorName}) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.85,
        maxChildSize: 1,
        builder: (context, controller) => _AuditDetail(entry: entry, actorName: actorName, controller: controller),
      ),
    );

class _AuditDetail extends StatelessWidget {
  const _AuditDetail({required this.entry, required this.actorName, required this.controller});

  static const _maxWidth = 720.0;

  final AuditEntry entry;
  final String actorName;
  final ScrollController controller;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final changes = diffSnapshots(entry.before, entry.after);
    final metadata = entry.metadata;

    Widget mono(String? value) => value == null
        ? Text(l10n.valueUnknown)
        : Text(value, style: const TextStyle(fontFamily: 'monospace'), overflow: TextOverflow.ellipsis);

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: _maxWidth),
        child: ListView(
          controller: controller,
          padding: EdgeInsets.fromLTRB(tokens.xl, 0, tokens.xl, tokens.xl),
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Semantics(
                        header: true,
                        child: Text(auditActionLabel(l10n, entry), style: text.titleLarge),
                      ),
                      Text(
                        '${auditEntityTypeLabel(l10n, entry.entityType)} · ${formats.dateTime(entry.createdAt)}',
                        style: text.bodyMedium?.copyWith(color: tokens.muted),
                      ),
                    ],
                  ),
                ),
                StatusBadge(label: auditOutcomeLabel(l10n, entry.outcome), tone: auditOutcomeTone(entry.outcome)),
              ],
            ),
            if (entry.reason case final reason?) ...[
              SizedBox(height: tokens.md),
              _Callout(icon: Icons.error_outline, color: StatusColors.danger, text: reason),
            ],
            SizedBox(height: tokens.lg),
            SectionCard(
              title: l10n.auditSectionEvent,
              child: Column(
                children: [
                  InfoRow(label: l10n.auditAction, value: mono(entry.action)),
                  InfoRow(label: l10n.auditActor, value: Text(actorName)),
                  InfoRow(label: l10n.auditActorTypeLabel, value: Text(l10n.auditActorType(entry.actorType))),
                  if (entry.actorId case final actorId?)
                    InfoRow(label: l10n.auditActorId, value: _CopyValue(value: actorId)),
                  InfoRow(label: l10n.auditEntity, value: Text(entry.entityLabel ?? auditEntityTypeLabel(l10n, entry.entityType))),
                  if (entry.entityId case final entityId?)
                    InfoRow(label: l10n.auditEntityId, value: _CopyValue(value: entityId)),
                  InfoRow(label: l10n.auditWhen, value: Text(formats.relative(entry.createdAt))),
                ],
              ),
            ),
            SizedBox(height: tokens.lg),
            SectionCard(
              title: l10n.auditSectionRequest,
              child: Column(
                children: [
                  InfoRow(label: l10n.auditIp, value: mono(entry.ipAddress)),
                  InfoRow(
                    label: l10n.auditUserAgent,
                    value: Text(entry.userAgent ?? l10n.valueUnknown, maxLines: 3, overflow: TextOverflow.ellipsis),
                  ),
                  InfoRow(
                    label: l10n.auditCorrelation,
                    value: entry.correlationId == null ? Text(l10n.valueUnknown) : _CopyValue(value: entry.correlationId ?? ''),
                  ),
                ],
              ),
            ),
            SizedBox(height: tokens.lg),
            SectionCard(
              title: l10n.auditSectionChanges,
              trailing: changes.isEmpty
                  ? null
                  : Text(
                      l10n.auditChangedFields(changes.where((c) => c.kind != AuditChangeKind.unchanged).length),
                      style: text.labelSmall?.copyWith(color: tokens.muted),
                    ),
              child: changes.isEmpty
                  ? Text(l10n.auditNoChanges, style: text.bodyMedium?.copyWith(color: tokens.muted))
                  : _ChangeList(changes: changes),
            ),
            if (metadata != null && metadata.isNotEmpty) ...[
              SizedBox(height: tokens.lg),
              SectionCard(title: l10n.auditSectionMetadata, child: _JsonBlock(value: metadata)),
            ],
          ],
        ),
      ),
    );
  }
}

/// Changed fields first; unchanged fields stay folded until asked for.
class _ChangeList extends StatefulWidget {
  const _ChangeList({required this.changes});

  final List<AuditChange> changes;

  @override
  State<_ChangeList> createState() => _ChangeListState();
}

class _ChangeListState extends State<_ChangeList> {
  bool _showUnchanged = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final changed = widget.changes.where((c) => c.kind != AuditChangeKind.unchanged).toList();
    final unchanged = widget.changes.where((c) => c.kind == AuditChangeKind.unchanged).toList();
    final shown = [...changed, if (_showUnchanged || changed.isEmpty) ...unchanged];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, change) in shown.indexed) ...[
          if (i > 0) Divider(height: tokens.lg, color: tokens.border),
          _ChangeView(change: change),
        ],
        if (changed.isNotEmpty && unchanged.isNotEmpty)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(
              onPressed: () => setState(() => _showUnchanged = !_showUnchanged),
              icon: Icon(_showUnchanged ? Icons.unfold_less : Icons.unfold_more),
              label: Text(
                _showUnchanged ? l10n.auditHideUnchanged : l10n.auditShowUnchanged(unchanged.length),
              ),
            ),
          ),
      ],
    );
  }
}

/// One field of the before/after diff, tinted by the kind of change.
class _ChangeView extends StatelessWidget {
  const _ChangeView({required this.change});

  final AuditChange change;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final (tone, color) = switch (change.kind) {
      AuditChangeKind.added => (StatusTone.success, StatusColors.success),
      AuditChangeKind.removed => (StatusTone.danger, StatusColors.danger),
      AuditChangeKind.changed => (StatusTone.warning, StatusColors.warning),
      AuditChangeKind.unchanged => (StatusTone.neutral, tokens.border),
    };
    final showBefore = change.kind == AuditChangeKind.removed || change.kind == AuditChangeKind.changed;
    final showAfter = change.kind != AuditChangeKind.removed;

    return DecoratedBox(
      decoration: BoxDecoration(border: BorderDirectional(start: BorderSide(color: color, width: 3))),
      child: Padding(
        padding: EdgeInsetsDirectional.only(start: tokens.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    change.field,
                    style: text.labelLarge?.copyWith(
                      fontFamily: 'monospace',
                      color: change.kind == AuditChangeKind.unchanged ? tokens.muted : tokens.fg,
                    ),
                  ),
                ),
                StatusBadge(label: l10n.auditChangeKind(change.kind.name), tone: tone, dense: true),
              ],
            ),
            if (showBefore) ...[
              SizedBox(height: tokens.sm),
              _JsonBlock(value: change.before, label: l10n.auditBefore, tint: StatusColors.danger, strike: true),
            ],
            if (showAfter) ...[
              SizedBox(height: tokens.sm),
              _JsonBlock(
                value: change.after,
                label: change.kind == AuditChangeKind.unchanged ? null : l10n.auditAfter,
                tint: change.kind == AuditChangeKind.unchanged ? null : StatusColors.success,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _JsonBlock extends StatelessWidget {
  const _JsonBlock({required this.value, this.label, this.tint, this.strike = false});

  static const _tintAlpha = 0.08;

  final Object? value;
  final String? label;
  final Color? tint;
  final bool strike;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final accent = tint;
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(tokens.sm),
      decoration: BoxDecoration(
        color: accent == null ? tokens.subtle : accent.withValues(alpha: _tintAlpha),
        borderRadius: tokens.borderRadius,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (label case final caption?)
            Text(caption.toUpperCase(), style: text.labelSmall?.copyWith(color: tokens.muted, letterSpacing: 0.6)),
          SelectableText(
            prettyJson(value),
            style: text.bodySmall?.copyWith(
              fontFamily: 'monospace',
              color: strike ? tokens.secondary : tokens.fg,
              decoration: strike ? TextDecoration.lineThrough : null,
              decorationColor: tokens.muted,
            ),
          ),
        ],
      ),
    );
  }
}

class _CopyValue extends StatelessWidget {
  const _CopyValue({required this.value});

  final String value;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Flexible(
          child: Text(value, style: const TextStyle(fontFamily: 'monospace'), overflow: TextOverflow.ellipsis),
        ),
        IconButton(
          tooltip: l10n.auditCopy,
          visualDensity: VisualDensity.compact,
          iconSize: 16,
          icon: const Icon(Icons.copy_outlined),
          onPressed: () async {
            await Clipboard.setData(ClipboardData(text: value));
            if (context.mounted) showToast(context, l10n.auditCopied);
          },
        ),
      ],
    );
  }
}

class _Callout extends StatelessWidget {
  const _Callout({required this.icon, required this.color, required this.text});

  final IconData icon;
  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      padding: EdgeInsets.all(tokens.md),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        border: Border.all(color: color.withValues(alpha: 0.4)),
        borderRadius: tokens.borderRadius,
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: color),
          SizedBox(width: tokens.sm),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}
