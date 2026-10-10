import 'package:flutter/material.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/content_filter.dart';
import 'content_labels.dart';

Future<ContentFilter?> showContentFilterSheet(
  BuildContext context, {
  required ContentFilter initial,
  required List<String> clientIds,
  required String Function(String clientId) clientNameOf,
  bool showClientFilter = true,
}) =>
    showModalBottomSheet<ContentFilter>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _ContentFilterSheet(
        initial: initial,
        clientIds: clientIds,
        clientNameOf: clientNameOf,
        showClientFilter: showClientFilter,
      ),
    );

class _ContentFilterSheet extends StatefulWidget {
  const _ContentFilterSheet({
    required this.initial,
    required this.clientIds,
    required this.clientNameOf,
    required this.showClientFilter,
  });

  final ContentFilter initial;
  final List<String> clientIds;
  final String Function(String clientId) clientNameOf;
  final bool showClientFilter;

  @override
  State<_ContentFilterSheet> createState() => _ContentFilterSheetState();
}

class _ContentFilterSheetState extends State<_ContentFilterSheet> {
  static const _maxWidth = 560.0;

  late ContentFilter _filter = widget.initial;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;

    return Center(
      heightFactor: 1,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: _maxWidth),
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(tokens.xl, 0, tokens.xl, tokens.xl + MediaQuery.viewInsetsOf(context).bottom),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(header: true, child: Text(l10n.contentFilters, style: text.titleLarge)),
              SizedBox(height: tokens.xs),
              Text(l10n.contentFiltersBody, style: TextStyle(color: tokens.muted)),
              SizedBox(height: tokens.lg),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(l10n.contentFilterMine),
                value: _filter.mine,
                onChanged: (value) => setState(() => _filter = _filter.copyWith(mine: value)),
              ),
              if (widget.showClientFilter && widget.clientIds.length > 1) ...[
                SizedBox(height: tokens.md),
                OptionField<String?>(
                  label: l10n.contentFilterClient,
                  value: _filter.clientId,
                  options: [null, ...widget.clientIds],
                  labelOf: (id) => id == null ? l10n.filterAll : widget.clientNameOf(id),
                  onChanged: (id) => setState(() => _filter = _filter.copyWith(clientId: id, clearClientId: id == null)),
                ),
              ],
              SizedBox(height: tokens.md),
              OptionField<String?>(
                label: l10n.contentFilterStatus,
                value: _filter.status,
                options: [null, ...ContentStatuses.values],
                labelOf: (status) => status == null ? l10n.filterAll : contentStatusLabel(l10n, status),
                onChanged: (status) => setState(() => _filter = _filter.copyWith(status: status, clearStatus: status == null)),
              ),
              SizedBox(height: tokens.md),
              OptionField<String?>(
                label: l10n.contentFilterType,
                value: _filter.type,
                options: [null, ...ContentTypes.values],
                labelOf: (type) => type == null ? l10n.filterAll : contentTypeLabel(l10n, type),
                onChanged: (type) => setState(() => _filter = _filter.copyWith(type: type, clearType: type == null)),
              ),
              SizedBox(height: tokens.md),
              OptionField<String?>(
                label: l10n.contentFilterPlatform,
                value: _filter.platform,
                options: [null, ...Platforms.values],
                labelOf: (platform) => platform == null ? l10n.filterAll : contentPlatformLabel(l10n, platform),
                onChanged: (platform) =>
                    setState(() => _filter = _filter.copyWith(platform: platform, clearPlatform: platform == null)),
              ),
              SizedBox(height: tokens.xl),
              Row(
                children: [
                  if (_filter.activeCount > 0)
                    TextButton(onPressed: () => setState(() => _filter = const ContentFilter()), child: Text(l10n.contentFiltersClear)),
                  const Spacer(),
                  FilledButton(onPressed: () => Navigator.pop(context, _filter), child: Text(l10n.save)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
