import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/error_message.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/messages_providers.dart';
import '../domain/chat_models.dart';

enum _Tab { clients, team, group }

/// WhatsApp-style contact picker: search, tap a person/client to open a chat.
/// Returns the room id for routing, or null when cancelled.
Future<String?> showNewConversationSheet(BuildContext context, WidgetRef ref) {
  return showAppDialog<String>(
    context,
    builder: (dialogContext) => ConstrainedBox(
      constraints: AppDialogLayout.constraintsOf(dialogContext, maxWidth: _NewConversationSheet.maxWidth),
      child: const _NewConversationSheet(),
    ),
  );
}

class _NewConversationSheet extends ConsumerStatefulWidget {
  const _NewConversationSheet();

  static const maxWidth = 560.0;

  @override
  ConsumerState<_NewConversationSheet> createState() => _NewConversationSheetState();
}

class _NewConversationSheetState extends ConsumerState<_NewConversationSheet> {

  final _search = TextEditingController();
  final _groupName = TextEditingController();
  final _groupMembers = <String>{};

  _Tab _tab = _Tab.team;
  String _query = '';
  bool _busy = false;
  String? _error;
  String? _portalClientId;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final portal = await ref.read(messagesPortalClientProvider.future);
    if (!mounted) return;
    setState(() {
      _portalClientId = portal;
      _tab = portal != null ? _Tab.clients : _Tab.team;
      _loaded = true;
    });
  }

  @override
  void dispose() {
    _search.dispose();
    _groupName.dispose();
    super.dispose();
  }

  List<DirectoryEntry> _filter(Iterable<DirectoryEntry> entries) {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return entries.toList();
    return [
      for (final e in entries)
        if (e.name.toLowerCase().contains(q) || (e.detail?.toLowerCase().contains(q) ?? false)) e,
    ];
  }

  Future<void> _open(Future<ChatRoom> Function() open) async {
    if (_busy) return;
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final room = await open();
      final id = await ref.read(messagesActionsProvider).startRoom(room);
      if (mounted) Navigator.of(context).pop(id);
    } catch (error) {
      if (mounted) setState(() => _error = describeError(l10n, error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _createGroup() async {
    final l10n = AppLocalizations.of(context);
    final name = _groupName.text.trim();
    if (name.isEmpty || _groupMembers.isEmpty) {
      showToast(context, name.isEmpty ? l10n.validationRequired : l10n.messagesGroupPickMembers);
      return;
    }
    await _open(
      () => ref.read(messagesActionsProvider).createGroup(name: name, memberUserIds: _groupMembers.toList()),
    );
  }

  /// Prefer the dedicated string; fall back if hot-reload left l10n stale.
  String _portalBody(AppLocalizations l10n) {
    try {
      return l10n.messagesNewPortalBody;
    } catch (_) {
      return l10n.messagesNewPortalTitle;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final portal = _portalClientId;
    final isPortal = portal != null;

    if (!_loaded) {
      return const SizedBox(height: 200, child: Center(child: CircularProgressIndicator()));
    }

    final clients = isPortal ? null : ref.watch(clientDirectoryProvider).value;
    final staff = isPortal ? null : ref.watch(staffDirectoryProvider).value;
    final clientEntries = _filter([...?clients?.entries]..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase())));
    final staffEntries = _filter([...?staff?.entries]..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase())));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.sm, tokens.sm),
          child: Row(
            children: [
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(
                    isPortal ? l10n.messagesNewPortalTitle : l10n.messagesNewTitle,
                    style: text.titleLarge,
                  ),
                ),
              ),
              if (_busy)
                const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2)),
              IconButton(
                tooltip: MaterialLocalizations.of(context).closeButtonLabel,
                onPressed: _busy ? null : () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
        ),
              if (_error != null)
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: tokens.lg),
                  child: Text(_error!, style: text.bodySmall?.copyWith(color: Theme.of(context).colorScheme.error)),
                ),
              if (isPortal)
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.all(tokens.lg),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          _portalBody(l10n),
                          style: text.bodyMedium?.copyWith(color: tokens.muted),
                        ),
                        const Spacer(),
                        FilledButton.icon(
                          onPressed: _busy || portal.isEmpty
                              ? null
                              : () => _open(() => ref.read(messagesActionsProvider).openClientRoom(portal)),
                          icon: const Icon(Icons.chat_bubble_outline),
                          label: Text(l10n.messagesNewPortal),
                        ),
                      ],
                    ),
                  ),
                )
              else ...[
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: tokens.lg),
                  child: TextField(
                    controller: _search,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: l10n.messagesSearchContacts,
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _query.isEmpty
                          ? null
                          : IconButton(
                              tooltip: l10n.valueClear,
                              icon: const Icon(Icons.close),
                              onPressed: () {
                                _search.clear();
                                setState(() => _query = '');
                              },
                            ),
                    ),
                    onChanged: (value) => setState(() => _query = value),
                  ),
                ),
                SizedBox(height: tokens.md),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: tokens.lg),
                  child: SegmentedButton<_Tab>(
                    showSelectedIcon: false,
                    style: const ButtonStyle(visualDensity: VisualDensity.compact),
                    segments: [
                      ButtonSegment(value: _Tab.team, label: Text(l10n.messagesTabTeam)),
                      ButtonSegment(value: _Tab.clients, label: Text(l10n.messagesTabClients)),
                      ButtonSegment(value: _Tab.group, label: Text(l10n.messagesTabGroup)),
                    ],
                    selected: {_tab},
                    onSelectionChanged: _busy
                        ? null
                        : (next) {
                            if (next.isEmpty) return;
                            setState(() {
                              _tab = next.first;
                              _groupMembers.clear();
                            });
                          },
                  ),
                ),
                SizedBox(height: tokens.sm),
                Expanded(
                  child: switch (_tab) {
                    _Tab.team => _ContactList(
                        entries: staffEntries,
                        emptyLabel: l10n.messagesNoContacts,
                        onTap: (entry) => _open(() => ref.read(messagesActionsProvider).openDm(entry.id)),
                      ),
                    _Tab.clients => _ContactList(
                        entries: clientEntries,
                        emptyLabel: l10n.messagesNoContacts,
                        mark: true,
                        onTap: (entry) => _open(() => ref.read(messagesActionsProvider).openClientRoom(entry.id)),
                      ),
                    _Tab.group => _GroupComposer(
                        entries: staffEntries,
                        selected: _groupMembers,
                        nameController: _groupName,
                        emptyLabel: l10n.messagesNoContacts,
                        onToggle: (id) => setState(() {
                          if (_groupMembers.contains(id)) {
                            _groupMembers.remove(id);
                          } else {
                            _groupMembers.add(id);
                          }
                        }),
                        onCreate: _busy ? null : _createGroup,
                      ),
                  },
                ),
              ],
      ],
    );
  }
}

class _ContactList extends StatelessWidget {
  const _ContactList({
    required this.entries,
    required this.emptyLabel,
    required this.onTap,
    this.mark = false,
  });

  final List<DirectoryEntry> entries;
  final String emptyLabel;
  final ValueChanged<DirectoryEntry> onTap;
  final bool mark;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    if (entries.isEmpty) {
      return Center(child: Text(emptyLabel, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted)));
    }
    return ListView.separated(
      padding: EdgeInsets.fromLTRB(tokens.sm, tokens.sm, tokens.sm, tokens.xl),
      itemCount: entries.length,
      separatorBuilder: (_, _) => Divider(height: 1, indent: 72, color: tokens.border.withValues(alpha: 0.5)),
      itemBuilder: (context, i) {
        final entry = entries[i];
        return ListTile(
          leading: InitialsAvatar(name: entry.name, seed: entry.id, size: 44, mark: mark),
          title: Text(entry.name, maxLines: 1, overflow: TextOverflow.ellipsis),
          subtitle: entry.detail == null || entry.detail!.isEmpty
              ? null
              : Text(entry.detail!, maxLines: 1, overflow: TextOverflow.ellipsis),
          onTap: () => onTap(entry),
        );
      },
    );
  }
}

class _GroupComposer extends StatelessWidget {
  const _GroupComposer({
    required this.entries,
    required this.selected,
    required this.nameController,
    required this.emptyLabel,
    required this.onToggle,
    required this.onCreate,
  });

  final List<DirectoryEntry> entries;
  final Set<String> selected;
  final TextEditingController nameController;
  final String emptyLabel;
  final ValueChanged<String> onToggle;
  final VoidCallback? onCreate;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: EdgeInsets.symmetric(horizontal: tokens.lg),
          child: TextField(
            controller: nameController,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText: l10n.messagesGroupNameLabel,
              prefixIcon: const Icon(Icons.group_outlined),
            ),
          ),
        ),
        if (selected.isNotEmpty)
          Padding(
            padding: EdgeInsets.fromLTRB(tokens.lg, tokens.sm, tokens.lg, 0),
            child: Text(
              l10n.messagesGroupSelected(selected.length),
              style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.muted),
            ),
          ),
        Expanded(
          child: entries.isEmpty
              ? Center(child: Text(emptyLabel, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted)))
              : ListView.builder(
                  padding: EdgeInsets.fromLTRB(tokens.sm, tokens.sm, tokens.sm, tokens.sm),
                  itemCount: entries.length,
                  itemBuilder: (context, i) {
                    final entry = entries[i];
                    final on = selected.contains(entry.id);
                    return CheckboxListTile(
                      value: on,
                      onChanged: (_) => onToggle(entry.id),
                      secondary: InitialsAvatar(name: entry.name, seed: entry.id, size: 40),
                      title: Text(entry.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                      subtitle: entry.detail == null || entry.detail!.isEmpty ? null : Text(entry.detail!, maxLines: 1, overflow: TextOverflow.ellipsis),
                      controlAffinity: ListTileControlAffinity.trailing,
                    );
                  },
                ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: EdgeInsets.fromLTRB(tokens.lg, tokens.sm, tokens.lg, tokens.lg),
            child: FilledButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.check),
              label: Text(l10n.messagesCreateGroup),
            ),
          ),
        ),
      ],
    );
  }
}
