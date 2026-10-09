import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// Reading speed used for the "N min read" estimate (same as the web).
const articleWordsPerMinute = 200;

/// Characters shown in a card excerpt (same as the web).
const articleExcerptLength = 130;

/// An internal knowledge-base article (SOP, playbook, policy…).
class Article {
  const Article({
    required this.id,
    required this.title,
    required this.category,
    required this.body,
    required this.createdAt,
    required this.updatedAt,
    this.authorId,
    this.version = 1,
  });

  factory Article.fromJson(Json json) {
    final createdAt = json.date('createdAt') ?? DateTime.now();
    final category = json.str('category');
    return Article(
      id: json.str('id'),
      title: json.str('title'),
      category: ArticleCategories.values.contains(category) ? category : ArticleCategories.values.first,
      body: json.str('body'),
      authorId: json.strOrNull('authorId'),
      version: json.integer('version', 1),
      createdAt: createdAt,
      updatedAt: json.date('updatedAt') ?? createdAt,
    );
  }

  final String id;
  final String title;
  final String category;
  final String body;
  final String? authorId;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;

  String get excerpt => articleExcerpt(body);

  int get readingMinutes => articleReadingMinutes(body);
}

/// Fields the article editor writes.
class ArticleInput {
  const ArticleInput({required this.title, required this.category, required this.body});

  final String title;
  final String category;
  final String body;

  Json toJson() => {'title': title, 'category': category, 'body': body};
}

sealed class ArticleBlock {
  const ArticleBlock();
}

class ArticleParagraph extends ArticleBlock {
  const ArticleParagraph(this.text);

  final String text;
}

class ArticleList extends ArticleBlock {
  const ArticleList(this.items);

  final List<String> items;
}

final _blockSeparator = RegExp(r'\n\s*\n');
final _bulletMarker = RegExp(r'^([-*•]|\d+[.)])\s+');

/// Blank lines separate blocks; a block with several lines renders as a checklist (web parity).
/// Leading bullet markers (`-`, `*`, `•`, `1.`) are dropped from list items.
List<ArticleBlock> parseArticleBody(String body) {
  final blocks = <ArticleBlock>[];
  for (final block in body.replaceAll('\r\n', '\n').split(_blockSeparator)) {
    final lines = block.split('\n').map((l) => l.trim()).where((l) => l.isNotEmpty).toList();
    if (lines.isEmpty) continue;
    blocks.add(
      lines.length == 1
          ? ArticleParagraph(lines.first)
          : ArticleList([for (final line in lines) line.replaceFirst(_bulletMarker, '')]),
    );
  }
  return blocks;
}

int articleReadingMinutes(String body) {
  final words = body.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
  final minutes = (words / articleWordsPerMinute).round();
  return minutes < 1 ? 1 : minutes;
}

String articleExcerpt(String body) {
  final flat = body.replaceAll(RegExp(r'\s+'), ' ').trim();
  return flat.length <= articleExcerptLength ? flat : '${flat.substring(0, articleExcerptLength).trimRight()}…';
}
