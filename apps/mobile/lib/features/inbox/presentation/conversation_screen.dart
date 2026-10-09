import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/page_scaffold.dart';
import '../../../l10n/app_localizations.dart';
import '../application/inbox_controller.dart';
import 'conversation_view.dart';

/// Phone route for one thread.
class ConversationScreen extends ConsumerWidget {
  const ConversationScreen({required this.conversationId, super.key});

  final String conversationId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final author = ref.watch(conversationProvider(conversationId).select((value) => value.value?.authorHandle));
    return PageScaffold(
      title: author ?? l10n.inboxTitle,
      body: ConversationView(conversationId: conversationId),
    );
  }
}
