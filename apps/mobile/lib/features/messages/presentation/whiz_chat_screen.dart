import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/page_scaffold.dart';
import '../../../l10n/app_localizations.dart';
import '../../agent/domain/agent_models.dart';
import 'whiz_chat_pane.dart';

/// Full-screen Whiz AI chat (narrow layouts / deep link from Messages).
class WhizChatScreen extends ConsumerStatefulWidget {
  const WhizChatScreen({super.key});

  @override
  ConsumerState<WhizChatScreen> createState() => _WhizChatScreenState();
}

class _WhizChatScreenState extends ConsumerState<WhizChatScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _host = WhizChatHostController();
  String? _sessionId;

  Future<void> _newSession() async {
    await _host.newSession();
    _scaffoldKey.currentState?.closeEndDrawer();
  }

  void _openSession(AgentSession session) {
    _host.openSession(session);
    _scaffoldKey.currentState?.closeEndDrawer();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final wide = MediaQuery.sizeOf(context).width >= whizHistoryBreakpoint;

    return PageScaffold(
      scaffoldKey: _scaffoldKey,
      title: l10n.messagesWhiz,
      actions: [
        IconButton(
          tooltip: l10n.agentNewSession,
          onPressed: _newSession,
          icon: const Icon(Icons.edit_outlined),
        ),
        if (!wide)
          IconButton(
            tooltip: l10n.agentSessions,
            onPressed: () => _scaffoldKey.currentState?.openEndDrawer(),
            icon: const Icon(Icons.history),
          ),
      ],
      endDrawer: wide
          ? null
          : Drawer(
              child: WhizSessionHistory(
                selectedId: _sessionId,
                onSelected: _openSession,
                onNewSession: _newSession,
              ),
            ),
      body: WhizChatHost(
        controller: _host,
        onSessionChanged: (id) => setState(() => _sessionId = id),
      ),
    );
  }
}
