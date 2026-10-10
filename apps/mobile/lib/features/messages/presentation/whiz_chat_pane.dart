import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/state_views.dart';
import '../../../l10n/app_localizations.dart';
import '../../agent/application/agent_providers.dart';
import '../../agent/data/agent_repository.dart';
import '../../agent/domain/agent_models.dart';
import '../../agent/presentation/agent_session_pane.dart';

/// Width from which session history stays pinned beside the chat.
const whizHistoryBreakpoint = 720.0;
const whizHistorySidebarWidth = 300.0;

/// Whiz AI workspace: session history sidebar + active chat thread.
class WhizChatPane extends ConsumerWidget {
  const WhizChatPane({
    required this.sessionId,
    this.onSessionChanged,
    super.key,
  });

  final String? sessionId;
  final ValueChanged<String>? onSessionChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final wide = MediaQuery.sizeOf(context).width >= whizHistoryBreakpoint;

    Future<void> newSession() async {
      final session = await ref.read(agentRepositoryProvider).createSession();
      ref.invalidate(agentSessionsProvider);
      onSessionChanged?.call(session.id);
    }

    void openSession(AgentSession session) => onSessionChanged?.call(session.id);

    final sidebar = WhizSessionHistory(
      selectedId: sessionId,
      onSelected: openSession,
      onNewSession: newSession,
      showNewChat: wide,
    );

    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (wide) ...[
          SizedBox(width: whizHistorySidebarWidth, child: sidebar),
          VerticalDivider(width: 1, color: tokens.border),
        ],
        Expanded(
          child: sessionId == null
              ? EmptyState(
                  icon: Icons.auto_awesome_outlined,
                  title: AppLocalizations.of(context).agentEmptyTitle,
                  body: AppLocalizations.of(context).agentEmptyBody,
                )
              : AgentSessionPane(
                  key: ValueKey(sessionId),
                  sessionId: sessionId!,
                ),
        ),
      ],
    );
  }
}

/// Ensures an agent session exists and hosts [WhizChatPane].
class WhizChatHost extends ConsumerStatefulWidget {
  const WhizChatHost({this.controller, this.onSessionChanged, super.key});

  final WhizChatHostController? controller;
  final ValueChanged<String?>? onSessionChanged;

  @override
  ConsumerState<WhizChatHost> createState() => WhizChatHostState();
}

/// Imperative hooks for app bars and drawers that wrap [WhizChatHost].
class WhizChatHostController {
  WhizChatHostState? _state;

  void _attach(WhizChatHostState state) => _state = state;
  void _detach() => _state = null;

  Future<void> newSession() => _state?._newSession() ?? Future.value();
  void openSession(AgentSession session) => _state?._openSession(session);
  String? get sessionId => _state?._sessionId;
}

class WhizChatHostState extends ConsumerState<WhizChatHost> {
  String? _sessionId;
  var _ensuring = false;

  @override
  void initState() {
    super.initState();
    widget.controller?._attach(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _ensureSession());
  }

  @override
  void dispose() {
    widget.controller?._detach();
    super.dispose();
  }

  Future<void> _ensureSession() async {
    if (_ensuring) return;
    _ensuring = true;
    try {
      final session = await ref.read(agentRepositoryProvider).openSession();
      ref.invalidate(agentSessionsProvider);
      if (!mounted) return;
      _setSession(session.id);
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
    _setSession(session.id);
  }

  void _openSession(AgentSession session) => _setSession(session.id);

  void _setSession(String? id) {
    setState(() => _sessionId = id);
    widget.onSessionChanged?.call(id);
  }

  @override
  Widget build(BuildContext context) {
    return WhizChatPane(
      sessionId: _sessionId,
      onSessionChanged: _setSession,
    );
  }
}

/// Session list for the Whiz history sidebar or drawer.
class WhizSessionHistory extends ConsumerWidget {
  const WhizSessionHistory({
    required this.selectedId,
    required this.onSelected,
    required this.onNewSession,
    this.showNewChat = false,
    super.key,
  });

  final String? selectedId;
  final ValueChanged<AgentSession> onSelected;
  final VoidCallback onNewSession;
  final bool showNewChat;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final sessions = ref.watch(agentSessionsProvider);

    return Material(
      color: tokens.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(tokens.md, tokens.md, tokens.md, tokens.sm),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    l10n.agentSessions,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
                if (showNewChat)
                  IconButton(
                    tooltip: l10n.agentNewSession,
                    onPressed: onNewSession,
                    icon: const Icon(Icons.edit_outlined),
                  ),
              ],
            ),
          ),
          Expanded(
            child: switch (sessions) {
              AsyncValue(value: final items?) when items.isEmpty => EmptyState(
                  icon: Icons.history,
                  title: l10n.agentEmptyTitle,
                  body: l10n.agentEmptyBody,
                ),
              AsyncValue(value: final items?) => ListView.separated(
                  padding: EdgeInsets.fromLTRB(tokens.sm, 0, tokens.sm, tokens.md),
                  itemCount: items.length,
                  separatorBuilder: (context, index) => SizedBox(height: tokens.xs),
                  itemBuilder: (context, index) {
                    final session = items[index];
                    final selected = session.id == selectedId;
                    final title = session.title ?? l10n.agentUntitledSession;
                    return ListTile(
                      selected: selected,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(tokens.radius)),
                      leading: Icon(
                        Icons.auto_awesome_outlined,
                        color: selected ? tokens.primary : tokens.muted,
                      ),
                      title: Text(title, maxLines: 2, overflow: TextOverflow.ellipsis),
                      subtitle: Text(
                        context.formats.relative(session.updatedAt),
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted),
                      ),
                      onTap: () => onSelected(session),
                    );
                  },
                ),
              AsyncValue(error: final error?, stackTrace: _) => ErrorState(
                  error: error,
                  onRetry: () => ref.invalidate(agentSessionsProvider),
                ),
              _ => const Center(child: CircularProgressIndicator()),
            },
          ),
        ],
      ),
    );
  }
}
