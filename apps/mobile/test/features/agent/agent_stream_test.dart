import 'package:flutter_test/flutter_test.dart';
import 'package:agency_os/features/agent/domain/agent_models.dart';
import 'package:agency_os/features/agent/presentation/agent_markdown.dart';

void main() {
  group('AgentStreamEvent.fromJson', () {
    test('maps phases, plan, tools, deltas, done and error', () {
      expect(
        (AgentStreamEvent.fromJson({'type': 'status', 'phase': 'summarizing'}) as AgentStreamStatus).phase,
        AgentStreamPhase.writing,
      );
      expect(
        (AgentStreamEvent.fromJson({'type': 'status', 'phase': 'planning', 'detail': 'Planning the next steps'})
                as AgentStreamStatus)
            .detail,
        'Planning the next steps',
      );
      final plan = AgentStreamEvent.fromJson({'type': 'plan', 'summary': 'List clients', 'toolCount': 2})
          as AgentStreamPlan;
      expect(plan.summary, 'List clients');
      expect(plan.toolCount, 2);
      expect(
        (AgentStreamEvent.fromJson({
          'type': 'status',
          'phase': 'thinking',
          'detail': 'Reasoning',
        }) as AgentStreamStatus)
            .phase,
        AgentStreamPhase.working,
      );
      final start = AgentStreamEvent.fromJson({
        'type': 'tool.start',
        'toolId': 'clients.create',
        'callId': 'call-1',
        'input': {'displayName': 'Acme'},
      }) as AgentStreamToolStart;
      expect(start.toolId, 'clients.create');
      expect(start.callId, 'call-1');
      expect(start.input, {'displayName': 'Acme'});
      final result = AgentStreamEvent.fromJson({
        'type': 'tool.result',
        'toolId': 'clients.create',
        'callId': 'call-1',
        'ok': false,
        'error': 'Denied',
        'result': {'status': 'error'},
      }) as AgentStreamToolResult;
      expect(result.ok, isFalse);
      expect(result.error, 'Denied');
      expect(result.result, {'status': 'error'});
      expect((AgentStreamEvent.fromJson({'type': 'summary.delta', 'text': 'Hi'}) as AgentStreamDelta).text, 'Hi');
      expect((AgentStreamEvent.fromJson({'type': 'done', 'response': 'Done'}) as AgentStreamDone).response, 'Done');
      expect(AgentStreamEvent.fromJson({'type': 'error', 'message': 'x'}), isA<AgentStreamError>());
      expect(AgentStreamEvent.fromJson({'type': 'unknown'}), isNull);
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
