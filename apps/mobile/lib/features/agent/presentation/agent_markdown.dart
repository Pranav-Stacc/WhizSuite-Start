import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_tokens.dart';

/// Safe Markdown subset for agent replies: headings, lists, tables, quotes, code, rules,
/// and inline bold / italic / code / links. Partial (streaming) input renders gracefully.
class AgentMarkdown extends StatelessWidget {
  const AgentMarkdown(this.source, {super.key});

  final String source;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final blocks = parseAgentMarkdown(source);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < blocks.length; i++) ...[
          if (i > 0) SizedBox(height: tokens.sm),
          _BlockView(blocks[i]),
        ],
      ],
    );
  }
}

sealed class MdBlock {
  const MdBlock();
}

class MdHeading extends MdBlock {
  const MdHeading(this.level, this.text);
  final int level;
  final String text;
}

class MdList extends MdBlock {
  const MdList({required this.ordered, required this.start, required this.items});
  final bool ordered;
  final int start;
  final List<String> items;
}

class MdCode extends MdBlock {
  const MdCode(this.text);
  final String text;
}

class MdQuote extends MdBlock {
  const MdQuote(this.lines);
  final List<String> lines;
}

class MdTable extends MdBlock {
  const MdTable(this.header, this.rows);
  final List<String> header;
  final List<List<String>> rows;
}

class MdRule extends MdBlock {
  const MdRule();
}

class MdParagraph extends MdBlock {
  const MdParagraph(this.lines);
  final List<String> lines;
}

final _heading = RegExp(r'^(#{1,6})\s+(.+)$');
final _bullet = RegExp(r'^\s*[-*+•]\s+(.*)$');
final _ordered = RegExp(r'^\s*(\d+)[.)]\s+(.*)$');
final _quote = RegExp(r'^>\s?(.*)$');
final _rule = RegExp(r'^\s*(-{3,}|\*{3,}|_{3,})\s*$');
final _tableRow = RegExp(r'^\s*\|.*\|\s*$');
final _tableDivider = RegExp(r'^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$');
final _blockStart = RegExp(r'^(#{1,6}\s+|\s*[-*+•]\s+|\s*\d+[.)]\s+|>|```|\s*\|)');

List<String> _splitRow(String line) {
  var row = line.trim();
  if (row.startsWith('|')) row = row.substring(1);
  if (row.endsWith('|')) row = row.substring(0, row.length - 1);
  return row.split('|').map((cell) => cell.trim()).toList();
}

List<MdBlock> parseAgentMarkdown(String source) {
  final lines = source.replaceAll('\r\n', '\n').split('\n');
  final blocks = <MdBlock>[];
  String at(int idx) => idx < lines.length ? lines[idx] : '';
  var i = 0;

  while (i < lines.length) {
    final line = at(i);
    if (line.trim().isEmpty) {
      i++;
      continue;
    }
    if (line.trimLeft().startsWith('```')) {
      final buf = <String>[];
      i++;
      while (i < lines.length && !at(i).trimLeft().startsWith('```')) {
        buf.add(at(i));
        i++;
      }
      i++;
      blocks.add(MdCode(buf.join('\n')));
      continue;
    }
    if (_rule.hasMatch(line)) {
      blocks.add(const MdRule());
      i++;
      continue;
    }
    final heading = _heading.firstMatch(line);
    if (heading != null) {
      blocks.add(MdHeading(heading.group(1)!.length, heading.group(2)!));
      i++;
      continue;
    }
    if (_tableRow.hasMatch(line) && _tableDivider.hasMatch(at(i + 1))) {
      final header = _splitRow(line);
      final rows = <List<String>>[];
      i += 2;
      while (i < lines.length && _tableRow.hasMatch(at(i))) {
        rows.add(_splitRow(at(i)));
        i++;
      }
      blocks.add(MdTable(header, rows));
      continue;
    }
    if (_quote.hasMatch(line)) {
      final quoted = <String>[];
      while (i < lines.length && _quote.hasMatch(at(i))) {
        quoted.add(_quote.firstMatch(at(i))!.group(1) ?? '');
        i++;
      }
      blocks.add(MdQuote(quoted));
      continue;
    }
    final ordered = _ordered.firstMatch(line);
    if (ordered != null || _bullet.hasMatch(line)) {
      final pattern = ordered != null ? _ordered : _bullet;
      final items = <String>[];
      while (i < lines.length) {
        final current = at(i);
        final match = pattern.firstMatch(current);
        if (match != null) {
          items.add(match.group(ordered != null ? 2 : 1) ?? '');
          i++;
        } else if (current.trim().isNotEmpty && current.startsWith('  ') && items.isNotEmpty) {
          items[items.length - 1] = '${items.last} ${current.trim()}';
          i++;
        } else {
          break;
        }
      }
      blocks.add(MdList(
        ordered: ordered != null,
        start: ordered != null ? int.tryParse(ordered.group(1)!) ?? 1 : 1,
        items: items,
      ));
      continue;
    }
    final para = <String>[line];
    i++;
    while (i < lines.length &&
        at(i).trim().isNotEmpty &&
        !_blockStart.hasMatch(at(i)) &&
        !_rule.hasMatch(at(i))) {
      para.add(at(i));
      i++;
    }
    blocks.add(MdParagraph(para));
  }
  return blocks;
}

class _BlockView extends StatelessWidget {
  const _BlockView(this.block);

  final MdBlock block;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final body = text.bodyMedium;

    return switch (block) {
      MdHeading(:final level, text: final value) => _InlineText(
          value,
          style: (level <= 1 ? text.titleMedium : text.titleSmall)?.copyWith(fontWeight: FontWeight.w700),
        ),
      MdList(:final ordered, :final start, :final items) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var j = 0; j < items.length; j++)
              Padding(
                padding: EdgeInsets.only(bottom: tokens.xs),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: ordered ? 24 : 16,
                      child: Text(
                        ordered ? '${start + j}.' : '•',
                        style: body?.copyWith(color: tokens.muted),
                      ),
                    ),
                    Expanded(child: _InlineText(items[j], style: body)),
                  ],
                ),
              ),
          ],
        ),
      MdCode(text: final value) => Container(
          width: double.infinity,
          padding: EdgeInsets.all(tokens.sm),
          decoration: BoxDecoration(
            color: tokens.subtle,
            borderRadius: BorderRadius.circular(tokens.radius),
            border: Border.all(color: tokens.border),
          ),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SelectableText(value, style: body?.copyWith(fontFamily: 'monospace', fontSize: 12)),
          ),
        ),
      MdQuote(:final lines) => Container(
          padding: EdgeInsets.only(left: tokens.sm),
          decoration: BoxDecoration(
            border: Border(left: BorderSide(color: tokens.primary.withValues(alpha: 0.5), width: 2)),
          ),
          child: _InlineText(lines.join('\n'), style: body?.copyWith(color: tokens.muted)),
        ),
      MdTable(:final header, :final rows) => SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Table(
            defaultColumnWidth: const IntrinsicColumnWidth(),
            border: TableBorder.all(color: tokens.border, borderRadius: BorderRadius.circular(tokens.radius)),
            children: [
              TableRow(
                decoration: BoxDecoration(color: tokens.subtle),
                children: [
                  for (final cell in header)
                    _cell(context, cell, body?.copyWith(fontWeight: FontWeight.w600)),
                ],
              ),
              for (final row in rows)
                TableRow(
                  children: [
                    for (var c = 0; c < header.length; c++)
                      _cell(context, c < row.length ? row[c] : '', body),
                  ],
                ),
            ],
          ),
        ),
      MdRule() => Divider(height: tokens.sm, color: tokens.border),
      MdParagraph(:final lines) => _InlineText(lines.join('\n'), style: body),
    };
  }

  Widget _cell(BuildContext context, String value, TextStyle? style) => Padding(
        padding: EdgeInsets.symmetric(horizontal: context.tokens.sm, vertical: context.tokens.xs),
        child: _InlineText(value, style: style),
      );
}

final _inline = RegExp(r'(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)');
final _link = RegExp(r'^\[([^\]]+)\]\(([^)\s]+)\)$');
final _safeHref = RegExp(r'^(https?://|mailto:)', caseSensitive: false);

class _InlineText extends StatefulWidget {
  const _InlineText(this.text, {this.style});

  final String text;
  final TextStyle? style;

  @override
  State<_InlineText> createState() => _InlineTextState();
}

class _InlineTextState extends State<_InlineText> {
  final _recognizers = <TapGestureRecognizer>[];

  @override
  void dispose() {
    _disposeRecognizers();
    super.dispose();
  }

  void _disposeRecognizers() {
    for (final recognizer in _recognizers) {
      recognizer.dispose();
    }
    _recognizers.clear();
  }

  List<InlineSpan> _spans(BuildContext context) {
    _disposeRecognizers();
    final tokens = context.tokens;
    final spans = <InlineSpan>[];
    var cursor = 0;
    for (final match in _inline.allMatches(widget.text)) {
      if (match.start > cursor) spans.add(TextSpan(text: widget.text.substring(cursor, match.start)));
      spans.add(_styled(match.group(0)!, tokens));
      cursor = match.end;
    }
    if (cursor < widget.text.length) spans.add(TextSpan(text: widget.text.substring(cursor)));
    return spans;
  }

  InlineSpan _styled(String part, AppTokens tokens) {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return TextSpan(
        text: part.substring(2, part.length - 2),
        style: const TextStyle(fontWeight: FontWeight.w700),
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      return TextSpan(
        text: part.substring(1, part.length - 1),
        style: TextStyle(fontFamily: 'monospace', fontSize: 12, backgroundColor: tokens.subtle),
      );
    }
    final link = _link.firstMatch(part);
    if (link != null) {
      final label = link.group(1)!;
      final uri = Uri.tryParse(link.group(2)!);
      if (uri == null || !_safeHref.hasMatch(link.group(2)!)) return TextSpan(text: label);
      final recognizer = TapGestureRecognizer()
        ..onTap = () => launchUrl(uri, mode: LaunchMode.externalApplication);
      _recognizers.add(recognizer);
      return TextSpan(
        text: label,
        recognizer: recognizer,
        style: TextStyle(color: tokens.primary, decoration: TextDecoration.underline),
      );
    }
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      return TextSpan(
        text: part.substring(1, part.length - 1),
        style: const TextStyle(fontStyle: FontStyle.italic),
      );
    }
    return TextSpan(text: part);
  }

  @override
  Widget build(BuildContext context) => Text.rich(TextSpan(style: widget.style, children: _spans(context)));
}
