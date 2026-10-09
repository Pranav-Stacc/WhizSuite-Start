import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../core/widgets/error_message.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../application/content_controller.dart';
import '../domain/content.dart';

/// Conversation thread on a post (feedback comments on the CONTENT subject) with a composer.
class ContentComments extends ConsumerWidget {
  const ContentComments({required this.contentId, super.key});

  final String contentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final comments = ref.watch(contentCommentsProvider(contentId));
    final count = comments.value?.length;
    return SectionCard(
      title: count == null ? l10n.contentCommentsTitle : l10n.contentCommentsCount(count),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          switch (comments) {
            AsyncValue(:final value?) when value.isEmpty =>
              Text(l10n.contentCommentsEmpty, style: text.bodyMedium?.copyWith(color: tokens.muted)),
            AsyncValue(:final value?) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final (i, comment) in value.indexed) ...[
                    if (i > 0) Divider(height: tokens.xl),
                    _CommentTile(comment: comment),
                  ],
                ],
              ),
            AsyncValue(:final error?) => Row(
                children: [
                  Expanded(child: Text(describeError(l10n, error), style: text.bodyMedium?.copyWith(color: tokens.muted))),
                  TextButton(onPressed: () => ref.invalidate(contentCommentsProvider(contentId)), child: Text(l10n.retry)),
                ],
              ),
            _ => const Shimmer(child: SkeletonBox(height: 48)),
          },
          PermissionGate(
            anyOf: const [Permissions.feedbackCreate],
            child: Padding(padding: EdgeInsets.only(top: tokens.lg), child: _Composer(contentId: contentId)),
          ),
        ],
      ),
    );
  }
}

class _CommentTile extends ConsumerWidget {
  const _CommentTile({required this.comment});

  final ContentComment comment;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final me = ref.watch(sessionProvider).value?.userId;
    final members = ref.watch(memberDirectoryProvider).value;
    final name = comment.authorId == me ? l10n.contentCommentYou : (members?.nameOf(comment.authorId) ?? l10n.contentCommentTeammate);
    final time = context.formats.relative(comment.createdAt);
    return MergeSemantics(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InitialsAvatar(name: name, seed: comment.authorId, size: 32),
          SizedBox(width: tokens.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(name, style: text.labelLarge, maxLines: 1, overflow: TextOverflow.ellipsis)),
                    Text(time, style: text.labelSmall?.copyWith(color: tokens.muted)),
                  ],
                ),
                SizedBox(height: tokens.xs),
                SelectableText(comment.body, style: text.bodyMedium),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Composer extends ConsumerStatefulWidget {
  const _Composer({required this.contentId});

  final String contentId;

  @override
  ConsumerState<_Composer> createState() => _ComposerState();
}

class _ComposerState extends ConsumerState<_Composer> {
  static const _spinnerSize = 20.0;
  static const _spinnerInset = 14.0;

  final _controller = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final body = _controller.text.trim();
    if (body.isEmpty || _sending) return;
    final l10n = AppLocalizations.of(context);
    setState(() => _sending = true);
    final ok = await runAction(
      context,
      () => ref.read(contentActionsProvider).addComment(widget.contentId, body),
      success: l10n.contentCommentSent,
    );
    if (!mounted) return;
    setState(() => _sending = false);
    if (ok) _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return TextField(
      controller: _controller,
      minLines: 1,
      maxLines: 5,
      maxLength: feedbackCommentMaxLengthDefault,
      textInputAction: TextInputAction.newline,
      onChanged: (_) => setState(() {}),
      decoration: InputDecoration(
        labelText: l10n.contentCommentLabel,
        hintText: l10n.contentCommentHint,
        suffixIcon: _sending
            ? const Padding(
                padding: EdgeInsets.all(_spinnerInset),
                child: SizedBox.square(dimension: _spinnerSize, child: CircularProgressIndicator(strokeWidth: 2)),
              )
            : IconButton(
                tooltip: l10n.contentCommentSend,
                icon: const Icon(Icons.send),
                onPressed: _controller.text.trim().isEmpty ? null : _send,
              ),
      ),
    );
  }
}
