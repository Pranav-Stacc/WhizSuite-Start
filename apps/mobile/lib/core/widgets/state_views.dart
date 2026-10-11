import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../theme/app_tokens.dart';
import 'error_message.dart';
import 'fade_slide_in.dart';

/// Centered icon, title, optional body and action. Base for empty, error and forbidden states.
class StatusMessage extends StatelessWidget {
  const StatusMessage({
    required this.icon,
    required this.title,
    this.body,
    this.action,
    this.animate = true,
    this.scrollable = true,
    super.key,
  });

  final IconData icon;
  final String title;
  final String? body;
  final Widget? action;

  /// Disabled inside sliver fill regions where [FadeSlideIn] can trip layout.
  final bool animate;

  /// When false, omits the outer [SingleChildScrollView] — required inside [SliverFillRemaining].
  final bool scrollable;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final content = ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 420),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: EdgeInsets.all(tokens.lg),
            decoration: BoxDecoration(
              color: tokens.subtle,
              borderRadius: BorderRadius.circular(tokens.radius + 12),
              border: Border.all(color: tokens.border),
            ),
            child: Icon(icon, size: 28, color: tokens.secondary),
          ),
          SizedBox(height: tokens.lg),
          Text(title, style: text.titleMedium, textAlign: TextAlign.center),
          if (body != null) ...[
            SizedBox(height: tokens.sm),
            Text(body!, style: text.bodyMedium?.copyWith(color: tokens.muted), textAlign: TextAlign.center),
          ],
          if (action != null) ...[SizedBox(height: tokens.lg), action!],
        ],
      ),
    );
    final padded = Padding(
      padding: EdgeInsets.all(tokens.xl),
      child: animate ? FadeSlideIn(child: content) : content,
    );
    if (!scrollable) return Center(child: padded);
    return Center(
      child: SingleChildScrollView(
        padding: EdgeInsets.zero,
        child: padded,
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    required this.title,
    this.body,
    this.icon = Icons.inbox_outlined,
    this.action,
    this.animate = true,
    this.scrollable = true,
    super.key,
  });

  final String title;
  final String? body;
  final IconData icon;
  final Widget? action;
  final bool animate;
  final bool scrollable;

  @override
  Widget build(BuildContext context) => StatusMessage(
        icon: icon,
        title: title,
        body: body,
        action: action,
        animate: animate,
        scrollable: scrollable,
      );
}

class ErrorState extends StatelessWidget {
  const ErrorState({required this.error, this.onRetry, super.key});

  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return StatusMessage(
      icon: Icons.error_outline,
      title: l10n.errorTitle,
      body: describeError(l10n, error),
      action: onRetry == null
          ? null
          : OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: Text(l10n.retry)),
    );
  }
}

class ForbiddenState extends StatelessWidget {
  const ForbiddenState({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return StatusMessage(icon: Icons.lock_outline, title: l10n.forbiddenTitle, body: l10n.forbiddenBody);
  }
}
