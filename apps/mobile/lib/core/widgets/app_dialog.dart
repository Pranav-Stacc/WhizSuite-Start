import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../l10n/app_localizations.dart';
import '../theme/app_tokens.dart';

/// Responsive width and inset rules shared by every app dialog.
abstract final class AppDialogLayout {
  static const defaultMaxWidth = 520.0;
  static const horizontalInset = 20.0;
  static const maxHeightFactor = 0.88;

  static BoxConstraints constraintsOf(
    BuildContext context, {
    double maxWidth = defaultMaxWidth,
    double maxHeightFactor = AppDialogLayout.maxHeightFactor,
  }) {
    final size = MediaQuery.sizeOf(context);
    final width = (size.width - horizontalInset * 2).clamp(300.0, maxWidth);
    return BoxConstraints(
      minWidth: width,
      maxWidth: width,
      maxHeight: size.height * maxHeightFactor,
    );
  }
}

/// Opens a dialog with consistent insets and width on every screen size.
Future<T?> showAppDialog<T>(
  BuildContext context, {
  required WidgetBuilder builder,
  bool barrierDismissible = true,
}) {
  return showDialog<T>(
    context: context,
    barrierDismissible: barrierDismissible,
    builder: (dialogContext) => Dialog(
      clipBehavior: Clip.antiAlias,
      insetPadding: const EdgeInsets.symmetric(
        horizontal: AppDialogLayout.horizontalInset,
        vertical: 24,
      ),
      child: builder(dialogContext),
    ),
  );
}

/// Structured dialog shell: header, scrollable body, optional footer.
class AppDialog extends StatelessWidget {
  const AppDialog({
    required this.title,
    this.child,
    this.subtitle,
    this.actions,
    this.footer,
    this.onClose,
    this.maxWidth = AppDialogLayout.defaultMaxWidth,
    this.scrollable = true,
    super.key,
  });

  final String title;
  final String? subtitle;
  final Widget? child;
  final List<Widget>? actions;
  final Widget? footer;
  final VoidCallback? onClose;
  final double maxWidth;
  final bool scrollable;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final close = onClose ?? () => Navigator.of(context).pop();

    return ConstrainedBox(
      constraints: AppDialogLayout.constraintsOf(context, maxWidth: maxWidth),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _DialogHeader(title: title, subtitle: subtitle, onClose: close),
          if (child != null) ...[
            Divider(height: 1, color: tokens.border),
            if (scrollable)
              Flexible(
                child: SingleChildScrollView(
                  padding: EdgeInsets.all(tokens.lg),
                  child: child,
                ),
              )
            else
              Padding(padding: EdgeInsets.all(tokens.lg), child: child),
          ],
          if (footer != null || actions != null) ...[
            Divider(height: 1, color: tokens.border),
            Padding(
              padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.lg),
              child: footer ?? _DialogActions(actions!),
            ),
          ],
        ],
      ),
    );
  }
}

class _DialogHeader extends StatelessWidget {
  const _DialogHeader({required this.title, this.subtitle, required this.onClose});

  final String title;
  final String? subtitle;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: EdgeInsets.fromLTRB(tokens.lg, tokens.lg, tokens.sm, tokens.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(header: true, child: Text(title, style: text.titleLarge)),
                if (subtitle != null) ...[
                  SizedBox(height: tokens.xs),
                  Text(subtitle!, style: text.bodyMedium?.copyWith(color: tokens.muted)),
                ],
              ],
            ),
          ),
          IconButton(
            tooltip: MaterialLocalizations.of(context).closeButtonLabel,
            onPressed: onClose,
            icon: const Icon(Icons.close),
          ),
        ],
      ),
    );
  }
}

class _DialogActions extends StatelessWidget {
  const _DialogActions(this.actions);

  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    if (actions.length == 2) {
      return Row(
        children: [
          for (final (i, action) in actions.indexed) ...[
            if (i > 0) SizedBox(width: tokens.md),
            Expanded(child: action),
          ],
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, action) in actions.indexed) ...[
          if (i > 0) SizedBox(height: tokens.sm),
          action,
        ],
      ],
    );
  }
}

/// Single-line or short input dialog with cancel / confirm actions.
Future<bool> showInputDialog(
  BuildContext context, {
  required String title,
  required TextEditingController controller,
  String? hint,
  int? maxLength,
  String? confirmLabel,
  TextInputType? keyboardType,
  List<TextInputFormatter>? inputFormatters,
}) async {
  final l10n = AppLocalizations.of(context);
  final result = await showAppDialog<bool>(
    context,
    builder: (ctx) => AppDialog(
      title: title,
      actions: [
        TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(l10n.cancel)),
        FilledButton(
          onPressed: () => Navigator.of(ctx).pop(true),
          child: Text(confirmLabel ?? l10n.save),
        ),
      ],
      child: TextField(
        controller: controller,
        autofocus: true,
        maxLength: maxLength,
        keyboardType: keyboardType,
        inputFormatters: inputFormatters,
        decoration: InputDecoration(hintText: hint),
      ),
    ),
  );
  return result ?? false;
}

class PickerOption<T> {
  const PickerOption({required this.value, required this.label, this.subtitle, this.leading});

  final T value;
  final String label;
  final String? subtitle;
  final Widget? leading;
}

/// Scrollable list picker inside a structured dialog.
Future<T?> showPickerDialog<T>(
  BuildContext context, {
  required String title,
  required List<PickerOption<T>> options,
  String? subtitle,
}) {
  return showAppDialog<T>(
    context,
    builder: (ctx) {
      final tokens = ctx.tokens;
      return ConstrainedBox(
        constraints: AppDialogLayout.constraintsOf(ctx),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _DialogHeader(
              title: title,
              subtitle: subtitle,
              onClose: () => Navigator.of(ctx).pop(),
            ),
            Divider(height: 1, color: tokens.border),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                padding: EdgeInsets.symmetric(vertical: tokens.sm),
                itemCount: options.length,
                separatorBuilder: (_, _) => Divider(
                  height: 1,
                  indent: tokens.lg,
                  endIndent: tokens.lg,
                  color: tokens.border,
                ),
                itemBuilder: (_, i) {
                  final option = options[i];
                  return ListTile(
                    contentPadding: EdgeInsets.symmetric(horizontal: tokens.lg),
                    leading: option.leading,
                    title: Text(option.label),
                    subtitle: option.subtitle == null ? null : Text(option.subtitle!),
                    onTap: () => Navigator.of(ctx).pop(option.value),
                  );
                },
              ),
            ),
          ],
        ),
      );
    },
  );
}
