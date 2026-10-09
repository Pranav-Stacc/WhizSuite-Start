import 'package:flutter/material.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/article.dart';
import 'article_labels.dart';

class ArticleCard extends StatelessWidget {
  const ArticleCard({required this.article, required this.onTap, this.authorName, super.key});

  static const _excerptLineHeight = 1.5;

  final Article article;
  final String? authorName;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final when = context.formats.relative(article.updatedAt);
    final author = authorName;
    return SurfaceCard(
      onTap: onTap,
      semanticLabel: '${article.title}, ${articleCategoryLabel(l10n, article.category)}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                articleCategoryIcon(article.category),
                size: 16,
                color: articleCategoryTone(article.category).color(tokens),
              ),
              SizedBox(width: tokens.xs + 2),
              StatusBadge(
                label: articleCategoryLabel(l10n, article.category),
                tone: articleCategoryTone(article.category),
                dense: true,
              ),
              const Spacer(),
              Icon(Icons.schedule, size: 14, color: tokens.muted),
              SizedBox(width: tokens.xs),
              Text(
                l10n.knowledgeReadTime(article.readingMinutes),
                style: text.labelSmall?.copyWith(color: tokens.muted),
              ),
            ],
          ),
          SizedBox(height: tokens.md),
          Text(article.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: text.titleMedium),
          SizedBox(height: tokens.xs),
          Text(
            article.excerpt,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: text.bodySmall?.copyWith(color: tokens.muted, height: _excerptLineHeight),
          ),
          SizedBox(height: tokens.md),
          if (author != null)
            Row(
              children: [
                InitialsAvatar(name: author, seed: article.authorId, size: 22),
                SizedBox(width: tokens.sm),
                Expanded(
                  child: Text(
                    l10n.knowledgeByAuthor(author, when),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: text.bodySmall?.copyWith(color: tokens.secondary),
                  ),
                ),
              ],
            )
          else
            Text(when, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.labelSmall?.copyWith(color: tokens.muted)),
        ],
      ),
    );
  }
}
