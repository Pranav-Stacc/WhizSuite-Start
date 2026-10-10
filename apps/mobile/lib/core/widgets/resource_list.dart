import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../l10n/app_localizations.dart';
import '../theme/app_tokens.dart';
import 'skeleton.dart';
import 'state_views.dart';
import 'surfaces.dart';

/// Search box with a clear button.
class SearchField extends StatefulWidget {
  const SearchField({required this.onChanged, this.hint, super.key});

  final ValueChanged<String> onChanged;
  final String? hint;

  @override
  State<SearchField> createState() => _SearchFieldState();
}

class _SearchFieldState extends State<SearchField> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return TextField(
      controller: _controller,
      onChanged: (value) {
        setState(() {});
        widget.onChanged(value);
      },
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        hintText: widget.hint ?? l10n.searchHint,
        prefixIcon: const Icon(Icons.search),
        isDense: true,
        suffixIcon: _controller.text.isEmpty
            ? null
            : IconButton(
                tooltip: l10n.valueClear,
                icon: const Icon(Icons.close),
                onPressed: () {
                  _controller.clear();
                  setState(() {});
                  widget.onChanged('');
                },
              ),
      ),
    );
  }
}

/// Horizontally scrolling single-select filter chips with an "All" option.
class FilterBar<T> extends StatelessWidget {
  const FilterBar({
    required this.options,
    required this.selected,
    required this.labelOf,
    required this.onSelected,
    this.countOf,
    super.key,
  });

  final List<T> options;
  final T? selected;
  final String Function(T value) labelOf;
  final ValueChanged<T?> onSelected;

  /// Optional count shown after each label.
  final int Function(T? value)? countOf;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    String label(String text, T? value) => countOf == null ? text : '$text · ${countOf!(value)}';
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          ChoiceChip(
            label: Text(label(l10n.filterAll, null)),
            selected: selected == null,
            onSelected: (_) => onSelected(null),
          ),
          for (final option in options) ...[
            SizedBox(width: tokens.sm),
            ChoiceChip(
              label: Text(label(labelOf(option), option)),
              selected: selected == option,
              onSelected: (_) => onSelected(option),
            ),
          ],
        ],
      ),
    );
  }
}

/// Searchable, filterable, pull-to-refresh list (or responsive grid) of resources
/// with skeleton, empty, no-match and error states.
class ResourceList<T> extends StatefulWidget {
  const ResourceList({
    required this.value,
    required this.itemBuilder,
    required this.onRefresh,
    required this.empty,
    this.matches,
    this.filter,
    this.header,
    this.searchHint,
    this.searchTrailing,
    this.minTileWidth,
    this.tileHeight = 176,
    this.itemSpacing,
    this.sort,
    super.key,
  });

  final AsyncValue<List<T>> value;
  final Widget Function(BuildContext context, T item) itemBuilder;
  final Future<void> Function() onRefresh;

  /// Shown when there are no items at all.
  final Widget empty;

  /// Enables the search box; returns whether [item] matches the lowercased query.
  final bool Function(T item, String query)? matches;

  /// Extra predicate from the page (filter chips); applied after search.
  final bool Function(T item)? filter;

  /// Widget under the search box (filter chips, summary).
  final Widget? header;
  final String? searchHint;

  /// Widget shown to the right of the search field (e.g. a filter button).
  final Widget? searchTrailing;

  /// Lays items out in a grid with tiles at least this wide.
  final double? minTileWidth;

  /// Fixed tile height in grid mode.
  final double tileHeight;

  /// Vertical gap between list items when not in grid mode. Defaults to [AppTokens.md].
  final double? itemSpacing;

  final int Function(T a, T b)? sort;

  @override
  State<ResourceList<T>> createState() => _ResourceListState<T>();
}

class _ResourceListState<T> extends State<ResourceList<T>> {
  String _query = '';

  bool get _hasChrome => widget.matches != null || widget.header != null;

  List<T> _visible(List<T> items) {
    final query = _query.trim().toLowerCase();
    final result = items
        .where((item) => query.isEmpty || (widget.matches?.call(item, query) ?? true))
        .where((item) => widget.filter?.call(item) ?? true)
        .toList();
    if (widget.sort != null) result.sort(widget.sort!);
    return result;
  }

  Widget _searchRow() {
    if (widget.matches == null) return const SizedBox.shrink();
    if (widget.searchTrailing == null) {
      return SearchField(hint: widget.searchHint, onChanged: (q) => setState(() => _query = q));
    }
    return Row(
      children: [
        Expanded(child: SearchField(hint: widget.searchHint, onChanged: (q) => setState(() => _query = q))),
        SizedBox(width: context.tokens.sm),
        widget.searchTrailing!,
      ],
    );
  }

  Widget? _chromeSliverChild() {
    if (!_hasChrome) return null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.matches != null) _searchRow(),
        if (widget.matches != null && widget.header != null) SizedBox(height: context.tokens.md),
        if (widget.header != null) widget.header!,
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final value = widget.value;
    final items = value.value;

    if (items == null) {
      if (value.hasError) return ErrorState(error: value.error!, onRetry: widget.onRefresh);
      return const SkeletonList();
    }

    if (items.isEmpty && !_hasChrome) {
      return RefreshIndicator(
        onRefresh: widget.onRefresh,
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: SizedBox(height: constraints.maxHeight, child: widget.empty),
          ),
        ),
      );
    }

    final visible = _visible(items);
    final padding = EdgeInsets.symmetric(horizontal: tokens.lg);
    final chrome = _chromeSliverChild();

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final columns = widget.minTileWidth == null
              ? 1
              : gridColumns(constraints.maxWidth - tokens.lg * 2, minTileWidth: widget.minTileWidth!);
          final slivers = <Widget>[
            if (chrome != null)
              SliverPadding(
                padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.sm),
                sliver: SliverToBoxAdapter(child: chrome),
              ),
            if (items.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: widget.empty),
              )
            else if (visible.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: StatusMessage(
                    icon: Icons.search_off,
                    title: l10n.searchNoMatches,
                    body: l10n.searchNoMatchesBody,
                    animate: false,
                  ),
                ),
              )
            else if (columns == 1)
              SliverPadding(
                padding: padding.copyWith(top: tokens.sm, bottom: tokens.xxl * 2),
                sliver: SliverList.separated(
                  itemCount: visible.length,
                  separatorBuilder: (_, _) => SizedBox(height: widget.itemSpacing ?? tokens.md),
                  itemBuilder: (context, index) => widget.itemBuilder(context, visible[index]),
                ),
              )
            else
              SliverPadding(
                padding: padding.copyWith(top: tokens.sm, bottom: tokens.xxl * 2),
                sliver: SliverGrid.builder(
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: columns,
                    mainAxisSpacing: tokens.md,
                    crossAxisSpacing: tokens.md,
                    mainAxisExtent: widget.tileHeight,
                  ),
                  itemCount: visible.length,
                  itemBuilder: (context, index) => widget.itemBuilder(context, visible[index]),
                ),
              ),
          ];

          return CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: slivers,
          );
        },
      ),
    );
  }
}
