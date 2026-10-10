import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/page_scaffold.dart';
import '../../../l10n/app_localizations.dart';
import '../../agent/application/agent_providers.dart';
import '../../agent/data/agent_repository.dart';
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
  String? _sessionId;
  var _ensuring = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _ensureSession());
  }

  Future<void> _ensureSession() async {
    if (_ensuring) return;
    _ensuring = true;
    try {
      final sessions = await ref.read(agentSessionsProvider.future);
      if (!mounted) return;
      if (sessions.isEmpty) {
        await _newSession();
      } else {
        setState(() => _sessionId ??= sessions.first.id);
      }
    } catch (_) {
      // WhizChatPane / history list surface provider errors.
    } finally {
      _ensuring = false;
    }
  }

  Future<void> _newSession() async {
    final session = await ref.read(agentRepositoryProvider).createSession();
    ref.invalidate(agentSessionsProvider);
    if (!mounted) return;
    setState(() => _sessionId = session.id);
    _scaffoldKey.currentState?.closeEndDrawer();
  }

  void _openSession(AgentSession session) {
    setState(() => _sessionId = session.id);
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
      body: WhizChatPane(
        sessionId: _sessionId,
        onSessionChanged: (id) => setState(() => _sessionId = id),
      ),
    );
  }
}
