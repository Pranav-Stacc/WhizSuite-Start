import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'skeleton.dart';
import 'state_views.dart';

/// Standard loading / error / empty / data rendering for an [AsyncValue].
/// Keeps showing previous data while refreshing so lists never flash.
class AsyncValueView<T> extends StatelessWidget {
  const AsyncValueView({
    required this.value,
    required this.data,
    this.onRetry,
    this.isEmpty,
    this.empty,
    this.loading,
    super.key,
  });

  final AsyncValue<T> value;
  final Widget Function(T data) data;
  final VoidCallback? onRetry;
  final bool Function(T data)? isEmpty;
  final Widget? empty;
  final Widget? loading;

  @override
  Widget build(BuildContext context) {
    final current = value.value;
    if (current != null || (value.hasValue && !value.isLoading)) {
      final resolved = current as T;
      if (empty != null && (isEmpty?.call(resolved) ?? false)) return empty!;
      return data(resolved);
    }
    if (value.hasError) return ErrorState(error: value.error!, onRetry: onRetry);
    return loading ?? const SkeletonList();
  }
}
