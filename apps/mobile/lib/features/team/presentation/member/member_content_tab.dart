import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/contracts/contracts.g.dart';
import '../../../../core/theme/app_tokens.dart';
import '../../../../core/widgets/resource_list.dart';
import '../../../../core/widgets/state_views.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../content/application/content_controller.dart';
import '../../../content/content_routes.dart';
import '../../../content/domain/content.dart';
import '../../../content/presentation/content_labels.dart' show contentStatusLabel;
import '../../domain/member.dart';

class MemberContentTab extends ConsumerStatefulWidget {
  const MemberContentTab({required this.member, super.key});

  final Member member;

  @override
  ConsumerState<MemberContentTab> createState() => _MemberContentTabState();
}

class _MemberContentTabState extends ConsumerState<MemberContentTab> {
  String? _status;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final content = ref.watch(contentListProvider);
    final statuses = ContentStatuses.values;

    return ResourceList<Content>(
      value: content,
      onRefresh: () => ref.refresh(contentListProvider.future),
      minTileWidth: 400,
      tileHeight: 88,
      searchHint: l10n.contentSearch,
      matches: (item, query) =>
          item.title.toLowerCase().contains(query) || item.caption.toLowerCase().contains(query),
      filter: (item) =>
          item.authorId == widget.member.userId && (_status == null || item.status == _status),
      header: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FilterBar<String>(
            options: statuses,
            selected: _status,
            labelOf: (s) => contentStatusLabel(l10n, s),
            countOf: (s) => (content.value ?? const <Content>[])
                .where((c) => c.authorId == widget.member.userId && (s == null || c.status == s))
                .length,
            onSelected: (s) => setState(() => _status = s),
          ),
          SizedBox(height: tokens.sm),
        ],
      ),
      empty: EmptyState(icon: Icons.article_outlined, title: l10n.memberContentEmpty),
      itemBuilder: (context, item) => ListTile(
        contentPadding: EdgeInsets.symmetric(horizontal: tokens.lg),
        title: Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text(contentStatusLabel(l10n, item.status)),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push(ContentRoutes.detail(item.id)),
      ),
    );
  }
}
