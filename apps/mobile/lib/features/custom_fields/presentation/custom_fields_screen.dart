import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/custom_fields_controller.dart';
import '../domain/custom_field.dart';
import 'custom_field_forms.dart';
import 'custom_field_labels.dart';
import 'custom_field_row.dart';

class CustomFieldsScreen extends ConsumerStatefulWidget {
  const CustomFieldsScreen({super.key});

  @override
  ConsumerState<CustomFieldsScreen> createState() => _CustomFieldsScreenState();
}

class _CustomFieldsScreenState extends ConsumerState<CustomFieldsScreen> {
  String? _entity;
  String _query = '';

  Future<void> _create([String? entityType]) async {
    final l10n = AppLocalizations.of(context);
    final created = await showCustomFieldForm(context, ref, entityType: entityType ?? _entity);
    if (created && mounted) showToast(context, l10n.createdToast);
  }

  Future<void> _edit(CustomField field) async {
    final l10n = AppLocalizations.of(context);
    final saved = await showCustomFieldForm(context, ref, field: field);
    if (saved && mounted) showToast(context, l10n.savedToast);
  }

  bool _matches(CustomField field) {
    final query = _query.trim().toLowerCase();
    if (query.isEmpty) return true;
    return field.label.toLowerCase().contains(query) ||
        field.key.contains(query) ||
        field.options.any((o) => o.toLowerCase().contains(query));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final fields = ref.watch(customFieldsProvider);
    final items = fields.value;
    Future<void> refresh() => ref.refresh(customFieldsProvider.future);
    final createButton = PermissionGate(
      anyOf: const [Permissions.orgSettingsManage],
      child: CreateFab(label: l10n.customFieldNew, onPressed: _create),
    );

    final Widget body;
    if (items == null) {
      body = fields.hasError
          ? ErrorState(error: fields.error ?? l10n.errorUnknown, onRetry: refresh)
          : const SkeletonList();
    } else if (items.isEmpty) {
      body = RefreshIndicator(
        onRefresh: refresh,
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: SizedBox(
              height: constraints.maxHeight,
              child: EmptyState(
                icon: Icons.tune_outlined,
                title: l10n.customFieldsEmpty,
                body: l10n.customFieldsEmptyBody,
                action: PermissionGate(
                  anyOf: const [Permissions.orgSettingsManage],
                  child: FilledButton.icon(onPressed: _create, icon: const Icon(Icons.add), label: Text(l10n.customFieldNew)),
                ),
              ),
            ),
          ),
        ),
      );
    } else {
      body = _GroupedList(
        all: items,
        groups: groupCustomFields(items.where((f) => (_entity == null || f.entityType == _entity) && _matches(f))),
        entity: _entity,
        onRefresh: refresh,
        onSearch: (query) => setState(() => _query = query),
        onEntity: (entity) => setState(() => _entity = entity),
        onAdd: _create,
        onEdit: _edit,
      );
    }

    return PageScaffold(title: l10n.customFieldsTitle, floatingActionButton: createButton, body: body);
  }
}

class _GroupedList extends ConsumerWidget {
  const _GroupedList({
    required this.all,
    required this.groups,
    required this.entity,
    required this.onRefresh,
    required this.onSearch,
    required this.onEntity,
    required this.onAdd,
    required this.onEdit,
  });

  final List<CustomField> all;
  final Map<String, List<CustomField>> groups;
  final String? entity;
  final Future<void> Function() onRefresh;
  final ValueChanged<String> onSearch;
  final ValueChanged<String?> onEntity;
  final ValueChanged<String> onAdd;
  final ValueChanged<CustomField> onEdit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final canEdit = ref.watch(accessPolicyProvider.select((p) => p.canAny(const [Permissions.orgSettingsManage])));

    Widget readable(Widget child) => Center(
          child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: ReadableBody.maxWidth), child: child),
        );

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.sm),
            sliver: SliverToBoxAdapter(
              child: readable(
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final required = all.where((f) => f.isRequired).length;
                        final clientVisible = all.where((f) => f.clientVisible).length;
                        final tiles = [
                          MetricTile(
                            label: l10n.customFieldStatTotal,
                            icon: Icons.tune_outlined,
                            value: '${all.length}',
                          ),
                          MetricTile(
                            label: l10n.customFieldStatRequired,
                            icon: Icons.star_outline,
                            value: '$required',
                          ),
                          MetricTile(
                            label: l10n.customFieldStatClientVisible,
                            icon: Icons.visibility_outlined,
                            value: '$clientVisible',
                          ),
                        ];
                        final columns = gridColumns(constraints.maxWidth, minTileWidth: 140, max: tiles.length);
                        final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
                        return Wrap(
                          spacing: tokens.md,
                          runSpacing: tokens.md,
                          children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
                        );
                      },
                    ),
                    SizedBox(height: tokens.md),
                    SearchField(hint: l10n.customFieldsSearch, onChanged: onSearch),
                    SizedBox(height: tokens.md),
                    FilterBar<String>(
                      options: CustomFieldEntityTypes.values,
                      selected: entity,
                      labelOf: (value) => customFieldEntityLabel(l10n, value),
                      countOf: (value) => value == null ? all.length : all.where((f) => f.entityType == value).length,
                      onSelected: onEntity,
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (groups.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: EmptyState(icon: Icons.search_off, title: l10n.searchNoMatches, body: l10n.searchNoMatchesBody),
            )
          else
            SliverPadding(
              padding: EdgeInsets.fromLTRB(tokens.lg, tokens.sm, tokens.lg, tokens.xxl * 2),
              sliver: SliverList.separated(
                itemCount: groups.length,
                separatorBuilder: (_, _) => SizedBox(height: tokens.xl),
                itemBuilder: (context, index) {
                  final MapEntry(key: entityType, value: fields) = groups.entries.elementAt(index);
                  return FadeSlideIn(
                    index: index,
                    child: readable(
                      SectionCard(
                        title: l10n.customFieldGroupTitle(customFieldEntityLabel(l10n, entityType), fields.length),
                        trailing: canEdit
                            ? IconButton(
                                tooltip: l10n.customFieldAddTo(customFieldEntityLabel(l10n, entityType)),
                                visualDensity: VisualDensity.compact,
                                icon: const Icon(Icons.add, size: 20),
                                onPressed: () => onAdd(entityType),
                              )
                            : null,
                        child: Column(
                          children: [
                            for (final (i, field) in fields.indexed) ...[
                              if (i > 0) Divider(height: tokens.lg),
                              CustomFieldRow(field: field, onTap: canEdit ? () => onEdit(field) : null),
                            ],
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
