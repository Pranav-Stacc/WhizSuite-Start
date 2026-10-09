import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../l10n/app_localizations.dart';
import '../application/inbox_controller.dart';
import '../domain/conversation.dart';

/// Bottom reply box. The reply is appended optimistically; on failure the text is restored.
class ReplyComposer extends ConsumerStatefulWidget {
  const ReplyComposer({required this.conversation, super.key});

  final InboxConversation conversation;

  @override
  ConsumerState<ReplyComposer> createState() => _ReplyComposerState();
}

class _ReplyComposerState extends ConsumerState<ReplyComposer> {
  static const _maxLines = 6;
  static const _counterThreshold = 0.9;
  static const _spinnerSize = 18.0;

  final _controller = TextEditingController();
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onChanged);
  }

  @override
  void dispose() {
    _controller
      ..removeListener(_onChanged)
      ..dispose();
    super.dispose();
  }

  void _onChanged() => setState(() {});

  bool get _canSend => !_sending && _controller.text.trim().isNotEmpty;

  Future<void> _send() async {
    final body = _controller.text.trim();
    if (body.isEmpty || _sending) return;
    setState(() => _sending = true);
    _controller.clear();
    final sent = await runAction(context, () => ref.read(inboxActionsProvider).reply(widget.conversation.id, body));
    if (!mounted) return;
    if (!sent) _controller.text = body;
    setState(() => _sending = false);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final author = widget.conversation.authorHandle ?? l10n.inboxUnknownAuthor;
    return SafeArea(
      top: false,
      child: Container(
        padding: EdgeInsets.fromLTRB(tokens.lg, tokens.sm, tokens.sm, tokens.sm),
        decoration: BoxDecoration(
          color: tokens.surface,
          border: Border(top: BorderSide(color: tokens.border)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: _controller,
                enabled: !_sending,
                minLines: 1,
                maxLines: _maxLines,
                maxLength: inboxMessageMaxLength,
                keyboardType: TextInputType.multiline,
                textCapitalization: TextCapitalization.sentences,
                buildCounter: (context, {required currentLength, required isFocused, required maxLength}) =>
                    maxLength != null && currentLength >= maxLength * _counterThreshold
                        ? Text(l10n.inboxCharacterCount(currentLength, maxLength))
                        : null,
                decoration: InputDecoration(hintText: l10n.inboxReplyHint(author), isDense: true),
              ),
            ),
            SizedBox(width: tokens.sm),
            IconButton.filled(
              tooltip: l10n.inboxReplySend,
              onPressed: _canSend ? _send : null,
              icon: _sending
                  ? SizedBox.square(
                      dimension: _spinnerSize,
                      child: CircularProgressIndicator(strokeWidth: 2, color: tokens.onPrimary),
                    )
                  : const Icon(Icons.send_rounded),
            ),
          ],
        ),
      ),
    );
  }
}
