import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../l10n/app_localizations.dart';
import '../theme/app_tokens.dart';

/// Preset dialog dimensions — pick the size that matches the content, not one-size-fits-all.
enum AppDialogSize {
  /// Confirmations and single-field prompts.
  compact,
  /// Typical short forms (2–4 fields).
  standard,
  /// Multi-section forms with several controls.
  large,
  /// Long lists, pickers, and composers that need most of the screen.
  fullscreen,
}

/// Whether the surface is a centered dialog or a bottom sheet.
enum AppDialogPresentation {
  dialog,
  bottomSheet,
}

/// Responsive width and inset rules shared by every app dialog.
abstract final class AppDialogLayout {
  static const defaultMaxWidth = 520.0;
  static const horizontalInset = 20.0;
  static const maxHeightFactor = 0.88;

  static const _compactMaxWidth = 400.0;
  static const _largeMaxWidth = 560.0;
  static const _fullscreenMaxWidth = 640.0;

  static const _compactHeightFactor = 0.52;
  static const _standardHeightFactor = 0.88;
  static const _largeHeightFactor = 0.92;
  static const _fullscreenHeightFactor = 0.96;

  static double maxWidthFor(AppDialogSize size) => switch (size) {
        AppDialogSize.compact => _compactMaxWidth,
        AppDialogSize.standard => defaultMaxWidth,
        AppDialogSize.large => _largeMaxWidth,
        AppDialogSize.fullscreen => _fullscreenMaxWidth,
      };

  static double heightFactorFor(AppDialogSize size) => switch (size) {
        AppDialogSize.compact => _compactHeightFactor,
        AppDialogSize.standard => _standardHeightFactor,
        AppDialogSize.large => _largeHeightFactor,
        AppDialogSize.fullscreen => _fullscreenHeightFactor,
      };

  static BoxConstraints constraintsOf(
    BuildContext context, {
    AppDialogSize size = AppDialogSize.standard,
    double? maxWidth,
    double? maxHeightFactor,
  }) {
    final screen = MediaQuery.sizeOf(context);
    final widthCap = maxWidth ?? maxWidthFor(size);
    final heightCap = maxHeightFactor ?? heightFactorFor(size);
    final width = (screen.width - horizontalInset * 2).clamp(280.0, widthCap);
    return BoxConstraints(
      minWidth: width,
      maxWidth: width,
      maxHeight: screen.height * heightCap,
    );
  }

  static double sheetHeightOf(BuildContext context, AppDialogSize size) =>
      MediaQuery.sizeOf(context).height * heightFactorFor(size);
}

/// Opens a centered dialog with consistent insets and width on every screen size.
Future<T?> showAppDialog<T>(
  BuildContext context, {
  required WidgetBuilder builder,
  bool barrierDismissible = true,
  AppDialogSize size = AppDialogSize.standard,
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

/// Modal bottom sheet for taller forms and list pickers.
Future<T?> showAppBottomSheet<T>(
  BuildContext context, {
  required WidgetBuilder builder,
  AppDialogSize size = AppDialogSize.standard,
  bool isDismissible = true,
  bool showDragHandle = true,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: showDragHandle && size != AppDialogSize.fullscreen,
    isDismissible: isDismissible,
    enableDrag: isDismissible,
    builder: (sheetContext) {
      final height = AppDialogLayout.sheetHeightOf(sheetContext, size);
      return Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(sheetContext).bottom),
        child: SizedBox(height: height, child: builder(sheetContext)),
      );
    },
  );
}

/// Routes to a centered dialog or bottom sheet based on [presentation].
Future<T?> showAppAdaptiveSurface<T>(
  BuildContext context, {
  required WidgetBuilder builder,
  AppDialogSize size = AppDialogSize.standard,
  AppDialogPresentation presentation = AppDialogPresentation.dialog,
  bool barrierDismissible = true,
}) {
  return switch (presentation) {
    AppDialogPresentation.dialog => showAppDialog<T>(
        context,
        builder: builder,
        barrierDismissible: barrierDismissible,
        size: size,
      ),
    AppDialogPresentation.bottomSheet => showAppBottomSheet<T>(
        context,
        builder: builder,
        size: size,
        isDismissible: barrierDismissible,
      ),
  };
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
    this.size = AppDialogSize.standard,
    this.scrollable = true,
    super.key,
  });

  final String title;
  final String? subtitle;
  final Widget? child;
  final List<Widget>? actions;
  final Widget? footer;
  final VoidCallback? onClose;
  final AppDialogSize size;
  final bool scrollable;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final close = onClose ?? () => Navigator.of(context).pop();

    return ConstrainedBox(
      constraints: AppDialogLayout.constraintsOf(context, size: size),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _DialogHeader(title: title, subtitle: subtitle, onClose: close),
          if (child != null) ...[
            Divider(height: 1, color: tokens.border),
            if (scrollable && size != AppDialogSize.compact)
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
  String? subtitle,
  int? maxLength,
  String? confirmLabel,
  TextInputType? keyboardType,
  List<TextInputFormatter>? inputFormatters,
}) async {
  final l10n = AppLocalizations.of(context);
  final result = await showAppDialog<bool>(
    context,
    size: AppDialogSize.compact,
    builder: (ctx) => AppDialog(
      title: title,
      subtitle: subtitle,
      size: AppDialogSize.compact,
      scrollable: false,
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
  AppDialogSize size = AppDialogSize.large,
  AppDialogPresentation presentation = AppDialogPresentation.dialog,
}) {
  return showAppAdaptiveSurface<T>(
    context,
    size: size,
    presentation: presentation,
    builder: (ctx) {
      final tokens = ctx.tokens;
      return ConstrainedBox(
        constraints: AppDialogLayout.constraintsOf(ctx, size: size),
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
