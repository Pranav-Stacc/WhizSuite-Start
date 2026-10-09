import 'package:flutter/material.dart';

import '../../../core/theme/app_tokens.dart';
import '../domain/article.dart';

/// Renders an article body for reading: generous line height, paragraphs and checklists.
class ArticleBodyView extends StatelessWidget {
  const ArticleBodyView({required this.body, super.key});

  static const _lineHeight = 1.7;

  final String body;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final style = Theme.of(context).textTheme.bodyLarge?.copyWith(height: _lineHeight, color: tokens.fg);
    final blocks = parseArticleBody(body);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, block) in blocks.indexed) ...[
          if (i > 0) SizedBox(height: tokens.lg),
          switch (block) {
            ArticleParagraph(:final text) => SelectableText(text, style: style),
            ArticleList(:final items) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final item in items)
                    Padding(
                      padding: EdgeInsets.only(bottom: tokens.sm),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: EdgeInsets.only(top: tokens.xs),
                            child: Icon(Icons.check_circle_outline, size: 18, color: tokens.primary),
                          ),
                          SizedBox(width: tokens.md),
                          Expanded(child: SelectableText(item, style: style)),
                        ],
                      ),
                    ),
                ],
              ),
          },
        ],
      ],
    );
  }
}
