import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Full-width primary action that swaps its label for a spinner while [loading].
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({required this.label, required this.onPressed, this.loading = false, this.icon, super.key});

  static const _spinnerSize = 18.0;

  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        onPressed: loading ? null : onPressed,
        child: AnimatedSwitcher(
          duration: AppMotion.fast,
          child: loading
              ? SizedBox.square(
                  key: const ValueKey('loading'),
                  dimension: _spinnerSize,
                  child: CircularProgressIndicator(strokeWidth: 2, color: tokens.onPrimary),
                )
              : Row(
                  key: const ValueKey('label'),
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(label),
                    if (icon != null) ...[SizedBox(width: tokens.sm), Icon(icon, size: _spinnerSize)],
                  ],
                ),
        ),
      ),
    );
  }
}
