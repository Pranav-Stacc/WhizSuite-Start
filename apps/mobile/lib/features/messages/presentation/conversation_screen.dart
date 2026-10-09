import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/page_scaffold.dart';
import '../../../l10n/app_localizations.dart';
import '../application/messages_providers.dart';
import 'conversation_labels.dart';
import 'conversation_pane.dart';

/// Phone route for one client/content conversation.
class ConversationScreen extends ConsumerWidget {
  const ConversationScreen({required this.threadId, super.key});

  final String threadId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final conversation = ref.watch(conversationProvider(threadId)).value;
    final title = conversation == null ? l10n.navMessages : conversationTitle(ref, l10n, conversation);
    return PageScaffold(
      title: title,
      body: ConversationPane(threadId: threadId, showTitle: false),
    );
  }
}
