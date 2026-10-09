import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/state_views.dart';
import '../../../l10n/app_localizations.dart';
import '../application/agent_providers.dart';
import '../data/agent_repository.dart';

class AgentScreen extends ConsumerStatefulWidget {
  const AgentScreen({super.key});

  @override
  ConsumerState<AgentScreen> createState() => _AgentScreenState();
}

class _AgentScreenState extends ConsumerState<AgentScreen> {
  String? _sessionId;
  final _draft = TextEditingController();
  var _multiAgent = true;
  var _sending = false;

  @override
  void dispose() {
    _draft.dispose();
    super.dispose();
  }

  Future<void> _newSession() async {
    final session = await ref.read(agentRepositoryProvider).createSession();
    ref.invalidate(agentSessionsProvider);
    setState(() => _sessionId = session.id);
  }

  Future<void> _send() async {
    final sessionId = _sessionId;
    final text = _draft.text.trim();
    if (sessionId == null || text.isEmpty || _sending) return;
    setState(() => _sending = true);
    final l10n = AppLocalizations.of(context);
    _draft.clear();
    try {
      await ref.read(agentRepositoryProvider).sendMessage(sessionId, text, multiAgent: _multiAgent);
      ref.invalidate(agentSessionProvider(sessionId));
      ref.invalidate(agentPendingProvider);
    } catch (_) {
      if (mounted) showToast(context, l10n.agentSendFailed);
      _draft.text = text;
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _confirm(String pendingId) async {
    await ref.read(agentRepositoryProvider).confirmPending(pendingId);
    ref.invalidate(agentPendingProvider);
    if (_sessionId != null) ref.invalidate(agentSessionProvider(_sessionId!));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final sessions = ref.watch(agentSessionsProvider);
    final pending = ref.watch(agentPendingProvider);
    final tools = ref.watch(agentCapabilitiesProvider);
    final detail = _sessionId == null ? null : ref.watch(agentSessionProvider(_sessionId!));

    return PageScaffold(
      title: l10n.agentTitle,
      actions: [
        IconButton(
          tooltip: l10n.agentNewSession,
          onPressed: _newSession,
          icon: const Icon(Icons.add),
        ),
      ],
      body: Row(
        children: [
          SizedBox(
            width: 280,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: EdgeInsets.all(tokens.md),
                  child: SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(l10n.agentMultiAgent, style: Theme.of(context).textTheme.labelLarge),
                    value: _multiAgent,
                    onChanged: (value) => setState(() => _multiAgent = value),
                  ),
                ),
                Expanded(
                  child: switch (sessions) {
                    AsyncValue(value: final items?) => ListView(
                        children: [
                          for (final session in items)
                            ListTile(
                              selected: session.id == _sessionId,
                              title: Text(session.title ?? l10n.agentUntitledSession),
                              subtitle: Text(context.formats.dateTime(session.updatedAt)),
                              onTap: () => setState(() => _sessionId = session.id),
                            ),
                        ],
                      ),
                    AsyncValue(error: final error?, stackTrace: _) => ErrorState(
                        error: error,
                        onRetry: () => ref.invalidate(agentSessionsProvider),
                      ),
                    _ => const Center(child: CircularProgressIndicator()),
                  },
                ),
                if (tools case AsyncValue(value: final toolList?))
                  Padding(
                    padding: EdgeInsets.all(tokens.md),
                    child: Text(
                      l10n.agentToolsCount(toolList.length),
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted),
                    ),
                  ),
              ],
            ),
          ),
          VerticalDivider(width: 1, color: tokens.border),
          Expanded(
            child: Column(
              children: [
                if (pending case AsyncValue(value: final actions?) when actions.isNotEmpty)
                  ...actions.map(
                    (action) => MaterialBanner(
                      content: Text(action.summary),
                      leading: const Icon(Icons.warning_amber_outlined),
                      actions: [
                        TextButton(onPressed: () => _confirm(action.id), child: Text(l10n.agentConfirm)),
                      ],
                    ),
                  ),
                Expanded(
                  child: _sessionId == null
                      ? EmptyState(
                          icon: Icons.auto_awesome_outlined,
                          title: l10n.agentEmptyTitle,
                          body: l10n.agentEmptyBody,
                          action: FilledButton(onPressed: _newSession, child: Text(l10n.agentNewSession)),
                        )
                      : switch (detail) {
                          AsyncValue(value: final session?) => ListView.builder(
                              padding: EdgeInsets.all(tokens.lg),
                              itemCount: session.messages.length,
                              itemBuilder: (context, index) {
                                final message = session.messages[index];
                                final mine = message.role == 'user';
                                return Align(
                                  alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                                  child: Container(
                                    margin: EdgeInsets.only(bottom: tokens.sm),
                                    padding: EdgeInsets.all(tokens.md),
                                    constraints: const BoxConstraints(maxWidth: 520),
                                    decoration: BoxDecoration(
                                      color: mine ? tokens.primary.withValues(alpha: 0.12) : tokens.subtle,
                                      borderRadius: BorderRadius.circular(tokens.radius + 4),
                                    ),
                                    child: Text(message.content),
                                  ),
                                );
                              },
                            ),
                          AsyncValue(error: final error?, stackTrace: _) => ErrorState(
                              error: error,
                              onRetry: () => ref.invalidate(agentSessionProvider(_sessionId!)),
                            ),
                          _ => const Center(child: CircularProgressIndicator()),
                        },
                ),
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: EdgeInsets.all(tokens.md),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _draft,
                            minLines: 1,
                            maxLines: 4,
                            decoration: InputDecoration(hintText: l10n.agentComposerHint),
                            onSubmitted: (_) => _send(),
                          ),
                        ),
                        SizedBox(width: tokens.sm),
                        IconButton.filled(
                          onPressed: _sending || _sessionId == null ? null : _send,
                          icon: _sending
                              ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.send),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
