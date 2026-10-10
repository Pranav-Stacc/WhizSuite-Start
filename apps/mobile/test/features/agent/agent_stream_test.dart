import 'package:flutter_test/flutter_test.dart';
import 'package:agency_os/features/agent/domain/agent_models.dart';
import 'package:agency_os/features/agent/presentation/agent_markdown.dart';

void main() {
  group('AgentStreamEvent.fromJson', () {
    test('maps phases, deltas, done and error; ignores plan details', () {
      expect(
        (AgentStreamEvent.fromJson({'type': 'status', 'phase': 'summarizing'}) as AgentStreamStatus).phase,
        AgentStreamPhase.writing,
      );
      expect(
        (AgentStreamEvent.fromJson({'type': 'tool.start', 'toolId': 'clients.create'}) as AgentStreamStatus).phase,
        AgentStreamPhase.working,
      );
      expect((AgentStreamEvent.fromJson({'type': 'summary.delta', 'text': 'Hi'}) as AgentStreamDelta).text, 'Hi');
      expect((AgentStreamEvent.fromJson({'type': 'done', 'response': 'Done'}) as AgentStreamDone).response, 'Done');
      expect(AgentStreamEvent.fromJson({'type': 'error', 'message': 'x'}), isA<AgentStreamError>());
      expect(AgentStreamEvent.fromJson({'type': 'plan', 'summary': 's'}), isNull);
    });
  });

  group('parseAgentMarkdown', () {
    test('parses headings, ordered and bullet lists, tables and paragraphs', () {
      final blocks = parseAgentMarkdown(
        '## Summary\n'
        '1. Created **Acme**\n'
        '2. Assigned task\n'
        '\n'
        '- one\n'
        '- two\n'
        '\n'
        '| Name | Status |\n'
        '| --- | --- |\n'
        '| Acme | Active |\n'
        '\n'
        'All done.',
      );

      expect(blocks[0], isA<MdHeading>());
      final ordered = blocks[1] as MdList;
      expect(ordered.ordered, isTrue);
      expect(ordered.items, ['Created **Acme**', 'Assigned task']);
      expect((blocks[2] as MdList).ordered, isFalse);
      final table = blocks[3] as MdTable;
      expect(table.header, ['Name', 'Status']);
      expect(table.rows.single, ['Acme', 'Active']);
      expect(blocks[4], isA<MdParagraph>());
    });

    test('tolerates an unterminated code fence while streaming', () {
      final blocks = parseAgentMarkdown('Here:\n```\nconst a = 1;');
      expect(blocks.last, isA<MdCode>());
    });
  });
}
