import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/knowledge/domain/article.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('parseArticleBody', () {
    test('splits paragraphs on blank lines and lists on multi-line blocks', () {
      final blocks = parseArticleBody('Intro line\r\n\r\n- First\n* Second\n3. Third\n\n\n  Outro  ');
      expect(blocks, hasLength(3));
      expect((blocks[0] as ArticleParagraph).text, 'Intro line');
      expect((blocks[1] as ArticleList).items, ['First', 'Second', 'Third']);
      expect((blocks[2] as ArticleParagraph).text, 'Outro');
    });

    test('empty body has no blocks', () {
      expect(parseArticleBody('  \n\n '), isEmpty);
    });
  });

  test('reading time rounds to whole minutes with a one-minute floor', () {
    expect(articleReadingMinutes('short'), 1);
    expect(articleReadingMinutes(List.filled(articleWordsPerMinute * 3, 'word').join(' ')), 3);
  });

  test('excerpt flattens whitespace and truncates with an ellipsis', () {
    expect(articleExcerpt('a\n\n  b'), 'a b');
    final excerpt = articleExcerpt('x' * (articleExcerptLength + 10));
    expect(excerpt, endsWith('…'));
    expect(excerpt.length, articleExcerptLength + 1);
  });

  test('unknown category falls back to the first one', () {
    final article = Article.fromJson({
      'id': 'a',
      'title': 'T',
      'category': 'nope',
      'body': 'B',
      'createdAt': '2026-01-01T00:00:00.000Z',
    });
    expect(article.category, ArticleCategories.values.first);
    expect(article.version, 1);
  });
}
